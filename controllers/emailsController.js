const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Paleta de colores
const carioca_darkgreen = "#273617";
const carioca_black = "#27231f";
const carioca_cremitwhite = "#f0f0f0";

// Configuración del transporter para Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587, // O 465 para SSL
  secure: false,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

// Función para enviar la confirmación de pedido
exports.sendOrderConfirmation = async (req, res) => {
    const { orderId } = req.body;
    const BASE_URL = process.env.BASE_URL;
  
    try {
      // Obtener detalles de la orden
      const response = await axios.get(`http://localhost:3000/orders/get_order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STATIC_JWT}`,
          'Content-Type': 'application/json'
        }
      });
      const orderData = response.data.order;
  
      // Construir el asunto
      const subject = `Carioca - Confirmación de Pedido - ${orderData.id}`;
  
      // URL del logo de la empresa
      const logoUrl = 'https://res.cloudinary.com/du1lvkscc/image/upload/f_auto,q_auto/v1/Carioca/xjobfbjltevwguqhlmkf';
  
      // Construir el cuerpo del correo con estilos y logo
      let body = `
        <div style="font-family: 'Roboto', sans-serif; color: ${carioca_black}; background-color: ${carioca_cremitwhite}; padding: 20px; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoUrl}" alt="Logo de la Empresa" style="max-width: 120px;"/>
            </div>
            <h2 style="margin-bottom: 10px;">¡ Hola ${orderData.user.first_name} !,</h2>
            <p>Gracias por tu compra en nuestra tienda. Aquí están los detalles de tu pedido:</p>
  
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Detalles del Pedido</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li><strong>Pedido ID:</strong> ${orderData.id}</li>
                <li><strong>Fecha del Pedido:</strong> ${new Date(orderData.order_date).toLocaleDateString()}</li>
                <li><strong>Total:</strong> $${orderData.total}</li>
                <li><strong>Estado:</strong> ${orderData.status}</li>
                <li><strong>Tipo de Envío:</strong> ${orderData.shipping_type === 'takeaway' ? 'Retiro en tienda' : 'Envío a domicilio'}</li>
            </ul>
  
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Productos</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${orderData.products.map(product => `
                    <li style="margin-bottom: 15px;">
                        <strong>${product.name}</strong>
                        <br>(Cantidad: ${product.quantity}, Precio: $${product.price}, Gramos: ${product.grams}, Molido: ${product.grind})
                    </li>
                `).join('')}
            </ul>
      `;
  
      // Solo agregar la dirección si el tipo de envío es "delivery"
      if (orderData.shipping_type === 'delivery') {
        body += `
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Dirección de Envío</h3>
            <p style="margin: 0;">${orderData.address.street} ${orderData.address.door_number}, ${orderData.address.apartment || ''}<br>
            ${orderData.address.city}, ${orderData.address.state}<br>
            ${orderData.address.country}, CP: ${orderData.address.postal_code}</p>
        `;
      } else {
        body += `
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Retiro en Tienda</h3>
            <p style="margin: 0;">Tu pedido está listo para ser recogido en nuestra tienda.</p>
        `;
      }
  
      body += `
            <p style="margin-top: 30px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p style="margin-top: 20px;">Gracias por elegirnos.</p>
            <p style="margin: 0;">Atentamente,<br>El equipo de Carioca</p>
        </div>
      `;
  
      const mailOptions = {
        from: process.env.ZOHO_EMAIL,
        to: orderData.user.email,
        subject: subject,
        html: body,
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending email: ', error);
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
  };
  
  exports.sendOrderStatusUpdateontheway = async (req, res) => {
    const { orderId, newStatus } = req.body;
    const BASE_URL = process.env.BASE_URL;
  
    try {
      // Obtener detalles de la orden
      const response = await axios.get(`http://localhost:3000/orders/get_order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STATIC_JWT}`,
          'Content-Type': 'application/json'
        }
      });
      const orderData = response.data.order;
  
      // Construir el asunto
      const subject = `Carioca - Tu Pedido Está en Camino - Pedido #${orderData.id}`;
  
      // URL del logo de la empresa
      const logoUrl = 'https://res.cloudinary.com/du1lvkscc/image/upload/f_auto,q_auto/v1/Carioca/xjobfbjltevwguqhlmkf';
  
      // Construir el cuerpo del correo con estilos y logo
      let body = `
        <div style="font-family: 'Roboto', sans-serif; color: ${carioca_black}; background-color: ${carioca_cremitwhite}; padding: 20px; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoUrl}" alt="Logo de la Empresa" style="max-width: 120px;"/>
            </div>
            <h2 style="margin-bottom: 10px;">¡ Hola ${orderData.user.first_name} !,</h2>
            <p>El estado de tu pedido ha sido actualizado:</p>
  
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Detalles del Pedido</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li><strong>Pedido ID:</strong> ${orderData.id}</li>
                <li><strong>Fecha del Pedido:</strong> ${new Date(orderData.order_date).toLocaleDateString()}</li>
                <li><strong>Total:</strong> $${orderData.total}</li>
                <li><strong>Estado:</strong> ${newStatus}</li>
                <li><strong>Tipo de Envío:</strong> ${orderData.shipping_type === 'takeaway' ? 'Retiro en tienda' : 'Envío a domicilio'}</li>
            </ul>
  
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Productos</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${orderData.products.map(product => `
                    <li style="margin-bottom: 15px;">
                        <strong>${product.name}</strong>
                        <br>(Cantidad: ${product.quantity}, Precio: $${product.price}, Gramos: ${product.grams}, Molido: ${product.grind})
                    </li>
                `).join('')}
            </ul>
      `;

      // Solo agregar la dirección si el tipo de envío es "delivery"
      if (orderData.shipping_type === 'delivery') {
        body += `
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Dirección de Envío</h3>
            <p style="margin: 0;">${orderData.address.street} ${orderData.address.door_number}, ${orderData.address.apartment || ''}<br>
            ${orderData.address.city}, ${orderData.address.state}<br>
            ${orderData.address.country}, CP: ${orderData.address.postal_code}</p>
        `;
      } else {
        body += `
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid ${carioca_black}; padding-bottom: 5px;">Retiro en Tienda</h3>
            <p style="margin: 0;">Tu pedido está listo para ser recogido en nuestra tienda.</p>
        `;
      }

      body += `
            <p style="margin-top: 30px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p style="margin-top: 20px;">Gracias por elegirnos.</p>
            <p style="margin: 0;">Atentamente,<br>El equipo de Carioca</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.ZOHO_EMAIL,
        to: orderData.user.email,
        subject: subject,
        html: body,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    }
    catch (error) {
      console.error('Error sending email: ', error);
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
  }
