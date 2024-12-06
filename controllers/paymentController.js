const axios = require('axios');
const { changeOrderStatusByExternalReference } = require('./orderController');
const { sendOrderConfirmation } = require('./emailsController');

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
      success: `${process.env.BASEURL}/#/thank-you`,
      failure: `${process.env.BASEURL}/#/pay-failure`,
      pending: `${process.env.BASEURL}/#/pay-failure`
      },
      auto_return: 'approved',
      notification_url: `https://de1d-2800-a4-158a-5900-9df4-4d87-2048-a063.ngrok-free.app/payments/webhook`,
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
            console.log('Changing order status for external reference:', external_reference);
            const response = await axios.put(`http://localhost:3000/orders/change_order_status/${external_reference}`, {}, {
              headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.STATIC_JWT}`
              }
            });
          
            if (response.status === 200 && response.data.orderId) {
              const orderID = response.data.orderId;
          
              // Realizar la segunda solicitud
                const response2 = await axios.post(`http://localhost:3000/emails/sendorderemail`, {
                orderId: orderID
                }, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.STATIC_JWT}`
                }
                });
          
              if (response2.status === 200) {
                console.log('Email sent successfully');
              } else {
                console.error('Failed to send email:', response2.data);
              }
            } else {
              console.error('Failed to change order status:', response.data);
            }
          } catch (error) {
            console.error('Error in payment confirmation process:', error.message);
          }
        } else {
          console.log('Payment not approved or not accredited. Status:', status, 'Status Detail:', status_detail);
        }
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.sendStatus(500);
    }
  } else {
    console.error('Payment ID is null');
    res.status(400).send('Payment ID is null');
  }
}
