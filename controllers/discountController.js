const db = require('../models/db');
const logger = require('../utils/logger');

const replaceDiscountPresentations = async (connection, discountId, presentationIds = []) => {
    await connection.query('DELETE FROM discount_presentations WHERE discount_id = ?', [discountId]);
    if (presentationIds.length > 0) {
        const values = [...new Set(presentationIds.map(Number))].map(presentationId => [discountId, presentationId]);
        await connection.query(
            'INSERT INTO discount_presentations (discount_id, presentation_id) VALUES ?',
            [values]
        );
    }
};

// Obtener todos los descuentos con información de productos asignados
const getAllDiscounts = async (req, res) => {
    try {
        const [discounts] = await db.query(`
            SELECT 
                d.id,
                d.name,
                d.description,
                d.discount_type,
                d.discount_value,
                d.is_active,
                d.delivery_type,
                d.start_date,
                d.end_date,
                d.created_at,
                d.updated_at,
                COUNT(pd.product_id) as product_count
            FROM discounts d
            LEFT JOIN product_discounts pd ON d.id = pd.discount_id
            GROUP BY d.id, d.name, d.description, d.discount_type, d.discount_value, 
                     d.is_active, d.delivery_type, d.start_date, d.end_date, d.created_at, d.updated_at
            ORDER BY d.created_at DESC
        `);
        res.json(discounts);
    } catch (error) {
        logger.error('Error al obtener descuentos:', error);
        res.status(500).json({ message: 'Error al obtener descuentos', error: error.message });
    }
};

// Obtener un descuento específico con sus productos
const getDiscountById = async (req, res) => {
    const { id } = req.params;
    try {
        const [discounts] = await db.query('SELECT * FROM discounts WHERE id = ?', [id]);
        
        if (discounts.length === 0) {
            return res.status(404).json({ message: 'Descuento no encontrado' });
        }

        const [products] = await db.query(`
            SELECT p.*
            FROM products p
            INNER JOIN product_discounts pd ON p.id = pd.product_id
            WHERE pd.discount_id = ?
        `, [id]);

        const [presentations] = await db.query(`
            SELECT dp.presentation_id, pr.product_id, pr.weight, pr.price
            FROM discount_presentations dp
            INNER JOIN presentations pr ON pr.id = dp.presentation_id
            WHERE dp.discount_id = ?
            ORDER BY pr.product_id, pr.id
        `, [id]);

        res.json({
            ...discounts[0],
            products,
            presentation_ids: presentations.map(presentation => presentation.presentation_id),
            presentations
        });
    } catch (error) {
        logger.error('Error al obtener descuento:', error);
        res.status(500).json({ message: 'Error al obtener descuento', error: error.message });
    }
};

// Crear un nuevo descuento
const createDiscount = async (req, res) => {
    const {
        name,
        description,
        discount_type,
        discount_value,
        is_active = true,
        delivery_type = 'both',
        start_date = null,
        end_date = null,
        product_ids = [],
        presentation_ids = []
    } = req.body;

    // Validaciones
    if (!name || !discount_type || !discount_value) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: name, discount_type, discount_value' });
    }

    if (!['percentage', 'fixed_amount', 'bogo'].includes(discount_type)) {
        return res.status(400).json({ message: 'discount_type debe ser "percentage", "fixed_amount" o "bogo"' });
    }

    if (!['both', 'delivery', 'takeaway'].includes(delivery_type)) {
        return res.status(400).json({ message: 'delivery_type debe ser "both", "delivery" o "takeaway"' });
    }

    if (discount_value <= 0) {
        return res.status(400).json({ message: 'discount_value debe ser mayor a 0' });
    }

    let connection;
    try {
        // Insertar descuento
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO discounts (name, description, discount_type, discount_value, is_active, delivery_type, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, discount_type, discount_value, is_active, delivery_type, start_date, end_date]
        );

        const discountId = result.insertId;

        // Asignar productos si se proporcionaron
        if (product_ids && product_ids.length > 0) {
            const values = product_ids.map(productId => [productId, discountId]);
            await connection.query(
                'INSERT INTO product_discounts (product_id, discount_id) VALUES ?',
                [values]
            );
        }

        await replaceDiscountPresentations(connection, discountId, presentation_ids);
        await connection.commit();
        connection.release();
        connection = null;

        res.status(201).json({
            message: 'Descuento creado exitosamente',
            discountId,
            product_count: product_ids.length
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        logger.error('Error al crear descuento:', error);
        res.status(500).json({ message: 'Error al crear descuento', error: error.message });
    }
};

// Actualizar un descuento
const updateDiscount = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        description,
        discount_type,
        discount_value,
        is_active,
        delivery_type,
        start_date,
        end_date,
        presentation_ids
    } = req.body;

    try {
        // Verificar que el descuento existe
        const [existing] = await db.query('SELECT id FROM discounts WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Descuento no encontrado' });
        }

        // Construir query dinámico
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (discount_type !== undefined) {
            if (!['percentage', 'fixed_amount', 'bogo'].includes(discount_type)) {
                return res.status(400).json({ message: 'discount_type debe ser "percentage", "fixed_amount" o "bogo"' });
            }
            updates.push('discount_type = ?');
            values.push(discount_type);
        }
        if (discount_value !== undefined) {
            if (discount_value <= 0) {
                return res.status(400).json({ message: 'discount_value debe ser mayor a 0' });
            }
            updates.push('discount_value = ?');
            values.push(discount_value);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active);
        }
        if (delivery_type !== undefined) {
            if (!['both', 'delivery', 'takeaway'].includes(delivery_type)) {
                return res.status(400).json({ message: 'delivery_type debe ser "both", "delivery" o "takeaway"' });
            }
            updates.push('delivery_type = ?');
            values.push(delivery_type);
        }
        if (start_date !== undefined) {
            updates.push('start_date = ?');
            values.push(start_date);
        }
        if (end_date !== undefined) {
            updates.push('end_date = ?');
            values.push(end_date);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No hay campos para actualizar' });
        }

        values.push(id);
        await db.query(
            `UPDATE discounts SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        if (presentation_ids !== undefined) {
            await replaceDiscountPresentations(db, id, presentation_ids);
        }

        res.json({ message: 'Descuento actualizado exitosamente' });
    } catch (error) {
        logger.error('Error al actualizar descuento:', error);
        res.status(500).json({ message: 'Error al actualizar descuento', error: error.message });
    }
};

// Eliminar un descuento
const deleteDiscount = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM discounts WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Descuento no encontrado' });
        }

        res.json({ message: 'Descuento eliminado exitosamente' });
    } catch (error) {
        logger.error('Error al eliminar descuento:', error);
        res.status(500).json({ message: 'Error al eliminar descuento', error: error.message });
    }
};

// Agregar productos a un descuento
const addProductsToDiscount = async (req, res) => {
    const { id } = req.params;
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de product_ids' });
    }

    try {
        // Verificar que el descuento existe
        const [discount] = await db.query('SELECT id FROM discounts WHERE id = ?', [id]);
        if (discount.length === 0) {
            return res.status(404).json({ message: 'Descuento no encontrado' });
        }

        // Insertar relaciones (ignorar duplicados)
        const values = product_ids.map(productId => [productId, id]);
        await db.query(
            'INSERT IGNORE INTO product_discounts (product_id, discount_id) VALUES ?',
            [values]
        );

        res.json({ message: 'Productos agregados al descuento exitosamente' });
    } catch (error) {
        logger.error('Error al agregar productos:', error);
        res.status(500).json({ message: 'Error al agregar productos', error: error.message });
    }
};

// Remover un producto de un descuento
const removeProductFromDiscount = async (req, res) => {
    const { id, productId } = req.params;

    try {
        const [result] = await db.query(
            'DELETE FROM product_discounts WHERE discount_id = ? AND product_id = ?',
            [id, productId]
        );

        await db.query(`
            DELETE dp FROM discount_presentations dp
            INNER JOIN presentations pr ON pr.id = dp.presentation_id
            WHERE dp.discount_id = ? AND pr.product_id = ?
        `, [id, productId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Relación no encontrada' });
        }

        res.json({ message: 'Producto removido del descuento exitosamente' });
    } catch (error) {
        logger.error('Error al remover producto:', error);
        res.status(500).json({ message: 'Error al remover producto', error: error.message });
    }
};

// Obtener productos de un descuento
const getProductsByDiscount = async (req, res) => {
    const { id } = req.params;

    try {
        const [products] = await db.query(`
            SELECT p.*,
                   GROUP_CONCAT(dp.presentation_id ORDER BY dp.presentation_id) AS discount_presentation_ids
            FROM products p
            INNER JOIN product_discounts pd ON p.id = pd.product_id
            LEFT JOIN presentations pr ON pr.product_id = p.id
            LEFT JOIN discount_presentations dp
              ON dp.discount_id = pd.discount_id AND dp.presentation_id = pr.id
            WHERE pd.discount_id = ?
            GROUP BY p.id
            ORDER BY p.name
        `, [id]);

        res.json(products);
    } catch (error) {
        logger.error('Error al obtener productos:', error);
        res.status(500).json({ message: 'Error al obtener productos', error: error.message });
    }
};

// Obtener el descuento activo de un producto (el mayor descuento válido)
const getActiveDiscountForProduct = async (req, res) => {
    const { productId } = req.params;

    try {
        const [discounts] = await db.query(`
            SELECT d.*
            FROM discounts d
            INNER JOIN product_discounts pd ON d.id = pd.discount_id
            WHERE pd.product_id = ?
            AND d.is_active = TRUE
            AND (d.start_date IS NULL OR d.start_date <= CURDATE())
            AND (d.end_date IS NULL OR d.end_date >= CURDATE())
            ORDER BY d.discount_value DESC
            LIMIT 1
        `, [productId]);

        if (discounts.length === 0) {
            return res.json({ hasDiscount: false });
        }

        res.json({
            hasDiscount: true,
            discount: discounts[0]
        });
    } catch (error) {
        logger.error('Error al obtener descuento del producto:', error);
        res.status(500).json({ message: 'Error al obtener descuento del producto', error: error.message });
    }
};

module.exports = {
    getAllDiscounts,
    getDiscountById,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    addProductsToDiscount,
    removeProductFromDiscount,
    getProductsByDiscount,
    getActiveDiscountForProduct
};
