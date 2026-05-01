const axios = require('axios');
const logger = require('../utils/logger');
const { changeOrderStatusByExternalReference } = require('./orderController');
const { sendOrderConfirmation } = require('./emailsController');
const orderService = require('../Helpers/orderHelper');
const { sendOrderConfirmationEmail } = require('../Helpers/emailHelper');

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
    const body = req.body;
    logger.log('Parsed body:', body);

    const externalReference = body.external_reference;
    const items = body.items.map(item => ({
      title: item.title,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      currency_id: 'UYU'
      
    }));

    logger.log('Items:', items);

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

    // Verificamos si el cuerpo tiene un `data` con `id`, como en el tercer caso
    if (!req.body.data || !req.body.data.id) {
      logger.error('Payment ID not found in the webhook body');
      return res.status(400).send('Invalid webhook structure');
    }

    paymentId = req.body.data.id;
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