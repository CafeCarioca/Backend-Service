const db = require('../models/db');

// Obtener todos los productos con presentaciones
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY display_order ASC, id ASC');

    const productData = await Promise.all(products.map(async (product) => {
      const [presentations] = await db.query('SELECT * FROM presentations WHERE product_id = ?', [product.id]);
      return { ...product, presentations };
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

    res.json({ ...productRows[0], presentations });
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

    res.json({ ...productRows[0], presentations });
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
      return { ...product, presentations };
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
