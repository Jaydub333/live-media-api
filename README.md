# Multimedia API with Stripe Billing

A complete API solution for easily adding multimedia features (video chat and voice chat) to web applications, now with integrated Stripe subscription billing.

## Features

- 🎥 **Video Chat**: Full-featured video calling with multiple participants
- 🎤 **Voice Chat**: Crystal clear voice communication  
- 💳 **Stripe Billing**: Monthly subscription plans with usage tracking
- 🔐 **Authentication**: JWT-based API authentication with API keys
- 📊 **Usage Limits**: Automatic enforcement of plan limits (rooms, minutes, participants)
- 🏠 **Room Management**: Create, join, and manage chat rooms
- 🔧 **Easy Integration**: Simple SDK for quick implementation
- 🌐 **WebRTC**: Peer-to-peer communication for optimal performance
- 📱 **Cross-Platform**: Works on desktop and mobile browsers
- 📈 **Dashboard**: Web-based subscription management dashboard

## Subscription Plans

### Starter Plan - $29/month
- ✅ 5 rooms per month
- ✅ 10 max participants per room
- ✅ 1,000 minutes per month
- ✅ HD video quality
- ✅ Email support

### Professional Plan - $99/month
- ✅ 25 rooms per month
- ✅ 50 max participants per room
- ✅ 5,000 minutes per month
- ✅ HD video quality
- ✅ Priority email support
- ✅ Custom branding

### Enterprise Plan - $299/month
- ✅ 100 rooms per month
- ✅ 200 max participants per room
- ✅ 20,000 minutes per month
- ✅ HD video quality
- ✅ Phone & email support
- ✅ Custom branding
- ✅ White label solution
- ✅ Dedicated support

## Quick Start

### 1. Install Dependencies

```bash
cd multimedia-api
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and add your Stripe keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 4. Access the Dashboard

Open your browser to `http://localhost:3000/dashboard/` to:
- Register a new account
- Subscribe to a plan
- Manage your API keys
- Monitor usage

### 5. Try the Examples

After subscribing, you can try the examples:
- Video Chat: `examples/video-chat.html`
- Voice Chat: `examples/voice-chat.html`

## Authentication

All API endpoints (except auth routes) require authentication via:

**Option 1: API Key Header**
```bash
curl -H "X-API-Key: mk_your_api_key_here" http://localhost:3000/rooms
```

**Option 2: Bearer Token**
```bash
curl -H "Authorization: Bearer your_jwt_token" http://localhost:3000/rooms
```

## API Endpoints

### Authentication API

- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login to account
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/regenerate-api-key` - Generate new API key (requires auth)
- `GET /api/auth/plans` - List available subscription plans

### Billing API

- `POST /api/billing/create-subscription` - Create new subscription (requires auth)
- `POST /api/billing/update-subscription` - Update subscription plan (requires auth)
- `POST /api/billing/cancel-subscription` - Cancel subscription (requires auth)
- `GET /api/billing/subscriptions` - List user subscriptions (requires auth)
- `GET /api/billing/usage` - Get current usage statistics (requires auth)
- `POST /api/billing/webhooks` - Stripe webhook endpoint

### Multimedia API

- `GET /` - API information
- `GET /rooms` - List all active rooms (requires auth + active subscription)
- `POST /rooms` - Create a new room (requires auth + active subscription + within limits)
- `GET /rooms/:id` - Get room details (requires auth + active subscription)
- `DELETE /rooms/:id` - Delete a room (requires auth + active subscription)

### WebSocket Events

#### Client to Server
- `join-room` - Join a chat room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer  
- `ice-candidate` - Send ICE candidate
- `toggle-media` - Toggle audio/video

#### Server to Client
- `joined-room` - Successfully joined room
- `user-joined` - New user joined room
- `user-left` - User left room
- `offer` - Received WebRTC offer
- `answer` - Received WebRTC answer
- `ice-candidate` - Received ICE candidate
- `user-media-toggled` - User toggled media
- `error` - Error occurred

## Using the SDK with Authentication

### Basic Setup

```javascript
const MultimediaSDK = require('./src/client/multimedia-sdk');

// Create instance
const sdk = new MultimediaSDK('http://localhost:3000');

// Set API key (get this from dashboard)
sdk.apiKey = 'mk_your_api_key_here';

// Connect to server
await sdk.connect();
```

### Account Management

```javascript
// Register new account
const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secure_password',
        plan: 'professional'
    })
});

const { user, token } = await response.json();

// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'john@example.com',
        password: 'secure_password'
    })
});
```

### Subscription Management

```javascript
// Create subscription
const subscriptionResponse = await fetch('http://localhost:3000/api/billing/create-subscription', {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ planId: 'professional' })
});

// Check usage
const usageResponse = await fetch('http://localhost:3000/api/billing/usage', {
    headers: { 'Authorization': `Bearer ${token}` }
});

const usage = await usageResponse.json();
console.log(`Used ${usage.usage.currentMonthMinutes} of ${usage.limits.maxMinutes} minutes`);
```

### Video Chat with Authentication

```javascript
// Initialize SDK with API key
const sdk = new MultimediaSDK('http://localhost:3000');
sdk.apiKey = 'mk_your_api_key_here'; // Get from dashboard

await sdk.connect();

// Create or join room (automatically tracked for billing)
const room = await sdk.createRoom('My Video Room');
await sdk.joinRoom(room.id, 'Your Name', 'video');

// Start video call
const localStream = await sdk.startVideoCall();
document.getElementById('localVideo').srcObject = localStream;

// Handle remote streams
sdk.on('remoteStream', (data) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = data.stream;
    remoteVideo.autoplay = true;
    document.body.appendChild(remoteVideo);
});
```

## React Integration with Authentication

```jsx
import React, { useEffect, useState } from 'react';
import MultimediaSDK from './multimedia-sdk';

function AuthenticatedVideoChat({ apiKey }) {
    const [sdk, setSdk] = useState(null);
    const [usage, setUsage] = useState(null);
    
    useEffect(() => {
        const initializeSDK = async () => {
            const newSdk = new MultimediaSDK('http://localhost:3000');
            newSdk.apiKey = apiKey;
            
            await newSdk.connect();
            setSdk(newSdk);
            
            // Load usage data
            const usageResponse = await fetch('/api/billing/usage', {
                headers: { 'X-API-Key': apiKey }
            });
            const usageData = await usageResponse.json();
            setUsage(usageData);
        };
        
        if (apiKey) {
            initializeSDK();
        }
        
        return () => {
            if (sdk) sdk.leaveRoom();
        };
    }, [apiKey]);
    
    return (
        <div>
            {usage && (
                <div className="usage-info">
                    <p>Minutes used: {usage.usage.currentMonthMinutes}/{usage.limits.maxMinutes}</p>
                    <p>Rooms used: {usage.usage.currentMonthRooms}/{usage.limits.maxRooms}</p>
                </div>
            )}
            {/* Video chat UI */}
        </div>
    );
}
```

## Stripe Webhook Setup

1. In your Stripe dashboard, go to Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhooks`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to your `.env` file

## Usage Tracking

The API automatically tracks:
- **Room Creation**: Each room created counts toward monthly limit
- **Minutes Used**: Time spent in active calls (estimated)
- **Participants**: Enforced in real-time per room

Limits reset monthly based on subscription date.

## Error Handling

```javascript
// Usage limit exceeded
{
    "error": "Room limit exceeded",
    "limit": 5,
    "current": 5
}

// Subscription required
{
    "error": "Active subscription required",
    "message": "Please subscribe to use the multimedia API features."
}

// Invalid API key
{
    "error": "Invalid API key"
}
```

## Development Setup

### Create Stripe Products (First Time)

```javascript
// Run this once to create products in Stripe
const { createStripeProducts } = require('./src/config/stripe');
createStripeProducts();
```

### Test Webhooks Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/billing/webhooks

# Test webhook
stripe trigger customer.subscription.created
```

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use real Stripe keys (not test keys)
3. Configure HTTPS for WebRTC
4. Set up proper CORS origins
5. Use strong JWT secret
6. Configure webhook URL with your domain
7. Consider using Redis for session storage instead of in-memory

## Security Considerations

- ✅ JWT tokens expire in 7 days
- ✅ API keys are prefixed and random
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Input validation
- ✅ Webhook signature verification

## Browser Support

- Chrome 60+
- Firefox 60+  
- Safari 12+
- Edge 79+

WebRTC requires HTTPS in production.

## License

MIT License - feel free to use in your projects!

## Support

Need help? Check out:
1. The subscription dashboard at `/dashboard/`
2. API documentation in this README
3. Example implementations in `/examples/`

For technical support, subscribers get priority help based on their plan level.