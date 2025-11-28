const db = require('../models/db');

// Función helper para calcular el descuento activo de un producto
// deliveryType: 'delivery', 'takeaway', o null (devuelve todos los descuentos activos)
const getActiveDiscount = async (productId, deliveryType = null) => {
  let query = `
    SELECT d.*
    FROM discounts d
    INNER JOIN product_discounts pd ON d.id = pd.discount_id
    WHERE pd.product_id = ?
    AND d.is_active = TRUE
    AND (d.start_date IS NULL OR d.start_date <= CURDATE())
    AND (d.end_date IS NULL OR d.end_date >= CURDATE())`;
  
  const params = [productId];
  
  // Si se especifica deliveryType, filtrar descuentos
  if (deliveryType) {
    query += ` AND (d.delivery_type = 'both' OR d.delivery_type = ?)`;
    params.push(deliveryType);
  }
  
  query += `
    ORDER BY d.discount_value DESC
    LIMIT 1
  `;

  const [discounts] = await db.query(query, params);

  return discounts.length > 0 ? discounts[0] : null;
};

// Función helper para calcular precio con descuento
const calculateDiscountedPrice = (originalPrice, discount) => {
  if (!discount || !originalPrice) return originalPrice;

  if (discount.discount_type === 'percentage') {
    return originalPrice * (1 - discount.discount_value / 100);
  } else if (discount.discount_type === 'fixed_amount') {
    return Math.max(0, originalPrice - discount.discount_value);
  }

  return originalPrice;
};

// Función helper para agregar información de descuento a un producto
// deliveryType: 'delivery', 'takeaway', o null
const addDiscountInfo = async (product, deliveryType = null) => {
  const discount = await getActiveDiscount(product.id, deliveryType);
  
  if (discount) {
    const originalPrice = product.price;
    const finalPrice = calculateDiscountedPrice(originalPrice, discount);
    
    return {
      ...product,
      original_price: originalPrice,
      discount: {
        id: discount.id,
        name: discount.name,
        type: discount.discount_type,
        value: discount.discount_value,
        start_date: discount.start_date,
        end_date: discount.end_date,
        delivery_type: discount.delivery_type
      },
      discounted_price: finalPrice,
      has_discount: true
    };
  }

  return {
    ...product,
    has_discount: false
  };
};

// Obtener todos los productos con presentaciones y descuentos
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY display_order ASC, id ASC');

    const productData = await Promise.all(products.map(async (product) => {
      const [presentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [product.id]);
      const productWithDiscount = await addDiscountInfo(product);
      return { ...productWithDiscount, presentations };
    }));

    res.json(productData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const [productRows] = await db.query('SELECT * FROM products WHERE id = ? AND available = TRUE', [id]);
    if (productRows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const [presentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [id]);
    const productWithDiscount = await addDiscountInfo(productRows[0]);

    res.json({ ...productWithDiscount, presentations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

//Obtener producto por nombre
exports.getProductByName = async (req, res) => {
  const { name } = req.params;
  try {
    const [productRows] = await db.query('SELECT * FROM products WHERE name = ? AND available = TRUE', [name]);
    if (productRows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const [presentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [productRows[0].id]);
    const productWithDiscount = await addDiscountInfo(productRows[0]);

    res.json({ ...productWithDiscount, presentations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};


// Crear un nuevo producto con presentaciones
exports.createProduct = async (req, res) => {
  const { name, description, category, price, toasted, origin, flavors, image_url, secondary_image_url, presentations = [], display_order } = req.body;

  try {
    // Convertir strings vacíos a NULL para campos numéricos
    const finalPrice = price === '' || price === null || price === undefined ? null : price;
    const finalDisplayOrder = display_order === '' || display_order === null || display_order === undefined ? 999 : display_order;

    const [result] = await db.query(
      `INSERT INTO products 
       (name, description, category, price, toasted, origin, flavors, available, image_url, secondary_image_url, display_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)`,
      [name, description, category, finalPrice, toasted, origin, flavors, image_url, secondary_image_url, finalDisplayOrder]
    );

    const productId = result.insertId;

    for (const p of presentations) {
      await db.query(
        'INSERT INTO presentations (product_id, weight, price) VALUES (?, ?, ?)',
        [productId, p.weight, p.price]
      );
    }

    res.status(201).json({ id: productId, name, description, category, price, toasted, origin, flavors, available: true, image_url, secondary_image_url, presentations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// Editar un producto y sus presentaciones
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { presentations, ...fields } = req.body;

  if (Object.keys(fields).length === 0 && !presentations) {
    return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
  }

  try {
    // Actualizar campos del producto
    if (Object.keys(fields).length > 0) {
      const keys = Object.keys(fields);
      const values = Object.values(fields);

      const query = `
        UPDATE products
        SET ${keys.map((key) => `${key} = ?`).join(', ')}
        WHERE id = ?
      `;
      const [result] = await db.query(query, [...values, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
    }

    // Actualizar presentaciones (si hay)
    if (presentations) {
      await db.query('DELETE FROM presentations WHERE product_id = ?', [id]);

      for (const p of presentations) {
        await db.query(
          'INSERT INTO presentations (product_id, weight, price) VALUES (?, ?, ?)',
          [id, p.weight, p.price]
        );
      }
    }

    // Obtener y devolver el producto actualizado
    const [productRows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    const [updatedPresentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [id]);

    const updatedProduct = {
      ...productRows[0],
      presentations: updatedPresentations
    };

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

// Eliminar (soft-delete) producto
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('UPDATE products SET available = FALSE WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto marcado como no disponible' });
  } catch (error) {
    console.error('Error al desactivar el producto:', error);
    res.status(500).json({ error: 'Error al desactivar el producto' });
  }
};

// Búsqueda de productos
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query; // query parameter: ?q=cafe

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }

    const searchTerm = `%${q.trim()}%`;

    // Buscar en nombre, descripción, origen, sabores y categoría
    const [products] = await db.query(
      `SELECT * FROM products 
       WHERE available = TRUE 
       AND (
         name LIKE ? 
         OR description LIKE ? 
         OR origin LIKE ? 
         OR flavors LIKE ? 
         OR category LIKE ?
         OR toasted LIKE ?
       )
       ORDER BY 
         CASE 
           WHEN name LIKE ? THEN 1
           WHEN description LIKE ? THEN 2
           ELSE 3
         END,
         display_order ASC,
         name ASC
       LIMIT 50`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // Agregar presentaciones a cada producto
    const productData = await Promise.all(products.map(async (product) => {
      const [presentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [product.id]);
      const productWithDiscount = await addDiscountInfo(product);
      return { ...productWithDiscount, presentations };
    }));

    res.json({
      query: q,
      count: productData.length,
      results: productData
    });
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
};
