const express = require('express');
const router = express.Router();
const {
  createUser,
  authenticateUser,
  generateToken,
  getUserByEmail,
  authMiddleware
} = require('../middleware/auth');
const {
  createCustomer,
  SUBSCRIPTION_PLANS
} = require('../config/stripe');

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, plan = 'starter' } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    if (!SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    const user = createUser(email, password, name, plan);
    
    const stripeCustomer = await createCustomer(email, name, {
      userId: user.id,
      plan: plan
    });
    
    user.customerId = stripeCustomer.id;
    
    const token = generateToken({ email: user.email, userId: user.id });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        apiKey: user.apiKey,
        customerId: user.customerId,
        isActive: user.isActive
      },
      token
    });
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = authenticateUser(email, password);
    const token = generateToken({ email: user.email, userId: user.id });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        apiKey: user.apiKey,
        customerId: user.customerId,
        isActive: user.isActive,
        usage: user.usage
      },
      token
    });
    
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/profile', authMiddleware, (req, res) => {
  const user = req.user;
  const planDetails = SUBSCRIPTION_PLANS[user.plan];
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      apiKey: user.apiKey,
      customerId: user.customerId,
      subscriptionId: user.subscriptionId,
      isActive: user.isActive,
      usage: user.usage,
      createdAt: user.createdAt
    },
    planDetails,
    limits: {
      maxRooms: planDetails.features.maxRooms,
      maxParticipants: planDetails.features.maxParticipants,
      maxMinutes: planDetails.features.maxMinutes,
      currentRooms: user.usage.currentMonthRooms,
      currentMinutes: user.usage.currentMonthMinutes
    }
  });
});

router.post('/regenerate-api-key', authMiddleware, (req, res) => {
  try {
    const { generateApiKey, updateUser } = require('../middleware/auth');
    const newApiKey = generateApiKey();
    
    const updatedUser = updateUser(req.user.email, { apiKey: newApiKey });
    
    res.json({
      message: 'API key regenerated successfully',
      apiKey: newApiKey
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plans', (req, res) => {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features
  }));
  
  res.json({ plans });
});

module.exports = router;