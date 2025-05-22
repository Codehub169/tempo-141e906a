// server.js - Main entry point for the backend application

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database'); // Initializes DB connection and creates tables

// Import route handlers (to be implemented in later batches)
const transactionRoutes = require('./routes/transactions');
const goalRoutes = require('./routes/goals');
const insightRoutes = require('./routes/insights');

const app = express();
const PORT = 9000; // Application will run on this port, serving frontend and API

// --- Middleware Setup ---
// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests (e.g., for API POST/PUT calls)
app.use(express.json());

// Parse incoming URL-encoded requests (e.g., from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JavaScript) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
// Mount routers for different parts of the API
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/insights', insightRoutes);

// --- Frontend Route ---
// Serve the main HTML page for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Error Handling ---
// Basic global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// --- Server Initialization ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // The db module already logs connection and table creation status.
});

// --- Graceful Shutdown ---
// Close the database connection when the server shuts down
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
