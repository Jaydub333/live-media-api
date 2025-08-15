class MultimediaSDK {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.localStream = null;
    this.peerConnections = new Map();
    this.remoteStreams = new Map();
    this.roomId = null;
    this.userId = null;
    
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    this.events = {
      onJoinedRoom: null,
      onUserJoined: null,
      onUserLeft: null,
      onRemoteStream: null,
      onError: null,
      onMediaToggled: null
    };
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl);
      
      this.socket.on('connect', () => {
        console.log('Connected to multimedia server');
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        reject(error);
      });
      
      this.setupSocketListeners();
    });
  }
  
  setupSocketListeners() {
    this.socket.on('joined-room', (data) => {
      this.roomId = data.roomId;
      this.userId = data.user.id;
      
      if (this.events.onJoinedRoom) {
        this.events.onJoinedRoom(data);
      }
      
      data.existingUsers.forEach(user => {
        this.createPeerConnection(user.id);
      });
    });
    
    this.socket.on('user-joined', async (user) => {
      await this.createPeerConnection(user.id, true);
      
      if (this.events.onUserJoined) {
        this.events.onUserJoined(user);
      }
    });
    
    this.socket.on('user-left', (data) => {
      this.removePeerConnection(data.userId);
      
      if (this.events.onUserLeft) {
        this.events.onUserLeft(data);
      }
    });
    
    this.socket.on('offer', async (data) => {
      const pc = this.peerConnections.get(data.sender);
      if (pc) {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.socket.emit('answer', {
          answer: answer,
          target: data.sender
        });
      }
    });
    
    this.socket.on('answer', async (data) => {
      const pc = this.peerConnections.get(data.sender);
      if (pc) {
        await pc.setRemoteDescription(data.answer);
      }
    });
    
    this.socket.on('ice-candidate', async (data) => {
      const pc = this.peerConnections.get(data.sender);
      if (pc && data.candidate) {
        await pc.addIceCandidate(data.candidate);
      }
    });
    
    this.socket.on('user-media-toggled', (data) => {
      if (this.events.onMediaToggled) {
        this.events.onMediaToggled(data);
      }
    });
    
    this.socket.on('error', (error) => {
      if (this.events.onError) {
        this.events.onError(error);
      }
    });
  }
  
  async createPeerConnection(userId, createOffer = false) {
    const pc = new RTCPeerConnection(this.configuration);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          target: userId
        });
      }
    };
    
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      if (this.events.onRemoteStream) {
        this.events.onRemoteStream({ userId, stream: remoteStream });
      }
    };
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    this.peerConnections.set(userId, pc);
    
    if (createOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        offer: offer,
        target: userId
      });
    }
  }
  
  removePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    this.remoteStreams.delete(userId);
  }
  
  async createRoom(name, maxUsers = 10) {
    const response = await fetch(`${this.serverUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, maxUsers })
    });
    
    return await response.json();
  }
  
  async getRooms() {
    const response = await fetch(`${this.serverUrl}/rooms`);
    return await response.json();
  }
  
  async getRoomDetails(roomId) {
    const response = await fetch(`${this.serverUrl}/rooms/${roomId}`);
    return await response.json();
  }
  
  async joinRoom(roomId, userName, mediaType = 'video') {
    if (!this.socket) {
      throw new Error('Not connected to server. Call connect() first.');
    }
    
    this.socket.emit('join-room', { roomId, userName, mediaType });
  }
  
  async startVideoCall(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.peerConnections.forEach(pc => {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      });
      
      return this.localStream;
    } catch (error) {
      throw new Error(`Failed to get user media: ${error.message}`);
    }
  }
  
  async startVoiceCall() {
    return await this.startVideoCall({ video: false, audio: true });
  }
  
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        this.socket.emit('toggle-media', {
          mediaEnabled: enabled,
          mediaType: 'video'
        });
      }
    }
  }
  
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        this.socket.emit('toggle-media', {
          mediaEnabled: enabled,
          mediaType: 'audio'
        });
      }
    }
  }
  
  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }
  
  leaveRoom() {
    this.endCall();
    if (this.socket) {
      this.socket.disconnect();
    }
    this.roomId = null;
    this.userId = null;
  }
  
  on(event, callback) {
    if (this.events.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.events[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultimediaSDK;
} else if (typeof window !== 'undefined') {
  window.MultimediaSDK = MultimediaSDK;
}