const express = require('express');
const router = express.Router();
const {
  stripe,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  getCustomerSubscriptions,
  createPaymentIntent,
  SUBSCRIPTION_PLANS
} = require('../config/stripe');
const {
  authMiddleware,
  updateUser
} = require('../middleware/auth');

router.post('/create-subscription', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;
    
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    
    if (!user.customerId) {
      return res.status(400).json({ error: 'Customer ID not found. Please contact support.' });
    }
    
    const plan = SUBSCRIPTION_PLANS[planId];
    const subscription = await createSubscription(user.customerId, plan.priceId);
    
    updateUser(user.email, {
      subscriptionId: subscription.id,
      plan: planId
    });
    
    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status
    });
    
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/update-subscription', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;
    
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    
    if (!user.subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    const plan = SUBSCRIPTION_PLANS[planId];
    const subscription = await updateSubscription(user.subscriptionId, plan.priceId);
    
    updateUser(user.email, { plan: planId });
    
    res.json({
      message: 'Subscription updated successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end
      }
    });
    
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    const subscription = await cancelSubscription(user.subscriptionId);
    
    updateUser(user.email, {
      isActive: false
    });
    
    res.json({
      message: 'Subscription canceled successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        canceled_at: subscription.canceled_at
      }
    });
    
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/subscriptions', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.customerId) {
      return res.json({ subscriptions: [] });
    }
    
    const subscriptions = await getCustomerSubscriptions(user.customerId);
    
    res.json({
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        plan: sub.items.data[0]?.price.id,
        amount: sub.items.data[0]?.price.unit_amount / 100,
        currency: sub.items.data[0]?.price.currency
      }))
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-payment-intent', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const paymentIntent = await createPaymentIntent(amount, 'usd', user.customerId);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    });
    
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/usage', authMiddleware, (req, res) => {
  const user = req.user;
  const plan = SUBSCRIPTION_PLANS[user.plan];
  
  if (!plan) {
    return res.status(400).json({ error: 'Invalid subscription plan' });
  }
  
  const now = new Date();
  const resetDate = user.usage.resetDate;
  
  res.json({
    usage: {
      currentMonthMinutes: user.usage.currentMonthMinutes,
      currentMonthRooms: user.usage.currentMonthRooms,
      resetDate: resetDate,
      daysUntilReset: Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24))
    },
    limits: {
      maxMinutes: plan.features.maxMinutes,
      maxRooms: plan.features.maxRooms,
      maxParticipants: plan.features.maxParticipants
    },
    remaining: {
      minutes: Math.max(0, plan.features.maxMinutes - user.usage.currentMonthMinutes),
      rooms: Math.max(0, plan.features.maxRooms - user.usage.currentMonthRooms)
    },
    percentUsed: {
      minutes: Math.round((user.usage.currentMonthMinutes / plan.features.maxMinutes) * 100),
      rooms: Math.round((user.usage.currentMonthRooms / plan.features.maxRooms) * 100)
    }
  });
});

router.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log('Received webhook event:', event.type);
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        handleSubscriptionUpdate(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
  
  res.json({ received: true });
});

function handleSubscriptionUpdate(subscription) {
  const { users } = require('../middleware/auth');
  
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  
  for (const [email, user] of users.entries()) {
    if (user.customerId === customerId) {
      updateUser(email, {
        subscriptionId: subscriptionId,
        isActive: status === 'active' || status === 'trialing'
      });
      console.log(`Updated subscription for user ${email}: ${status}`);
      break;
    }
  }
}

function handleSubscriptionDeleted(subscription) {
  const { users } = require('../middleware/auth');
  
  const customerId = subscription.customer;
  
  for (const [email, user] of users.entries()) {
    if (user.customerId === customerId) {
      updateUser(email, {
        isActive: false,
        subscriptionId: null
      });
      console.log(`Deactivated subscription for user ${email}`);
      break;
    }
  }
}

function handlePaymentSucceeded(invoice) {
  const { users } = require('../middleware/auth');
  
  const customerId = invoice.customer;
  
  for (const [email, user] of users.entries()) {
    if (user.customerId === customerId) {
      updateUser(email, { isActive: true });
      console.log(`Payment succeeded for user ${email}`);
      break;
    }
  }
}

function handlePaymentFailed(invoice) {
  const { users } = require('../middleware/auth');
  
  const customerId = invoice.customer;
  
  for (const [email, user] of users.entries()) {
    if (user.customerId === customerId) {
      console.log(`Payment failed for user ${email}`);
      break;
    }
  }
}

module.exports = router;