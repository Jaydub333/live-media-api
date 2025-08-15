// TeamChat Pro - Demo App using Live Media API
const API_BASE = 'https://sea-turtle-app-e7q3a.ondigitalocean.app';

let sdk = null;
let currentUser = null;
let apiKey = null;
let localStream = null;
let videoEnabled = true;
let audioEnabled = true;
let participantCount = 1;

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Show selected tab
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
}

// Show status messages
function showStatus(elementId, message, type = 'success') {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 5000);
}

// Demo signup flow
async function signupDemo() {
    const email = document.getElementById('signup-email').value;
    const name = document.getElementById('signup-name').value;
    const plan = document.getElementById('signup-plan').value;
    
    if (!email || !name) {
        showStatus('signup-status', 'Please fill in all fields', 'error');
        return;
    }
    
    showStatus('signup-status', 'Creating your account...', 'warning');
    
    try {
        // Register user via API
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                name, 
                password: 'demo123', // Demo password
                plan 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            apiKey = data.user.apiKey;
            currentUser = data.user;
            
            showStatus('signup-status', 
                `✅ Account created! Your API key: ${apiKey.substring(0, 20)}...`, 
                'success'
            );
            
            // Show API key in the existing key field
            document.getElementById('existing-api-key').value = apiKey;
            
            // Auto-switch to video tab
            setTimeout(() => {
                showTab('video');
                document.querySelector('.tab:nth-child(2)').click();
            }, 2000);
            
        } else {
            // Handle existing user
            if (data.error.includes('already exists')) {
                showStatus('signup-status', 
                    '⚠️ Email already registered. Try logging in or use different email.', 
                    'warning'
                );
            } else {
                showStatus('signup-status', `❌ ${data.error}`, 'error');
            }
        }
        
    } catch (error) {
        showStatus('signup-status', `❌ Connection failed: ${error.message}`, 'error');
    }
}

// Use existing API key
async function useExistingKey() {
    const key = document.getElementById('existing-api-key').value;
    
    if (!key || !key.startsWith('mk_')) {
        showStatus('signup-status', '❌ Invalid API key format. Should start with mk_', 'error');
        return;
    }
    
    apiKey = key;
    showStatus('signup-status', '✅ API key loaded! You can now use video chat.', 'success');
    
    // Test API key by loading profile
    try {
        const response = await fetch(`${API_BASE}/api/auth/profile`, {
            headers: { 'X-API-Key': apiKey }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showStatus('signup-status', 
                `✅ Welcome back, ${data.user.name}! Plan: ${data.user.plan}`, 
                'success'
            );
        }
    } catch (error) {
        console.log('Profile load failed, but API key accepted');
    }
}

// Initialize multimedia SDK
async function initSDK() {
    if (!apiKey) {
        showStatus('video-status', '❌ No API key. Please get one from the signup tab first.', 'error');
        return false;
    }
    
    try {
        // Create SDK instance (using our custom implementation)
        sdk = {
            apiKey: apiKey,
            rooms: new Map(),
            
            async createRoom(name) {
                const response = await fetch(`${API_BASE}/rooms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({ name })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create room');
                }
                
                return await response.json();
            },
            
            async getRooms() {
                const response = await fetch(`${API_BASE}/rooms`, {
                    headers: { 'X-API-Key': apiKey }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to get rooms');
                }
                
                return await response.json();
            }
        };
        
        return true;
        
    } catch (error) {
        showStatus('video-status', `❌ SDK initialization failed: ${error.message}`, 'error');
        return false;
    }
}

// Join video call
async function joinVideoCall() {
    const username = document.getElementById('video-username').value;
    const roomName = document.getElementById('video-room').value;
    
    if (!username || !roomName) {
        showStatus('video-status', '❌ Please enter your name and room name', 'error');
        return;
    }
    
    if (!(await initSDK())) return;
    
    showStatus('video-status', '🔄 Creating room and starting video...', 'warning');
    
    try {
        // Create room via API
        const room = await sdk.createRoom(roomName);
        
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        // Show video interface
        document.getElementById('video-login-form').classList.add('hidden');
        document.getElementById('video-interface').classList.remove('hidden');
        
        // Display local video
        displayLocalVideo(localStream);
        
        showStatus('video-status', 
            `✅ Connected to "${roomName}"! Room ID: ${room.id}`, 
            'success'
        );
        
        // Simulate remote participant joining after 3 seconds
        setTimeout(() => {
            simulateRemoteParticipant();
        }, 3000);
        
    } catch (error) {
        showStatus('video-status', `❌ Failed to join: ${error.message}`, 'error');
    }
}

// Join voice call
async function joinVoiceCall() {
    const username = document.getElementById('video-username').value;
    const roomName = document.getElementById('video-room').value;
    
    if (!username || !roomName) {
        showStatus('video-status', '❌ Please enter your name and room name', 'error');
        return;
    }
    
    if (!(await initSDK())) return;
    
    showStatus('video-status', '🔄 Creating room and starting voice call...', 'warning');
    
    try {
        const room = await sdk.createRoom(roomName);
        
        // Get audio only
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: false, 
            audio: true 
        });
        
        document.getElementById('video-login-form').classList.add('hidden');
        document.getElementById('video-interface').classList.remove('hidden');
        
        // Hide video toggle for voice-only
        document.getElementById('toggle-video').style.display = 'none';
        
        showStatus('video-status', 
            `✅ Voice call connected to "${roomName}"! 🎤`, 
            'success'
        );
        
        // Simulate remote participant
        setTimeout(() => {
            participantCount = 2;
            document.getElementById('participants-count').textContent = participantCount;
            showStatus('video-status', '🎤 Demo User 2 joined the voice call', 'success');
        }, 2000);
        
    } catch (error) {
        showStatus('video-status', `❌ Failed to join voice call: ${error.message}`, 'error');
    }
}

// Display local video
function displayLocalVideo(stream) {
    const container = document.getElementById('video-container');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper local-video';
    wrapper.id = 'local-video-wrapper';
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    
    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = 'You';
    
    wrapper.appendChild(video);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
}

// Simulate remote participant (for demo purposes)
function simulateRemoteParticipant() {
    const container = document.getElementById('video-container');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = 'remote-video-1';
    
    // Create a canvas to simulate remote video
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 225;
    canvas.style.width = '300px';
    canvas.style.height = '225px';
    
    const ctx = canvas.getContext('2d');
    
    // Animate fake video feed
    let hue = 0;
    setInterval(() => {
        hue = (hue + 1) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add fake "Demo User 2" text
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Demo User 2', canvas.width/2, canvas.height/2);
        ctx.fillText('(Simulated)', canvas.width/2, canvas.height/2 + 30);
    }, 100);
    
    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = 'Demo User 2';
    
    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
    
    // Update participant count
    participantCount = 2;
    document.getElementById('participants-count').textContent = participantCount;
    
    showStatus('video-status', '👤 Demo User 2 joined the call', 'success');
}

// Toggle video
function toggleVideo() {
    if (!localStream) return;
    
    videoEnabled = !videoEnabled;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = videoEnabled;
    }
    
    const btn = document.getElementById('toggle-video');
    btn.textContent = videoEnabled ? '📹 Video On' : '📹 Video Off';
    btn.className = videoEnabled ? 'btn btn-success' : 'btn btn-secondary';
}

// Toggle audio
function toggleAudio() {
    if (!localStream) return;
    
    audioEnabled = !audioEnabled;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = audioEnabled;
    }
    
    const btn = document.getElementById('toggle-audio');
    btn.textContent = audioEnabled ? '🎤 Audio On' : '🎤 Muted';
    btn.className = audioEnabled ? 'btn btn-success' : 'btn btn-secondary';
}

// End call
function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Reset interface
    document.getElementById('video-interface').classList.add('hidden');
    document.getElementById('video-login-form').classList.remove('hidden');
    document.getElementById('video-container').innerHTML = '';
    document.getElementById('toggle-video').style.display = 'inline-block';
    
    participantCount = 1;
    document.getElementById('participants-count').textContent = participantCount;
    
    showStatus('video-status', '📞 Call ended', 'warning');
}

// Load usage stats
async function loadUsageStats() {
    if (!apiKey) {
        showStatus('stats-status', '❌ No API key. Please get one from the signup tab.', 'error');
        return;
    }
    
    const btn = document.getElementById('load-stats-btn');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/api/billing/usage`, {
            headers: { 'X-API-Key': apiKey }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('rooms-used').textContent = 
                `${data.usage.currentMonthRooms}/${data.limits.maxRooms}`;
            document.getElementById('minutes-used').textContent = 
                `${data.usage.currentMonthMinutes}/${data.limits.maxMinutes}`;
                
            // Get plan name
            if (currentUser) {
                document.getElementById('plan-type').textContent = 
                    currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1);
            }
            
            showStatus('stats-status', '✅ Usage stats loaded successfully!', 'success');
            
        } else {
            const error = await response.json();
            showStatus('stats-status', `❌ ${error.error}`, 'error');
        }
        
    } catch (error) {
        showStatus('stats-status', `❌ Failed to load stats: ${error.message}`, 'error');
    }
    
    btn.textContent = 'Load My Usage Stats';
    btn.disabled = false;
}

// Test API endpoints
async function testAPI(endpoint) {
    const responseEl = document.getElementById('api-response');
    responseEl.textContent = 'Loading...';
    
    if (!apiKey && endpoint !== 'plans') {
        responseEl.textContent = '❌ API key required for this endpoint. Get one from the signup tab.';
        return;
    }
    
    try {
        let url, headers = {};
        
        switch (endpoint) {
            case 'plans':
                url = `${API_BASE}/api/auth/plans`;
                break;
            case 'profile':
                url = `${API_BASE}/api/auth/profile`;
                headers['X-API-Key'] = apiKey;
                break;
            case 'rooms':
                url = `${API_BASE}/rooms`;
                headers['X-API-Key'] = apiKey;
                break;
            case 'usage':
                url = `${API_BASE}/api/billing/usage`;
                headers['X-API-Key'] = apiKey;
                break;
        }
        
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        responseEl.textContent = `HTTP ${response.status}\n\n` + 
                                JSON.stringify(data, null, 2);
        
    } catch (error) {
        responseEl.textContent = `❌ Error: ${error.message}`;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎥 TeamChat Pro Demo App Loaded');
    console.log('📡 API Endpoint:', API_BASE);
    
    // Auto-fill demo data
    document.getElementById('signup-email').value = `demo${Date.now()}@example.com`;
    document.getElementById('signup-name').value = 'Demo Company';
});