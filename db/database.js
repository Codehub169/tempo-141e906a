// db/database.js - SQLite database setup and initialization

const sqlite3 = require('sqlite3').verbose(); // Use verbose mode for more detailed logs
const path = require('path');

// Define the absolute path for the database file within the 'db' directory
const DB_FILENAME = 'budget_tracker.db';
const DB_PATH = path.join(__dirname, DB_FILENAME);

// Initialize the database connection.
// This will create the budget_tracker.db file if it doesn't exist.
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(`Error opening/creating database at ${DB_PATH}:`, err.message);
    // Exit process if DB connection fails, as app cannot function
    process.exit(1); 
  } else {
    console.log(`Successfully connected to the SQLite database: ${DB_PATH}`);
    // Ensure tables are created after connection is established
    initializeDatabaseSchema();
  }
});

// Function to create necessary tables if they don't already exist
function initializeDatabaseSchema() {
  // SQL statement to create the 'transactions' table
  const createTransactionsTableSQL = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')), -- Transaction type: 'income' or 'expense'
      category TEXT NOT NULL,                                -- Category of the transaction (e.g., Salary, Groceries)
      amount REAL NOT NULL,                                  -- Monetary value of the transaction
      date TEXT NOT NULL,                                    -- Date of the transaction (ISO 8601 format: YYYY-MM-DD)
      description TEXT                                       -- Optional description for the transaction
    );
  `;

  // SQL statement to create the 'goals' table
  const createGoalsTableSQL = `
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,                                    -- Name of the savings goal (e.g., New Laptop)
      target_amount REAL NOT NULL,                           -- The target amount to save for the goal
      current_amount REAL NOT NULL DEFAULT 0,                -- The current amount saved towards the goal
      deadline TEXT                                          -- Optional deadline for the goal (ISO 8601 format: YYYY-MM-DD)
    );
  `;

  // Use db.serialize to ensure SQL commands run sequentially
  db.serialize(() => {
    db.run(createTransactionsTableSQL, (err) => {
      if (err) {
        console.error('Error creating/verifying \'transactions\' table:', err.message);
      } else {
        console.log('\'transactions\' table checked/created successfully.');
      }
    });

    db.run(createGoalsTableSQL, (err) => {
      if (err) {
        console.error('Error creating/verifying \'goals\' table:', err.message);
      } else {
        console.log('\'goals\' table checked/created successfully.');
      }
    });
  });
}

// Export the database connection instance for use in other modules (e.g., route handlers)
module.exports = db;
