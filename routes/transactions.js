const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/transactions - Get all transactions
// Supports optional query parameters: type ('income' or 'expense')
router.get('/', (req, res) => {
    const { type } = req.query;
    let sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";
    let params = [];

    if (type) {
        if (type !== 'income' && type !== 'expense') {
            return res.status(400).json({ error: "Invalid type filter. Must be 'income' or 'expense'." });
        }
        sql = "SELECT * FROM transactions WHERE type = ? ORDER BY date DESC, id DESC";
        params.push(type);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: `Failed to retrieve transactions: ${err.message}` });
            return;
        }
        res.json({ transactions: rows });
    });
});

// POST /api/transactions - Add a new transaction
router.post('/', (req, res) => {
    const { type, category, amount, date, description } = req.body;

    // Validate input
    if (!type || !category || amount == null || !date) {
        return res.status(400).json({ error: "Missing required fields: type, category, amount, date." });
    }
    if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ error: "Invalid transaction type. Must be 'income' or 'expense'." });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount. Must be a positive number." });
    }
    if (!category.trim()) {
        return res.status(400).json({ error: "Category cannot be empty." });
    }
    // Basic date validation (should be YYYY-MM-DD format from client)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
    }

    const stmt = db.prepare("INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)");
    stmt.run(type, category.trim(), parsedAmount, date, description ? description.trim() : null, function(err) {
        if (err) {
            res.status(500).json({ error: `Failed to add transaction: ${err.message}` });
            return;
        }
        res.status(201).json({ id: this.lastID, type, category: category.trim(), amount: parsedAmount, date, description: description ? description.trim() : null });
    });
    stmt.finalize();
});

// PUT /api/transactions/:id - Update an existing transaction
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;

    db.get("SELECT * FROM transactions WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        if (!row) {
            return res.status(404).json({ error: "Transaction not found." });
        }

        const updatedType = type !== undefined ? type : row.type;
        const updatedCategory = category !== undefined ? category.trim() : row.category;
        const updatedAmount = amount !== undefined ? parseFloat(amount) : row.amount;
        const updatedDate = date !== undefined ? date : row.date;
        const updatedDescription = description !== undefined ? (description ? description.trim() : null) : row.description;

        // Validate updated fields
        if (type !== undefined && updatedType !== 'income' && updatedType !== 'expense') {
            return res.status(400).json({ error: "Invalid transaction type. Must be 'income' or 'expense'." });
        }
        if (amount !== undefined && (isNaN(updatedAmount) || updatedAmount <= 0)) {
            return res.status(400).json({ error: "Invalid amount. Must be a positive number." });
        }
        if (category !== undefined && !updatedCategory) {
            return res.status(400).json({ error: "Category cannot be empty." });
        }
        if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(updatedDate)) {
            return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
        }

        const stmt = db.prepare("UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?");
        stmt.run(updatedType, updatedCategory, updatedAmount, updatedDate, updatedDescription, id, function(err) {
            if (err) {
                res.status(500).json({ error: `Failed to update transaction: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                // Should be caught by the initial SELECT, but as a safeguard or if data matches exactly
                return res.status(404).json({ error: "Transaction not found or no changes made." });
            }
            res.json({ id: Number(id), type: updatedType, category: updatedCategory, amount: updatedAmount, date: updatedDate, description: updatedDescription });
        });
        stmt.finalize();
    });
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    stmt.run(id, function(err) {
        if (err) {
            res.status(500).json({ error: `Failed to delete transaction: ${err.message}` });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: "Transaction not found." });
            return;
        }
        res.json({ message: "Transaction deleted successfully", id: Number(id) });
    });
    stmt.finalize();
});

module.exports = router;
