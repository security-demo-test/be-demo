const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const vulnerableRoutes = require('./routes/vulnerable');

const app = express();
const PORT = process.env.PORT || 80;

app.use((req, res, next) => {
  // Get the origin from the request headers
  const origin = req.headers.origin;
  
  // Allow the specific origin that sent the request
  // This is the key to allowing any origin while supporting credentials
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Allow all common methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  // Allow all common headers
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', transactionRoutes);
app.use('/api', vulnerableRoutes);

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Banking App API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { background: #f4f4f4; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        .vulnerable { border-left: 5px solid #ff6b6b; }
      </style>
    </head>
    <body>
      <h1>Banking App API</h1>
      <p>Available endpoints:</p>
      
      <h2>Authentication</h2>
      <div class="endpoint">POST /api/auth/register - Register a new user</div>
      <div class="endpoint">POST /api/auth/login - Login</div>
      <div class="endpoint">POST /api/auth/logout - Logout</div>
      
      <h2>Transactions</h2>
      <div class="endpoint">GET /api/balance - Get account balance</div>
      <div class="endpoint">POST /api/transfer - Transfer funds</div>
      <div class="endpoint">GET /api/history - Get transaction history</div>
      
      <h2>Vulnerable Endpoints (for demonstration)</h2>
      <div class="endpoint vulnerable">GET /api/search?q=query - Search (XSS vulnerable)</div>
      <div class="endpoint vulnerable">GET /api/profile?name=username - User profile (XSS vulnerable)</div>
      
      <p><strong>Note:</strong> This API contains intentionally vulnerable endpoints for security demonstration purposes.</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for API documentation`);
});