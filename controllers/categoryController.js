const db = require('../models/db');

exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY display_order ASC, id ASC');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

exports.createCategory = async (req, res) => {
  const { slug, name, description, display_order } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug y name son requeridos' });

  try {
    const [result] = await db.query(
      'INSERT INTO categories (slug, name, description, display_order) VALUES (?, ?, ?, ?)',
      [slug, name, description || null, display_order ?? 999]
    );
    res.status(201).json({ id: result.insertId, slug, name, description, display_order });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El slug ya existe' });
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, display_order } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE categories SET name = ?, description = ?, display_order = ? WHERE id = ?',
      [name, description || null, display_order ?? 999, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ id, name, description, display_order });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category = (SELECT slug FROM categories WHERE id = ?)', [id]);
    if (products[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una categoría con productos asociados' });
    }

    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
};
