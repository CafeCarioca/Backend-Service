const pool = require('../models/db');



exports.deleteorder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Primero, eliminar los registros relacionados en order_items
    await connection.execute(
      'DELETE FROM order_items WHERE order_id = ?',
      [req.params.orderId]
    );

    // Luego, eliminar el pedido en la tabla orders
    const [result] = await connection.execute(
      'DELETE FROM orders WHERE id = ?',
      [req.params.orderId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found or already deleted' });
    }

    await connection.commit();
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting order:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
}


exports.changeorderstatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [req.body.status, req.body.orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to change order status' });
    }

    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error changing order status:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
}

// Función para obtener las órdenes pagadas
exports.getPaidOrders = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Buscar todas las órdenes pagadas y el nombre del usuario
    const [orders] = await connection.execute(
      `SELECT orders.*, users.first_name, users.last_name 
       FROM orders 
       JOIN users ON orders.user_id = users.id 
       WHERE orders.status IN (?, ?)`,
      ['Pagado', 'En Camino']
    );

    // Devolver respuesta exitosa
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error getting paid orders:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};


// Función para encontrar una orden por preference_id y cambiar su estado a "Pagado"
exports.changeOrderStatusByExternalReference = async (req, res) => {
  const { external_reference } = req.params; // Obtener el preferenceId de los parámetros de la ruta

  const connection = await pool.getConnection();

  try {
    // Buscar la orden por preference_id
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE external_reference = ?',
      [external_reference]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderId = orders[0].id; // Obtener el ID de la orden encontrada

    // Cambiar el estado de la orden a "Pagado"
    const [result] = await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['Pagado', orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to change order status' });
    }

    // Si la orden tiene un cupón aplicado, incrementar su uso
    // Esto es opcional y no debe afectar el flujo principal de pago
    try {
      const [orderCoupons] = await connection.execute(
        'SELECT coupon_id FROM order_coupons WHERE order_id = ?',
        [orderId]
      );

      if (orderCoupons.length > 0) {
        const couponId = orderCoupons[0].coupon_id;
        await connection.execute(
          'UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?',
          [couponId]
        );
        console.log(`✅ Cupón ${couponId} incrementado. Orden ${orderId} pagada.`);
      }
    } catch (couponError) {
      // Si falla el incremento del cupón, solo logueamos pero no afectamos el pago
      console.warn(`⚠️ Error al incrementar cupón para orden ${orderId}:`, couponError.message);
    }

    // Devolver respuesta exitosa
    res.status(200).json({ message: 'Order status updated to "Pagado"', orderId });
  } catch (error) {
    console.error('Error changing order status:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};

exports.createOrder = async (req, res) => {
  const connection = await pool.getConnection();

  const { order } = req.body;
  const { userDetails, products, external_reference, coupon, shippingCost } = order;

  // Usamos userDetails.deliveryType para obtener el tipo de envío
  const shippingType = userDetails.deliveryType;

  // Usar el shippingCost que viene del frontend
  const finalShippingCost = shippingCost || 0;

  try {
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [userDetails.email]
    );

    let userId = users.length ? users[0].id : null;

    if (!userId) {
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, first_name, last_name, document_type, document_number, phone, terms_accepted, factura_con_rut, razon_social, rut, recipient, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userDetails.email.split('@')[0],
          userDetails.email,
          userDetails.firstName,
          userDetails.lastName,
          userDetails.documentType,
          userDetails.documentNumber,
          userDetails.phone,
          userDetails.termsAccepted,
          userDetails.facturaConRUT,
          userDetails.razonSocial,
          userDetails.rut,
          userDetails.recipient,
          userDetails.remarks
        ]
      );
      userId = result.insertId;
    }

    let addressId = null;
    if (shippingType === 'delivery') {
      // Solo buscamos o insertamos dirección si el tipo de envío es delivery
      const { street, doorNumber, apartment, department, postalCode, location } = userDetails.address;
      const city = userDetails.address.city || department;

      const [existingAddresses] = await connection.execute(
        'SELECT id FROM addresses WHERE user_id = ? AND street = ? AND door_number = ? AND apartment = ? AND department = ? AND city = ? AND state = ? AND postal_code = ? AND country = ?',
        [userId, street, doorNumber, apartment, department, city, department, postalCode, userDetails.country]
      );

      if (!existingAddresses.length) {
        const [result] = await connection.execute(
          'INSERT INTO addresses (user_id, street, door_number, apartment, department, city, state, postal_code, country, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            street,
            doorNumber,
            apartment,
            department,
            city,
            department,
            postalCode,
            userDetails.country,
            location.lat,
            location.lng
          ]
        );
        addressId = result.insertId;
      } else {
        addressId = existingAddresses[0].id;
      }
    }

    let total = products.reduce((sum, product) => sum + product.price * product.quantity, 0);
    console.log(`🛒 Subtotal productos: $${total}`);
    
    // Si hay un cupón, restar el descuento del total
    if (coupon && coupon.discountAmount) {
      total = Math.max(0, total - coupon.discountAmount);
      console.log(`💰 Total con cupón: $${total} (descuento: $${coupon.discountAmount})`);
    }

    // Agregar el costo de envío al total
    const subtotalBeforeShipping = total;
    total += finalShippingCost;
    console.log(`📦 Total final: $${total} (subtotal: $${subtotalBeforeShipping}, envío: $${finalShippingCost})`);
    console.log(`📋 Tipo de envío: ${shippingType}`);

    // Calcular descuentos de productos
    let productDiscountTotal = 0;
    products.forEach(product => {
      if (product.originalPrice && product.price) {
        const itemDiscount = (parseFloat(product.originalPrice) - parseFloat(product.price)) * product.quantity;
        productDiscountTotal += itemDiscount;
      }
    });

    // Insertar la orden con el tipo de envío ye address_id (NULL si es takeaway)
    const couponCode = coupon ? coupon.code : null;
    const couponDiscount = coupon && coupon.discountAmount ? coupon.discountAmount : 0;

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, address_id, status, total, external_reference, shipping_type, shipping_cost, coupon_code, coupon_discount, product_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, addressId, 'No Pagado', total, external_reference, shippingType, finalShippingCost, couponCode, couponDiscount, productDiscountTotal]
    );

    const orderId = orderResult.insertId;

    for (const product of products) {
      const [existingProduct] = await connection.execute(
        'SELECT id FROM products WHERE name = ?',
        [product.blendName]
      );

      if (existingProduct.length === 0) {
        throw new Error(`Product ${product.blendName} does not exist in the database.`);
      }

      const productId = existingProduct[0].id;

      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price, grams, grind) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, productId, product.quantity, product.price, product.grams, product.grind]
      );
    }

    // Si se aplicó un cupón, guardarlo en order_coupons (opcional)
    if (coupon && coupon.id && coupon.discountAmount) {
      try {
        await connection.execute(
          'INSERT INTO order_coupons (order_id, coupon_id, discount_applied) VALUES (?, ?, ?)',
          [orderId, coupon.id, coupon.discountAmount]
        );
        console.log(`✅ Cupón ${coupon.id} registrado en orden ${orderId}`);
      } catch (couponError) {
        // Si falla guardar el cupón, solo logueamos pero no afectamos la creación de la orden
        console.warn(`⚠️ Error al registrar cupón en orden ${orderId}:`, couponError.message);
      }
    }

    connection.release();

    res.status(200).json({ message: 'Order created successfully', orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    connection.release();
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};


exports.getOrder = async (req, res) => {
  const connection = await pool.getConnection();
  const { orderId } = req.params;

  try {
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    const [user] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [order.user_id]
    );

    const [address] = await connection.execute(
      'SELECT * FROM addresses WHERE id = ?',
      [order.address_id]
    );

    const [items] = await connection.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    const products = [];

    for (const item of items) {
      const [product] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [item.product_id]
      );

      products.push({
        ...product[0],
        quantity: item.quantity,
        price: item.price,
        grams: item.grams,
        grind: item.grind
      });
    }

    connection.release();

    res.status(200).json({
      order: {
        ...order,
        user: user[0],
        address: address[0],
        products
      }
    });
  } catch (error) {
    console.error('Error getting order:', error);
    connection.release();
    res.status(500).json({ message: 'Failed to get order', error: error.message });
  }
}

exports.checkOrderStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    if (order.status === 'Pagado') {
      return res.status(200).json({ message: 'Order is paid' });
    }

    res.status(200).json({ message: 'Order is not paid' });
  } catch (error) {
    console.error('Error checking order status:', error);
    connection.release();
    res.status(500).json({ message: 'Failed to check order status', error: error.message });
  }
}

exports.getOrdersByDateRange = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { startDate, endDate } = req.body;

    // Asegúrate de que las fechas sean válidas
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Ajusta la fecha de finalización para incluir todo el día
    const adjustedEndDate = `${endDate} 23:59:59`;

    const [orders] = await connection.execute(
      `SELECT orders.*, users.first_name, users.last_name 
       FROM orders 
       JOIN users ON orders.user_id = users.id 
       WHERE orders.order_date BETWEEN ? AND ?`,
      [startDate, adjustedEndDate]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'No orders found in the specified date range' });
    }

    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error getting orders by date range:', error);
    res.status(500).json({ message: 'Failed to get orders', error: error.message });
  } finally {
    connection.release();
  }
};

exports.getLastOrders = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [orders] = await connection.execute(
      `SELECT orders.*, users.first_name, users.last_name 
       FROM orders 
       JOIN users ON orders.user_id = users.id 
       ORDER BY orders.order_date DESC 
       LIMIT 5`
    );

  
    if (orders.length === 0) {
      return res.status(404).json({ message: 'No orders found' });
    }
    // Elimina el campo external_reference de cada orden antes de enviar la respuesta
    orders.forEach(order => {
      delete order.external_reference;
    });

    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error getting last orders:', error);
    res.status(500).json({ message: 'Failed to get last orders', error: error.message });
  } finally {
    connection.release();
  }
};

