const express = require('express');
const jwt = require('jsonwebtoken');
const { userOperations } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    
    // Check if user already exists
    const existingUser = await userOperations.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    
    // Create new user
    const userId = await userOperations.createUser(username, password);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userId, username: username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Set cookie after registration (non-HttpOnly for demonstration)
    res.cookie('authToken', token, {
      maxAge: 3600000, // 1 hour
      path: '/'
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
      userId: userId,
      username: username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body); // Debugging line
    
    const { username, password } = req.body;
    
    // Find user
    const user = await userOperations.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await userOperations.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // VULNERABLE: Non-HttpOnly cookie for demonstration
    res.cookie('authToken', token, {
      maxAge: 3600000, // 1 hour
      path: '/'
    });
    
    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;