const axios = require('axios');

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
      notification_url: `${process.env.BASEURL}/payments/webhook`,
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

  if (!req.body.data || !req.body.data.id) {
    console.error('Payment ID not found in the webhook body');
    return res.status(400).send('Invalid webhook structure');
  }

  const payment = req.body.data.id; // Asegúrate de que esto esté correcto
  console.log('Payment ID:', payment);

  try {
    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${payment}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (response.status === 200) {
      const data = response.data;
      console.log('Payment data:', data);
      if (status === 'approved' && status_detail === 'accredited') {
        console.log('Payment approved and accredited');
        // Aquí puedes manejar el caso donde el pago se aprueba
      } else {
        console.log('Payment not approved or not accredited. Status:', status, 'Status Detail:', status_detail);
        // Aquí puedes manejar el caso donde el pago no se aprueba
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.sendStatus(500);
  }
}
