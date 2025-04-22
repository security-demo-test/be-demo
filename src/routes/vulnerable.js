const express = require('express');
const router = express.Router();

// VULNERABLE: Endpoint with XSS vulnerability
router.get('/search', (req, res) => {
  const query = req.query.q || '';
  
  // VULNERABLE: Directly reflecting user input
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Search Results</title>
    </head>
    <body>
      <h2>Search Results for: ${query}</h2>
      <p>No results found.</p>
      <a href="/">Back to home</a>
    </body>
    </html>
  `);
});

// Another vulnerable endpoint for CSRF demonstration
router.get('/profile', (req, res) => {
  const name = req.query.name || 'User';
  
  // VULNERABLE: Reflected XSS
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>User Profile</title>
    </head>
    <body>
      <h1>Welcome, ${name}!</h1>
      <p>This is your profile page.</p>
      <a href="/">Back to home</a>
    </body>
    </html>
  `);
});

module.exports = router;