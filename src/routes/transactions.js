const express = require('express');
const { accountOperations, userOperations } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get account balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const balance = await accountOperations.getBalance(userId);
    
    if (balance === null) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Transfer funds (vulnerable to CSRF)
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { to, amount } = req.body;
    const fromUserId = req.user.userId;
    
    // Validate parameters
    if (!to || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transfer details' });
    }
    
    // Find recipient
    const recipient = await userOperations.findUserByUsername(to);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }
    
    const toUserId = recipient.id;
    
    // Check sufficient balance
    const balance = await accountOperations.getBalance(fromUserId);
    if (balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }
    
    // Perform transfer
    await accountOperations.transfer(fromUserId, toUserId, parseFloat(amount));
    
    // Get updated balance
    const newBalance = await accountOperations.getBalance(fromUserId);
    
    res.json({
      success: true,
      message: 'Transfer successful',
      newBalance
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get transaction history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const transactions = await accountOperations.getTransactionHistory(userId);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;