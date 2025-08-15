require('dotenv').config();
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_PLANS = {
  starter: {
    priceId: 'price_starter', // Replace with actual Stripe price ID
    name: 'Starter Plan',
    price: 29,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRooms: 5,
      maxParticipants: 10,
      maxMinutes: 1000,
      videoQuality: 'HD',
      support: 'Email'
    }
  },
  professional: {
    priceId: 'price_professional', // Replace with actual Stripe price ID
    name: 'Professional Plan',
    price: 99,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRooms: 25,
      maxParticipants: 50,
      maxMinutes: 5000,
      videoQuality: 'HD',
      support: 'Priority Email',
      customBranding: true
    }
  },
  enterprise: {
    priceId: 'price_enterprise', // Replace with actual Stripe price ID
    name: 'Enterprise Plan',
    price: 299,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRooms: 100,
      maxParticipants: 200,
      maxMinutes: 20000,
      videoQuality: 'HD',
      support: 'Phone & Email',
      customBranding: true,
      whiteLabel: true,
      dedicatedSupport: true
    }
  }
};

async function createStripeProducts() {
  try {
    for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      const product = await stripe.products.create({
        name: plan.name,
        description: `Multimedia API ${plan.name} - ${plan.features.maxRooms} rooms, ${plan.features.maxParticipants} participants`,
        metadata: {
          planKey: planKey,
          maxRooms: plan.features.maxRooms.toString(),
          maxParticipants: plan.features.maxParticipants.toString(),
          maxMinutes: plan.features.maxMinutes.toString()
        }
      });

      const price = await stripe.prices.create({
        unit_amount: plan.price * 100,
        currency: plan.currency,
        recurring: {
          interval: plan.interval
        },
        product: product.id,
      });

      console.log(`Created product ${plan.name} with price ID: ${price.id}`);
    }
  } catch (error) {
    console.error('Error creating Stripe products:', error);
  }
}

async function createCustomer(email, name, metadata = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

async function createSubscription(customerId, priceId, trialDays = 14) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

async function cancelSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

async function updateSubscription(subscriptionId, priceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations'
    });
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function getCustomerSubscriptions(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all'
    });
    return subscriptions;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
}

async function createPaymentIntent(amount, currency = 'usd', customerId) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

module.exports = {
  stripe,
  SUBSCRIPTION_PLANS,
  createStripeProducts,
  createCustomer,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  getCustomerSubscriptions,
  createPaymentIntent
};