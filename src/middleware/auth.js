require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

const users = new Map();
const apiKeys = new Map();

function generateApiKey() {
  return 'mk_' + require('crypto').randomBytes(32).toString('hex');
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function createUser(email, password, name, plan = 'starter') {
  if (users.has(email)) {
    throw new Error('User already exists');
  }

  const userId = require('uuid').v4();
  const apiKey = generateApiKey();
  
  const user = {
    id: userId,
    email,
    password: hashPassword(password),
    name,
    plan,
    apiKey,
    subscriptionId: null,
    customerId: null,
    createdAt: new Date(),
    isActive: false,
    usage: {
      currentMonthMinutes: 0,
      currentMonthRooms: 0,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  };

  users.set(email, user);
  apiKeys.set(apiKey, user);
  
  return user;
}

function authenticateUser(email, password) {
  const user = users.get(email);
  if (!user || !comparePassword(password, user.password)) {
    throw new Error('Invalid credentials');
  }
  return user;
}

function getUserByApiKey(apiKey) {
  return apiKeys.get(apiKey);
}

function getUserByEmail(email) {
  return users.get(email);
}

function updateUser(email, updates) {
  const user = users.get(email);
  if (!user) {
    throw new Error('User not found');
  }
  
  Object.assign(user, updates);
  users.set(email, user);
  
  if (updates.apiKey) {
    apiKeys.delete(user.apiKey);
    apiKeys.set(updates.apiKey, user);
  }
  
  return user;
}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    const user = getUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ error: 'Subscription required. Please activate your subscription.' });
    }
    
    req.user = user;
    return next();
  }
  
  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = getUserByEmail(decoded.email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    return next();
  }
  
  return res.status(401).json({ error: 'Authentication required' });
};

const subscriptionMiddleware = (req, res, next) => {
  const user = req.user;
  
  if (!user.isActive) {
    return res.status(403).json({ 
      error: 'Active subscription required',
      message: 'Please subscribe to use the multimedia API features.'
    });
  }
  
  next();
};

const usageLimitMiddleware = (type) => {
  return (req, res, next) => {
    const user = req.user;
    const { SUBSCRIPTION_PLANS } = require('../config/stripe');
    const plan = SUBSCRIPTION_PLANS[user.plan];
    
    if (!plan) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    const now = new Date();
    if (now > user.usage.resetDate) {
      user.usage.currentMonthMinutes = 0;
      user.usage.currentMonthRooms = 0;
      user.usage.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
    
    switch (type) {
      case 'rooms':
        if (user.usage.currentMonthRooms >= plan.features.maxRooms) {
          return res.status(429).json({ 
            error: 'Room limit exceeded',
            limit: plan.features.maxRooms,
            current: user.usage.currentMonthRooms
          });
        }
        break;
        
      case 'minutes':
        if (user.usage.currentMonthMinutes >= plan.features.maxMinutes) {
          return res.status(429).json({ 
            error: 'Monthly minutes limit exceeded',
            limit: plan.features.maxMinutes,
            current: user.usage.currentMonthMinutes
          });
        }
        break;
    }
    
    next();
  };
};

module.exports = {
  generateApiKey,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  createUser,
  authenticateUser,
  getUserByApiKey,
  getUserByEmail,
  updateUser,
  authMiddleware,
  subscriptionMiddleware,
  usageLimitMiddleware,
  users,
  apiKeys
};