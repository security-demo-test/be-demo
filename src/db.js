const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { log } = require('console');

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create a database connection
const dbPath = path.resolve(dataDir, 'banking.db');
console.log(`Using database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Initialize the database
function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        balance REAL DEFAULT 100.0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users (id),
        FOREIGN KEY (to_user_id) REFERENCES users (id)
      )
    `);

    console.log('Database initialized');
  });
}

// User operations
const userOperations = {
  createUser: (username, password) => {
    return new Promise((resolve, reject) => {
      // Hash the password
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) return reject(err);

        db.run(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hash],
          function(err) {
            if (err) return reject(err);
            
            // Create account with initial balance of 100
            db.run(
              'INSERT INTO accounts (user_id, balance) VALUES (?, 100.0)',
              [this.lastID],
              (err) => {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          }
        );
      });
    });
  },

  findUserByUsername: (username) => {
    log(`Finding user by username: ${username}`);
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  findUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  verifyPassword: (password, hash) => {
    return bcrypt.compare(password, hash);
  }
};

// Account operations
const accountOperations = {
  getBalance: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT balance FROM accounts WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row ? row.balance : null);
        }
      );
    });
  },

  transfer: (fromUserId, toUserId, amount) => {
    return new Promise((resolve, reject) => {
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Deduct from sender
        db.run(
          'UPDATE accounts SET balance = balance - ? WHERE user_id = ?',
          [amount, fromUserId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            // Add to recipient
            db.run(
              'UPDATE accounts SET balance = balance + ? WHERE user_id = ?',
              [amount, toUserId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }

                // Record the transaction
                db.run(
                  'INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES (?, ?, ?)',
                  [fromUserId, toUserId, amount],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return reject(err);
                    }

                    db.run('COMMIT');
                    resolve(true);
                  }
                );
              }
            );
          }
        );
      });
    });
  },

  getTransactionHistory: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          t.id, 
          t.from_user_id,
          t.to_user_id,
          u1.username as from_username, 
          u2.username as to_username, 
          t.amount, 
          t.timestamp 
        FROM transactions t
        JOIN users u1 ON t.from_user_id = u1.id
        JOIN users u2 ON t.to_user_id = u2.id
        WHERE t.from_user_id = ? OR t.to_user_id = ?
        ORDER BY t.timestamp DESC`,
        [userId, userId],
        (err, rows) => {
          if (err) return reject(err);
          
          // Format the transactions
          const transactions = rows.map(row => ({
            id: row.id,
            type: row.from_user_id === userId ? 'sent' : 'received',
            otherParty: row.from_user_id === userId ? row.to_username : row.from_username,
            amount: row.amount,
            timestamp: row.timestamp
          }));
          
          resolve(transactions);
        }
      );
    });
  }
};

// Initialize the database
initializeDatabase();

module.exports = {
  db,
  userOperations,
  accountOperations
};