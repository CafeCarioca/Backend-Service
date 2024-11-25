const pool = require('../models/db');

// Función para encontrar una orden por preference_id y cambiar su estado a "Pagado"
exports.changeOrderStatusByPreferenceId = async (req, res) => {
  const { preferenceId } = req.params; // Obtener el preferenceId de los parámetros de la ruta

  const connection = await pool.getConnection();

  try {
    // Buscar la orden por preference_id
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE preference_id = ?',
      [preferenceId]
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
  const { userDetails, products, preferenceId } = order;

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

    const { street, doorNumber, apartment, department, postalCode, location } = userDetails.address;
    const city = userDetails.address.city || department;

    const [existingAddresses] = await connection.execute(
      'SELECT id FROM addresses WHERE user_id = ? AND street = ? AND door_number = ? AND apartment = ? AND department = ? AND city = ? AND state = ? AND postal_code = ? AND country = ?',
      [userId, street, doorNumber, apartment, department, city, department, postalCode, userDetails.country]
    );

    let addressId = existingAddresses.length ? existingAddresses[0].id : null;

    if (!addressId) {
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
    }

    const total = products.reduce((sum, product) => sum + product.price * product.quantity, 0);

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, address_id, status, total, preference_Id) VALUES (?, ?, ?, ?, ?)',
      [userId, addressId, 'No Pagado', total, preferenceId]
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

    connection.release();

    res.status(200).json({ message: 'Order created successfully', orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    connection.release();
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

