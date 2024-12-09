const pool = require('../models/db');

exports.getOrderById = async (orderId) => {
  const connection = await pool.getConnection();

  try {
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found');
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

    return {
      ...order,
      user: user[0],
      address: address[0],
      products
    };
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

exports.changeOrderStatusByExternalReference = async (externalReference, newStatus) => {
    const connection = await pool.getConnection();

  try {
    // Buscar la orden por external_reference
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE external_reference = ?',
      [externalReference]
    );

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    const orderId = orders[0].id;

    // Actualizar el estado de la orden
    const [result] = await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [newStatus, orderId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Failed to change order status');
    }

    return { orderId, status: newStatus };
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};
