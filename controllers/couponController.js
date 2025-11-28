const db = require('../models/db');

// Obtener todos los cupones
const getAllCoupons = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        delivery_type,
        min_purchase_amount,
        max_uses,
        current_uses,
        is_active,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM coupons
      ORDER BY created_at DESC
    `;
    
    const [coupons] = await db.query(query);
    res.json(coupons);
  } catch (error) {
    console.error('Error al obtener cupones:', error);
    res.status(500).json({ error: 'Error al obtener cupones' });
  }
};

// Obtener un cupón por ID
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        delivery_type,
        min_purchase_amount,
        max_uses,
        current_uses,
        is_active,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM coupons
      WHERE id = ?
    `;
    
    const [coupons] = await db.query(query, [id]);
    
    if (coupons.length === 0) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }
    
    res.json(coupons[0]);
  } catch (error) {
    console.error('Error al obtener cupón:', error);
    res.status(500).json({ error: 'Error al obtener cupón' });
  }
};

// Validar y obtener cupón por código
const validateCoupon = async (req, res) => {
  try {
    const { code, deliveryType, orderTotal } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de cupón requerido' });
    }
    
    const query = `
      SELECT 
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        delivery_type,
        min_purchase_amount,
        max_uses,
        current_uses,
        is_active,
        start_date,
        end_date
      FROM coupons
      WHERE code = ? AND is_active = 1
    `;
    
    const [coupons] = await db.query(query, [code.toUpperCase()]);
    
    if (coupons.length === 0) {
      return res.status(404).json({ error: 'Cupón no válido o no encontrado' });
    }
    
    const coupon = coupons[0];
    
    // Validar fecha de inicio
    if (coupon.start_date && new Date() < new Date(coupon.start_date)) {
      return res.status(400).json({ error: 'Este cupón aún no está disponible' });
    }
    
    // Validar fecha de fin
    if (coupon.end_date && new Date() > new Date(coupon.end_date)) {
      return res.status(400).json({ error: 'Este cupón ha expirado' });
    }
    
    // Validar tipo de entrega
    if (coupon.delivery_type !== 'both' && deliveryType && coupon.delivery_type !== deliveryType) {
      const deliveryName = coupon.delivery_type === 'delivery' ? 'envío a domicilio' : 'retiro en tienda';
      return res.status(400).json({ 
        error: `Este cupón solo es válido para ${deliveryName}` 
      });
    }
    
    // Validar monto mínimo de compra
    if (orderTotal && coupon.min_purchase_amount > 0 && orderTotal < coupon.min_purchase_amount) {
      return res.status(400).json({ 
        error: `El monto mínimo de compra para este cupón es $${coupon.min_purchase_amount}` 
      });
    }
    
    // Validar usos máximos
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return res.status(400).json({ error: 'Este cupón ya no tiene usos disponibles' });
    }
    
    // Calcular descuento
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderTotal * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }
    
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        delivery_type: coupon.delivery_type,
        min_purchase_amount: coupon.min_purchase_amount
      },
      discountAmount: discountAmount
    });
  } catch (error) {
    console.error('Error al validar cupón:', error);
    res.status(500).json({ error: 'Error al validar cupón' });
  }
};

// Crear un nuevo cupón
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      delivery_type = 'both',
      min_purchase_amount = 0,
      max_uses,
      is_active = true,
      start_date,
      end_date
    } = req.body;
    
    // Validaciones
    if (!code || !name || !discount_type || !discount_value) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'Tipo de descuento inválido' });
    }
    
    if (!['both', 'delivery', 'takeaway'].includes(delivery_type)) {
      return res.status(400).json({ error: 'Tipo de entrega inválido' });
    }
    
    const query = `
      INSERT INTO coupons (
        code, name, description, discount_type, discount_value, 
        delivery_type, min_purchase_amount, max_uses, is_active, 
        start_date, end_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      code.toUpperCase(),
      name,
      description,
      discount_type,
      discount_value,
      delivery_type,
      min_purchase_amount,
      max_uses || null,
      is_active,
      start_date || null,
      end_date || null
    ]);
    
    res.status(201).json({
      message: 'Cupón creado exitosamente',
      couponId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear cupón:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe un cupón con ese código' });
    }
    res.status(500).json({ error: 'Error al crear cupón' });
  }
};

// Actualizar un cupón
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      delivery_type,
      min_purchase_amount,
      max_uses,
      is_active,
      start_date,
      end_date
    } = req.body;
    
    // Validaciones
    if (discount_type && !['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'Tipo de descuento inválido' });
    }
    
    if (delivery_type && !['both', 'delivery', 'takeaway'].includes(delivery_type)) {
      return res.status(400).json({ error: 'Tipo de entrega inválido' });
    }
    
    // Construir query dinámico
    const updates = [];
    const values = [];
    
    if (code !== undefined) {
      updates.push('code = ?');
      values.push(code.toUpperCase());
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (discount_type !== undefined) {
      updates.push('discount_type = ?');
      values.push(discount_type);
    }
    if (discount_value !== undefined) {
      updates.push('discount_value = ?');
      values.push(discount_value);
    }
    if (delivery_type !== undefined) {
      updates.push('delivery_type = ?');
      values.push(delivery_type);
    }
    if (min_purchase_amount !== undefined) {
      updates.push('min_purchase_amount = ?');
      values.push(min_purchase_amount);
    }
    if (max_uses !== undefined) {
      updates.push('max_uses = ?');
      values.push(max_uses || null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(end_date || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }
    
    values.push(id);
    const query = `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`;
    
    const [result] = await db.query(query, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }
    
    res.json({ message: 'Cupón actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar cupón:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe un cupón con ese código' });
    }
    res.status(500).json({ error: 'Error al actualizar cupón' });
  }
};

// Eliminar un cupón
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM coupons WHERE id = ?';
    const [result] = await db.query(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }
    
    res.json({ message: 'Cupón eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cupón:', error);
    res.status(500).json({ error: 'Error al eliminar cupón' });
  }
};

// Nota: El incremento de uso se hace automáticamente en orderController 
// cuando el pago es confirmado (estado = 'Pagado')

module.exports = {
  getAllCoupons,
  getCouponById,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
