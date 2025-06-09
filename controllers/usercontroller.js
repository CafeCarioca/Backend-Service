const pool = require('../models/db');

exports.getusers = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM users');
    connection.release();
    rows.forEach(user => delete user.password);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

exports.getuser = async (req, res) => {
  const userId = req.params.id;
  try {
    const connection = await pool.getConnection();

    // Traer datos del usuario
    const [userRows] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userRows[0];
    delete user.password;

    // Traer direcciones del usuario
    const [addresses] = await connection.query('SELECT * FROM addresses WHERE user_id = ?', [userId]);

    // Traer pedidos del usuario (asumiendo que orders tiene user_id)
    const [orders] = await connection.query('SELECT * FROM orders WHERE user_id = ?', [userId]);

    connection.release();

    // Devolver todo junto
    res.json({
      ...user,
      addresses,
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

exports.deleteuser = async (req, res) => {
  const userId = req.params.id;
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    connection.release();
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}