const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/goals - Get all savings goals
router.get('/', (req, res) => {
    db.all("SELECT * FROM goals ORDER BY deadline ASC, id DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: `Failed to retrieve goals: ${err.message}` });
            return;
        }
        res.json({ goals: rows });
    });
});

// POST /api/goals - Add a new savings goal
router.post('/', (req, res) => {
    const { name, target_amount, deadline, current_amount = 0 } = req.body;

    if (!name || target_amount == null || !deadline) {
        return res.status(400).json({ error: "Missing required fields: name, target_amount, deadline." });
    }
    if (!name.trim()) {
        return res.status(400).json({ error: "Goal name cannot be empty." });
    }
    const parsedTargetAmount = parseFloat(target_amount);
    if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
        return res.status(400).json({ error: "Invalid target_amount. Must be a positive number." });
    }
    const parsedCurrentAmount = current_amount != null ? parseFloat(current_amount) : 0;
    if (isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
        return res.status(400).json({ error: "Invalid current_amount. Must be a non-negative number." });
    }
    if (parsedCurrentAmount > parsedTargetAmount) {
        return res.status(400).json({ error: "Current amount cannot exceed target amount." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        return res.status(400).json({ error: "Invalid deadline format. Expected YYYY-MM-DD." });
    }

    const stmt = db.prepare("INSERT INTO goals (name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?)");
    stmt.run(name.trim(), parsedTargetAmount, parsedCurrentAmount, deadline, function(err) {
        if (err) {
            res.status(500).json({ error: `Failed to add goal: ${err.message}` });
            return;
        }
        res.status(201).json({ id: this.lastID, name: name.trim(), target_amount: parsedTargetAmount, current_amount: parsedCurrentAmount, deadline });
    });
    stmt.finalize();
});

// PUT /api/goals/:id - Update a savings goal
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, target_amount, current_amount, deadline } = req.body;

    db.get("SELECT * FROM goals WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        if (!row) {
            return res.status(404).json({ error: "Goal not found." });
        }

        const updatedName = name !== undefined ? name.trim() : row.name;
        const updatedTargetAmount = target_amount !== undefined ? parseFloat(target_amount) : row.target_amount;
        const updatedCurrentAmount = current_amount !== undefined ? parseFloat(current_amount) : row.current_amount;
        const updatedDeadline = deadline !== undefined ? deadline : row.deadline;

        // Validations
        if (name !== undefined && !updatedName) {
            return res.status(400).json({ error: "Goal name cannot be empty." });
        }
        if (target_amount !== undefined && (isNaN(updatedTargetAmount) || updatedTargetAmount <= 0)) {
            return res.status(400).json({ error: "Invalid target_amount. Must be a positive number." });
        }
        if (current_amount !== undefined && (isNaN(updatedCurrentAmount) || updatedCurrentAmount < 0)) {
            return res.status(400).json({ error: "Invalid current_amount. Must be a non-negative number." });
        }
        if (deadline !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(updatedDeadline)) {
            return res.status(400).json({ error: "Invalid deadline format. Expected YYYY-MM-DD." });
        }

        // Cross-field validation for amounts
        if (updatedCurrentAmount > updatedTargetAmount) {
            return res.status(400).json({ error: "Current amount cannot exceed target amount." });
        }

        const stmt = db.prepare("UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ?");
        stmt.run(updatedName, updatedTargetAmount, updatedCurrentAmount, updatedDeadline, id, function(err) {
            if (err) {
                res.status(500).json({ error: `Failed to update goal: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Goal not found or no changes made." });
            }
            res.json({ id: Number(id), name: updatedName, target_amount: updatedTargetAmount, current_amount: updatedCurrentAmount, deadline: updatedDeadline });
        });
        stmt.finalize();
    });
});

// DELETE /api/goals/:id - Delete a savings goal
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM goals WHERE id = ?");
    stmt.run(id, function(err) {
        if (err) {
            res.status(500).json({ error: `Failed to delete goal: ${err.message}` });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: "Goal not found." });
            return;
        }
        res.json({ message: "Goal deleted successfully", id: Number(id) });
    });
    stmt.finalize();
});

module.exports = router;
