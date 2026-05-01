const db = require('../models/db');
const logger = require('../utils/logger');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

exports.subscribe = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const source = String(req.body.source || 'footer').trim().slice(0, 50);
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
  const userAgent = req.get('user-agent') || null;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Ingresa un email valido' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO newsletter_subscribers (email, source, ip_address, user_agent)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         source = ?,
         ip_address = ?,
         user_agent = ?,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [email, source, ipAddress, userAgent, source, ipAddress, userAgent]
    );

    const alreadyRegistered = result.affectedRows === 2;
    res.status(alreadyRegistered ? 200 : 201).json({
      message: alreadyRegistered
        ? 'Este email ya estaba registrado. Actualizamos tu suscripcion.'
        : 'Registro con exito!',
      email,
    });
  } catch (error) {
    logger.error('Error al registrar newsletter:', error);
    res.status(500).json({ error: 'Error al registrar el email' });
  }
};

exports.getSubscribers = async (req, res) => {
  try {
    const [subscribers] = await db.query(
      `SELECT id, email, source, is_active, created_at, updated_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC`
    );
    res.json(subscribers);
  } catch (error) {
    logger.error('Error al obtener suscriptores:', error);
    res.status(500).json({ error: 'Error al obtener suscriptores' });
  }
};
