// Test Stripe webhook functionality
// Run this in browser console after setting up webhook

async function testWebhook() {
    const webhookUrl = 'https://sea-turtle-app-e7q3a.ondigitalocean.app/api/billing/webhooks';
    
    console.log('🧪 Testing webhook endpoint...');
    
    try {
        // Test webhook endpoint accessibility
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'test-signature'
            },
            body: JSON.stringify({
                id: 'test_event',
                object: 'event',
                type: 'customer.subscription.created',
                data: { object: { id: 'test_subscription' } }
            })
        });
        
        console.log('📡 Webhook endpoint response:', response.status);
        
        if (response.status === 400) {
            console.log('✅ Webhook endpoint is accessible (signature validation working)');
        } else {
            console.log('ℹ️  Response:', await response.text());
        }
        
    } catch (error) {
        console.error('❌ Webhook test failed:', error);
    }
}

// testWebhook();