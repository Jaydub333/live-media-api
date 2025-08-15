// Test script for the live multimedia API
const API_BASE = 'https://sea-turtle-app-e7q3a.ondigitalocean.app/api';

async function testAPI() {
    console.log('🚀 Testing Multimedia API...\n');
    
    try {
        // Test 1: Get subscription plans
        console.log('1. Testing subscription plans...');
        const plansResponse = await fetch(`${API_BASE}/auth/plans`);
        const plans = await plansResponse.json();
        console.log('✅ Plans loaded:', plans.plans?.length || 0, 'plans available');
        
        // Test 2: Test registration
        console.log('\n2. Testing user registration...');
        const testUser = {
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'testpass123',
            plan: 'starter'
        };
        
        const registerResponse = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        
        if (registerResponse.ok) {
            const registerData = await registerResponse.json();
            console.log('✅ User registered successfully');
            console.log('   API Key:', registerData.user?.apiKey?.substring(0, 10) + '...');
            
            // Test 3: Test authentication with API key
            console.log('\n3. Testing API key authentication...');
            const roomsResponse = await fetch(`${API_BASE.replace('/api', '')}/rooms`, {
                headers: { 'X-API-Key': registerData.user.apiKey }
            });
            
            if (roomsResponse.ok) {
                console.log('✅ API key authentication working');
            } else {
                console.log('❌ API key authentication failed:', roomsResponse.status);
            }
            
        } else {
            const error = await registerResponse.json();
            console.log('❌ Registration failed:', error.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    console.log('\n🔗 Test your API manually:');
    console.log('Dashboard: https://sea-turtle-app-e7q3a.ondigitalocean.app/dashboard/');
    console.log('Video Chat: https://sea-turtle-app-e7q3a.ondigitalocean.app/examples/video-chat.html');
    console.log('Voice Chat: https://sea-turtle-app-e7q3a.ondigitalocean.app/examples/voice-chat.html');
}

// Run in Node.js
if (typeof fetch === 'undefined') {
    // For Node.js environments
    console.log('Run this in browser console or with node-fetch installed');
} else {
    testAPI();
}