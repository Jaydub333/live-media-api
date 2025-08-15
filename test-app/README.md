# TeamChat Pro - Demo App

A complete demonstration of how to integrate the Live Media API into a real web application.

## 🎯 What This Demonstrates

This demo app shows developers exactly how to:

- **Register users** and get API keys via Live Media API
- **Authenticate** with API keys
- **Create video/voice chat rooms** 
- **Track usage statistics** in real-time
- **Handle billing and subscriptions**
- **Build a professional UI** around the API

## 🚀 Live Demo

**Demo URL**: https://sea-turtle-app-e7q3a.ondigitalocean.app/demo/

## 📋 Features Demonstrated

### 1. **User Onboarding**
- Account creation with plan selection
- API key generation and management
- Authentication flow

### 2. **Video Chat Integration**
- Real-time video calls
- Voice-only calls
- Media controls (mute/unmute)
- Participant management

### 3. **Usage Analytics**
- Real-time usage tracking
- Plan limits monitoring
- API endpoint testing

### 4. **Professional UI/UX**
- Responsive design
- Error handling
- Status notifications
- Multi-tab interface

## 💻 Code Structure

```
test-app/
├── index.html      # Main demo interface
├── app.js          # JavaScript integration logic
└── README.md       # This documentation
```

## 🔧 Key Integration Points

### API Registration
```javascript
const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password, plan })
});
```

### Room Creation
```javascript
const room = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: JSON.stringify({ name: roomName })
});
```

### Usage Tracking
```javascript
const usage = await fetch(`${API_BASE}/api/billing/usage`, {
    headers: { 'X-API-Key': apiKey }
});
```

## 🎨 Customization

This demo can be easily customized:

- **Branding**: Update colors, logos, and text
- **Features**: Add/remove functionality
- **UI**: Modify the interface design
- **Integration**: Connect to your existing user system

## 💡 Business Value

This demo shows potential customers:

- **How easy** the integration process is
- **What features** are available
- **How professional** the end result looks
- **Real-time capabilities** in action

Perfect for sales demos, developer onboarding, and proof-of-concepts!

## 🔗 Related Links

- **Live API**: https://sea-turtle-app-e7q3a.ondigitalocean.app/
- **Dashboard**: https://sea-turtle-app-e7q3a.ondigitalocean.app/dashboard/
- **Documentation**: See main README.md