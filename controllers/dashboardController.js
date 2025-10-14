const db = require('../models/db');

// Obtener estadísticas principales
exports.getStats = async (req, res) => {
    try {
        // Mes actual
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Total de ganancias del mes actual
        const [currentRevenue] = await db.query(
            `SELECT COALESCE(SUM(total), 0) as total 
             FROM orders 
             WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? AND status != 'cancelled'`,
            [currentMonth, currentYear]
        );

        // Total de ganancias del mes anterior
        const [lastRevenue] = await db.query(
            `SELECT COALESCE(SUM(total), 0) as total 
             FROM orders 
             WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? AND status != 'cancelled'`,
            [lastMonth, lastMonthYear]
        );

        // Número de órdenes del mes actual
        const [currentOrders] = await db.query(
            `SELECT COUNT(*) as count 
             FROM orders 
             WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?`,
            [currentMonth, currentYear]
        );

        // Número de órdenes del mes anterior
        const [lastOrders] = await db.query(
            `SELECT COUNT(*) as count 
             FROM orders 
             WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?`,
            [lastMonth, lastMonthYear]
        );

        // Calcular cambios porcentuales
        const revenueChange = lastRevenue[0].total > 0 
            ? (((currentRevenue[0].total - lastRevenue[0].total) / lastRevenue[0].total) * 100).toFixed(1)
            : 0;

        const ordersChange = lastOrders[0].count > 0
            ? (((currentOrders[0].count - lastOrders[0].count) / lastOrders[0].count) * 100).toFixed(1)
            : 0;

        res.json({
            totalRevenue: parseFloat(currentRevenue[0].total),
            totalSales: parseFloat(currentRevenue[0].total),
            totalOrders: currentOrders[0].count,
            revenueChange: parseFloat(revenueChange),
            salesChange: parseFloat(revenueChange),
            ordersChange: parseFloat(ordersChange)
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Obtener ventas por mes
exports.getSalesByMonth = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        
        const [results] = await db.query(
            `SELECT 
                MONTH(order_date) as month,
                COALESCE(SUM(total), 0) as ventas
             FROM orders
             WHERE YEAR(order_date) = ? AND status != 'cancelled'
             GROUP BY MONTH(order_date)
             ORDER BY MONTH(order_date)`,
            [currentYear]
        );

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Crear array con todos los meses inicializados en 0
        const salesByMonth = months.map((name, index) => ({
            name,
            ventas: 0
        }));

        // Llenar con datos reales
        results.forEach(row => {
            salesByMonth[row.month - 1].ventas = parseFloat(row.ventas);
        });

        res.json(salesByMonth);
    } catch (error) {
        console.error('Error al obtener ventas por mes:', error);
        res.status(500).json({ error: 'Error al obtener ventas por mes' });
    }
};

// Obtener usuarios recientes
exports.getRecentUsers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        const [users] = await db.query(
            `SELECT id, username, email, first_name, last_name, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT ?`,
            [limit]
        );

        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios recientes:', error);
        res.status(500).json({ error: 'Error al obtener usuarios recientes' });
    }
};

// Obtener órdenes recientes
exports.getRecentOrders = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        const [orders] = await db.query(
            `SELECT 
                o.id,
                o.order_date,
                o.status,
                o.total,
                CONCAT(u.first_name, ' ', u.last_name) as user_name
             FROM orders o
             JOIN users u ON o.user_id = u.id
             ORDER BY o.order_date DESC
             LIMIT ?`,
            [limit]
        );

        res.json(orders);
    } catch (error) {
        console.error('Error al obtener órdenes recientes:', error);
        res.status(500).json({ error: 'Error al obtener órdenes recientes' });
    }
};

// Obtener productos más vendidos del mes
exports.getTopProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const [products] = await db.query(
            `SELECT 
                p.id,
                p.name,
                SUM(oi.quantity) as total_quantity,
                COUNT(DISTINCT o.id) as num_orders,
                SUM(oi.price) as total_revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN products p ON oi.product_id = p.id
             WHERE MONTH(o.order_date) = ? 
               AND YEAR(o.order_date) = ?
               AND o.status != 'cancelled'
             GROUP BY p.id, p.name
             ORDER BY total_quantity DESC
             LIMIT ?`,
            [currentMonth, currentYear, limit]
        );

        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos más vendidos:', error);
        res.status(500).json({ error: 'Error al obtener productos más vendidos' });
    }
};
