const db = require('../models/db');

// Obtener todos los productos con presentaciones
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');

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

// Crear un nuevo producto con presentaciones
exports.createProduct = async (req, res) => {
  const { name, description, category, price, toasted, origin, flavors, image_url, secondary_image_url, presentations = [] } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO products 
       (name, description, category, price, toasted, origin, flavors, available, image_url, secondary_image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [name, description, category, price, toasted, origin, flavors, image_url, secondary_image_url]
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
