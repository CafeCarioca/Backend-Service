const axios = require('axios');
const { changeOrderStatusByExternalReference } = require('./orderController');
const { sendOrderConfirmation } = require('./emailsController');
const orderService = require('../Helpers/orderHelper');
const { sendOrderConfirmationEmail } = require('../Helpers/emailHelper');

exports.createPreference = async (req, res) => {
  try {
    const body = req.body;
    console.log('Parsed body:', body);

    const externalReference = body.external_reference;
    const items = body.items.map(item => ({
      title: item.title,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      currency_id: 'UYU'
      
    }));

    console.log('Items:', items);

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

    console.log('PreferenceBody:', preferenceBody);

    const response = await axios.post('https://api.mercadopago.com/checkout/preferences', preferenceBody, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Preference created:', response.data);

    res.status(200).json({ id: response.data.id });
  } catch (error) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.webhook = async (req, res) => {
    console.log('Webhook received:', req.body); // Para verificar el cuerpo completo

    let paymentId = null;

    // Verificamos si el cuerpo tiene un `data` con `id`, como en el tercer caso
    if (!req.body.data || !req.body.data.id) {
      console.error('Payment ID not found in the webhook body');
      return res.status(400).send('Invalid webhook structure');
    }

    paymentId = req.body.data.id; // Asegúrate de que esto esté correcto

    console.log('Payment ID:', paymentId);

    if (paymentId) {
      try {
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        });

        if (response.status === 200) {
          const data = response.data;
          console.log('Payment data:', data);
          const { status, status_detail, external_reference } = data;
          if (status === 'approved' && status_detail === 'accredited') {
            console.log('Payment approved and accredited');
            try {
              const { orderId, status } = await orderService.changeOrderStatusByExternalReference(
                external_reference,
                'Pagado' // Nuevo estado
              );

              console.log(`Order status changed successfully for Order ID: ${orderId}`);
            
              // Enviar correo de confirmación
              const orderData = await orderService.getOrderById(orderId);

            // Enviar el correo de confirmación
            const emailResponse = await sendOrderConfirmationEmail(orderData);
            console.log('Order confirmation email sent successfully:', emailResponse);
          } catch (error) {
            console.error('Error processing order or sending email:', error.message);
          }
        } else {
          console.log('Payment not approved or not accredited.', { status, status_detail });
        }
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Error fetching payment from MercadoPago:', error.message);
      res.sendStatus(500);
    }
  } else {
    console.error('Payment ID is null');
    res.status(400).send('Payment ID is null');
  }
};