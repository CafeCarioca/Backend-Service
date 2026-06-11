const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../models/db');
const { changeOrderStatusByExternalReference } = require('./orderController');
const { sendOrderConfirmation } = require('./emailsController');
const orderService = require('../Helpers/orderHelper');
const { sendOrderConfirmationEmail } = require('../Helpers/emailHelper');
const { round2 } = require('../Helpers/pricingHelper');

// ===== Verificación de firma del webhook de MercadoPago =====
// MP firma cada notificación con el secret del webhook (se obtiene en
// Tus integraciones > Webhooks). Sin esta verificación, cualquiera puede
// POSTear al webhook y marcar órdenes como pagadas sin pagar.
// Header x-signature: "ts=<timestamp>,v1=<hmac>"
// Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
const verifyWebhookSignature = (req, dataId) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn(
      '⚠️ MERCADOPAGO_WEBHOOK_SECRET no configurado: el webhook NO valida firma. Configurarlo en el .env (Mercado Pago > Tus integraciones > Webhooks).'
    );
    return true; // no romper hasta que se configure el secret
  }

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((part) => part.split('=').map((s) => s.trim()))
  );
  if (!parts.ts || !parts.v1) return false;

  // El segmento request-id se omite si MP no envió el header x-request-id
  // (interpolar "undefined" haría fallar la verificación de firmas legítimas).
  let manifest = `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
};

// Cache para evitar procesar webhooks duplicados
// Estructura: { paymentId: timestamp }
const processedWebhooks = new Map();
const WEBHOOK_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Limpiar cache periódicamente (cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [paymentId, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_CACHE_DURATION) {
      processedWebhooks.delete(paymentId);
    }
  }
}, 5 * 60 * 1000);

exports.createPreference = async (req, res) => {
  try {
    const externalReference = req.body.external_reference;
    if (!externalReference) {
      return res.status(400).json({ error: 'external_reference es requerido' });
    }

    // ===== Los items se construyen desde la ORDEN EN LA BD =====
    // Antes se usaban los items que mandaba el navegador: un cliente
    // malicioso podía pagar cualquier monto. Ahora la fuente de verdad
    // es la orden creada por create_order (precios recalculados en BD).
    //
    // El front dispara create_order y create_preference casi en paralelo,
    // así que la orden puede no estar commiteada todavía. Reintentamos con
    // un backoff corto antes de devolver 404 (evita el 404 intermitente que
    // impediría pagar).
    let order = null;
    for (let attempt = 0; attempt < 6 && !order; attempt++) {
      const [orders] = await db.query(
        'SELECT id, total, shipping_cost FROM orders WHERE external_reference = ? ORDER BY id DESC LIMIT 1',
        [externalReference]
      );
      if (orders.length) {
        order = orders[0];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (!order) {
      logger.error(`Orden no encontrada para external_reference ${externalReference} tras reintentos`);
      return res.status(404).json({ error: 'Orden no encontrada para esa referencia' });
    }

    const [orderItems] = await db.query(
      `SELECT oi.quantity, oi.price, oi.grams, oi.grind, p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const items = orderItems.map((item) => ({
      title: item.grams ? `${item.name} (${item.grams}g)` : item.name,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      currency_id: 'UYU',
    }));

    // Descuentos (BOGO + cupón) como línea negativa: diferencia exacta
    // entre la suma de items + envío y el total real de la orden.
    const itemsSum = round2(
      orderItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
    );
    const shippingCost = Number(order.shipping_cost) || 0;
    const discountTotal = round2(itemsSum + shippingCost - Number(order.total));
    if (discountTotal > 0) {
      items.push({
        title: 'Descuentos y promociones',
        quantity: 1,
        unit_price: -discountTotal,
        currency_id: 'UYU',
      });
    }
    if (shippingCost > 0) {
      items.push({
        title: 'Costo de envío',
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'UYU',
      });
    }

    logger.log('Items (desde la BD):', items);

    const preferenceBody = {
      items: items,
      external_reference: externalReference,
      back_urls: {
      success: `https://cafecarioca.com.uy/#/thank-you`,
      failure: `https://cafecarioca.com.uy/#/pay-failure`,
      pending: `https://cafecarioca.com.uy/#/pay-failure`
      },
      auto_return: 'approved',
      notification_url: `https://cafecarioca.com.uy/api/payments/webhook`,
      payment_methods: {
        installments: 12
      }
    };

    logger.log('PreferenceBody:', preferenceBody);

    const response = await axios.post('https://api.mercadopago.com/checkout/preferences', preferenceBody, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    logger.log('Preference created:', response.data);

    res.status(200).json({ id: response.data.id });
  } catch (error) {
    logger.error('Error creating preference:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.webhook = async (req, res) => {
    logger.log('Webhook received:', req.body);

    let paymentId = null;

    // MP puede mandar el id en el body (data.id) o como query param (?data.id=)
    paymentId = (req.body.data && req.body.data.id) || req.query['data.id'];
    if (!paymentId) {
      logger.error('Payment ID not found in the webhook');
      return res.status(400).send('Invalid webhook structure');
    }

    // Verificación de firma: rechazar notificaciones que no vengan de MP
    if (!verifyWebhookSignature(req, paymentId)) {
      logger.error(`🚫 Webhook con firma inválida rechazado (Payment ID: ${paymentId})`);
      return res.status(401).send('Invalid signature');
    }

    logger.log('Payment ID:', paymentId);

    // ✅ DEDUPLICACIÓN: Verificar si ya procesamos este webhook
    if (processedWebhooks.has(paymentId)) {
      logger.log(`⏭️ Webhook duplicado ignorado para Payment ID: ${paymentId}`);
      return res.sendStatus(200); // Responder OK inmediatamente
    }

    // Marcar como procesado ANTES de hacer cualquier operación
    processedWebhooks.set(paymentId, Date.now());

    if (paymentId) {
      try {
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        });

        if (response.status === 200) {
          const data = response.data;
          logger.log('Payment data:', data);
          const { status, status_detail, external_reference } = data;
          if (status === 'approved' && status_detail === 'accredited') {
            logger.log('Payment approved and accredited');

            // Idempotencia: si la orden ya está pagada (reintento de MP o
            // webhook duplicado tras reinicio del server), no reprocesar
            // ni mandar el email de confirmación de nuevo.
            const [existingOrders] = await db.query(
              'SELECT id, status FROM orders WHERE external_reference = ? ORDER BY id DESC LIMIT 1',
              [external_reference]
            );
            if (existingOrders.length && existingOrders[0].status !== 'No Pagado') {
              logger.log(`⏭️ Orden ${existingOrders[0].id} ya procesada (estado: ${existingOrders[0].status}), webhook ignorado`);
              return res.sendStatus(200);
            }

            try {
              const { orderId, status } = await orderService.changeOrderStatusByExternalReference(
                external_reference,
                'Pagado' // Nuevo estado
              );

              logger.log(`Order status changed successfully for Order ID: ${orderId}`);
            
              // Enviar correo de confirmación
              const orderData = await orderService.getOrderById(orderId);

            // Enviar el correo de confirmación
            const emailResponse = await sendOrderConfirmationEmail(orderData);
            logger.log('Order confirmation email sent successfully:', emailResponse);
          } catch (error) {
            logger.error('Error processing order or sending email:', error.message);
          }
        } else {
          logger.log('Payment not approved or not accredited.', { status, status_detail });
        }
      }
      res.sendStatus(200);
    } catch (error) {
      logger.error('Error fetching payment from MercadoPago:', error.message);
      // Eliminar del cache si hubo error para permitir reintento
      processedWebhooks.delete(paymentId);
      res.sendStatus(500);
    }
  } else {
    logger.error('Payment ID is null');
    res.status(400).send('Payment ID is null');
  }
};