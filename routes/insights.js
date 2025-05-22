const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/insights/summary - Get total income, total expenses, and net balance
router.get('/summary', (req, res) => {
    const sql = `
        SELECT
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'income'), 0) as totalIncome,
            COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'expense'), 0) as totalExpenses
    `;
    db.get(sql, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: `Failed to retrieve financial summary: ${err.message}` });
            return;
        }
        const totalIncome = row.totalIncome;
        const totalExpenses = row.totalExpenses;
        const netBalance = totalIncome - totalExpenses;
        res.json({ totalIncome, totalExpenses, netBalance });
    });
});

// GET /api/insights/spending-by-category - Get spending grouped by category for expenses
router.get('/spending-by-category', (req, res) => {
    const sql = `
        SELECT category, SUM(amount) as totalAmount
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        HAVING SUM(amount) > 0
        ORDER BY totalAmount DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: `Failed to retrieve spending by category: ${err.message}` });
            return;
        }
        res.json({ spendingByCategory: rows });
    });
});

// Future potential insights:
// - Income by category
// - Spending trends over time (e.g., monthly)
// - Comparison with previous periods

module.exports = router;
