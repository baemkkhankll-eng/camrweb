// Configuration
const SERVER_URL = window.location.origin;
const STUN_SERVER = 'stun:stun.l.google.com:19302';

// State
let socket;
let localStream;
let peerConnection;
let currentRoom = null;
let currentUsername = null;
let currentProfilePicture = null;
let token = localStorage.getItem('token');
let uploadedProfileUrl = null;
let selectedCountry = 'all';
let settings = {
    autoMatch: true,
    soundNotifications: true,
    videoEnabled: true,
    audioEnabled: true,
    language: 'th'
};
let localMediaState = {
    video: true,
    audio: true
};
let remoteMediaState = {
    video: true,
    audio: true
};

// DOM Elements
const authPage = document.getElementById('auth-page');
const chatPage = document.getElementById('chat-page');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const currentUsernameEl = document.getElementById('current-username');
const currentProfileEl = document.getElementById('current-profile');
const localProfileEl = document.getElementById('local-profile');
const partnerProfileEl = document.getElementById('partner-profile');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const partnerLabel = document.getElementById('partner-label');
const findMatchBtn = document.getElementById('find-match-btn');
const skipBtn = document.getElementById('skip-btn');
const statusMessage = document.getElementById('status-message');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileUpload = document.getElementById('profile-upload');
const profileInput = document.getElementById('profile-input');
const profilePreview = document.getElementById('profile-preview');
const waitingOverlay = document.getElementById('waiting-overlay');
const remoteStatus = document.getElementById('remote-status');
const countrySelect = document.getElementById('country-select');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const toggleCameraBtn = document.getElementById('toggle-camera');
const toggleMicBtn = document.getElementById('toggle-mic');
const mediaControls = document.getElementById('media-controls');
const localCameraStatus = document.getElementById('local-camera-status');
const localMicStatus = document.getElementById('local-mic-status');
const remoteCameraStatus = document.getElementById('remote-camera-status');
const remoteMicStatus = document.getElementById('remote-mic-status');
const remoteMediaStatus = document.getElementById('remote-media-status');

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: STUN_SERVER }
    ]
};

// ==================== Authentication ====================

// Check if user is already logged in
if (token) {
    const savedUsername = localStorage.getItem('username');
    const savedProfilePicture = localStorage.getItem('profilePicture');
    const savedSettings = localStorage.getItem('settings');
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedUsername) currentUsername = savedUsername;
    if (savedProfilePicture) currentProfilePicture = savedProfilePicture;
    if (savedSettings) settings = JSON.parse(savedSettings);
    if (savedCountry) selectedCountry = savedCountry;
    showChatPage();
    initializeSocket();
    loadSettings();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.form-content').forEach(f => f.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
        authError.textContent = '';
    });
});

// Profile picture upload
profileUpload.addEventListener('click', () => {
    profileInput.click();
});

profileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreview.src = e.target.result;
            profilePreview.classList.remove('hidden');
            document.querySelector('.upload-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        try {
            const response = await fetch(`${SERVER_URL}/api/upload-profile`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (response.ok) {
                uploadedProfileUrl = data.profilePictureUrl;
            } else {
                authError.textContent = data.error;
                // Reset preview on error
                profilePreview.classList.add('hidden');
                document.querySelector('.upload-placeholder').classList.remove('hidden');
            }
        } catch (error) {
            authError.textContent = 'Upload failed';
            profilePreview.classList.add('hidden');
            document.querySelector('.upload-placeholder').classList.remove('hidden');
        }
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            currentUsername = data.username;
            currentProfilePicture = data.profilePicture;
            localStorage.setItem('token', token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('profilePicture', data.profilePicture || '');
            showChatPage();
            initializeSocket();
        } else {
            authError.textContent = data.error;
        }
    } catch (error) {
        authError.textContent = 'Connection error';
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            currentUsername = data.username;
            currentProfilePicture = data.profilePicture;
            
            // If profile picture was uploaded, update it
            if (uploadedProfileUrl) {
                try {
                    await fetch(`${SERVER_URL}/api/user/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ profilePicture: uploadedProfileUrl })
                    });
                    currentProfilePicture = uploadedProfileUrl;
                } catch (error) {
                    console.error('Failed to update profile picture:', error);
                }
            }
            
            localStorage.setItem('token', token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('profilePicture', currentProfilePicture || '');
            showChatPage();
            initializeSocket();
        } else {
            authError.textContent = data.error;
        }
    } catch (error) {
        authError.textContent = 'Connection error';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('settings');
    localStorage.removeItem('selectedCountry');
    token = null;
    currentUsername = null;
    currentProfilePicture = null;
    uploadedProfileUrl = null;
    selectedCountry = 'all';
    settings = {
        autoMatch: true,
        soundNotifications: true,
        videoEnabled: true,
        audioEnabled: true,
        language: 'th'
    };

    if (socket) {
        socket.disconnect();
    }

    stopLocalStream();
    showAuthPage();

    // Reset profile upload
    profilePreview.classList.add('hidden');
    document.querySelector('.upload-placeholder').classList.remove('hidden');
    profileInput.value = '';
});

function showAuthPage() {
    authPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
}

function showChatPage() {
    authPage.classList.add('hidden');
    chatPage.classList.remove('hidden');
    currentUsernameEl.textContent = currentUsername || 'User';

    // Update profile pictures
    if (currentProfilePicture) {
        currentProfileEl.src = currentProfilePicture;
        localProfileEl.src = currentProfilePicture;
    } else {
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23667eea'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M12 14c-6 0-8 4-8 4v2h16v-2s-2-4-8-4z'/%3E%3C/svg%3E";
        currentProfileEl.src = defaultAvatar;
        localProfileEl.src = defaultAvatar;
    }

    // Set country selector
    countrySelect.value = selectedCountry;
}

// ==================== Socket.io ====================

function initializeSocket() {
    socket = io(SERVER_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        statusMessage.textContent = '';
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        if (error.message.includes('Authentication error')) {
            authError.textContent = 'การยืนยันตัวตนล้มเหลว กรุณาเข้าสู่ระบบใหม่';
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('profilePicture');
            localStorage.removeItem('settings');
            localStorage.removeItem('selectedCountry');
            showAuthPage();
        } else {
            statusMessage.textContent = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กำลังลองใหม่...';
        }
    });
    
    socket.on('waiting_for_match', () => {
        statusMessage.textContent = 'กำลังค้นหาคู่คุย...';
        findMatchBtn.disabled = true;
        waitingOverlay.classList.remove('hidden');
    });
    
    socket.on('match_found', ({ roomId, partnerUsername }) => {
        currentRoom = roomId;
        partnerLabel.textContent = partnerUsername;
        statusMessage.textContent = `เชื่อมต่อกับ ${partnerUsername}`;

        findMatchBtn.classList.add('hidden');
        skipBtn.classList.remove('hidden');
        waitingOverlay.classList.add('hidden');
        remoteStatus.classList.remove('hidden');
        mediaControls.classList.remove('hidden');
        remoteMediaStatus.classList.remove('hidden');

        enableChat();
        startWebRTC();
    });
    
    socket.on('room_left', () => {
        cleanupConnection();
        statusMessage.textContent = 'ออกจากห้อง คลิก "ค้นหาคู่คุย" เพื่อค้นหาคู่คุยใหม่';
        findMatchBtn.classList.remove('hidden');
        skipBtn.classList.add('hidden');
        partnerLabel.textContent = 'กำลังค้นหา...';
        waitingOverlay.classList.add('hidden');
        remoteStatus.classList.add('hidden');
        partnerProfileEl.classList.add('hidden');
        mediaControls.classList.add('hidden');
        remoteMediaStatus.classList.add('hidden');
    });

    socket.on('partner_skipped', () => {
        statusMessage.textContent = 'คู่คุยข้ามไปแล้ว กำลังค้นหาคู่คุยใหม่...';
        cleanupConnection();
        partnerLabel.textContent = 'กำลังค้นหา...';
        waitingOverlay.classList.add('hidden');
        remoteStatus.classList.add('hidden');
        partnerProfileEl.classList.add('hidden');
        mediaControls.classList.add('hidden');
        remoteMediaStatus.classList.add('hidden');
    });

    socket.on('partner_disconnected', () => {
        statusMessage.textContent = 'คู่คุยตัดการเชื่อมต่อ คลิก "ค้นหาคู่คุย" เพื่อค้นหาคู่คุยใหม่';
        cleanupConnection();
        findMatchBtn.classList.remove('hidden');
        skipBtn.classList.add('hidden');
        partnerLabel.textContent = 'กำลังค้นหา...';
        waitingOverlay.classList.add('hidden');
        remoteStatus.classList.add('hidden');
        partnerProfileEl.classList.add('hidden');
        mediaControls.classList.add('hidden');
        remoteMediaStatus.classList.add('hidden');
    });

    // Media state updates
    socket.on('media_state', ({ video, audio }) => {
        remoteMediaState = { video, audio };
        updateRemoteMediaStatus();
    });
    
    // WebRTC Signaling
    socket.on('webrtc_offer', async ({ offer }) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc_answer', { roomId: currentRoom, answer });
        }
    });
    
    socket.on('webrtc_answer', async ({ answer }) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });
    
    socket.on('ice_candidate', async ({ candidate }) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });
    
    // Chat
    socket.on('chat_message', ({ username, message, timestamp }) => {
        addChatMessage(username, message, username === currentUsername);
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        statusMessage.textContent = error;
    });
}

// ==================== WebRTC ====================

async function startWebRTC() {
    try {
        // Stop any existing stream first
        stopLocalStream();

        // Get local media stream based on settings
        const mediaConstraints = {
            video: settings.videoEnabled,
            audio: settings.audioEnabled
        };

        // If both are disabled, still create connection without media
        if (!settings.videoEnabled && !settings.audioEnabled) {
            localStream = new MediaStream();
            localMediaState = { video: false, audio: false };
        } else {
            try {
                localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                localMediaState = {
                    video: settings.videoEnabled && localStream.getVideoTracks().length > 0,
                    audio: settings.audioEnabled && localStream.getAudioTracks().length > 0
                };
            } catch (mediaError) {
                console.error('Media access error:', mediaError);
                // If media access fails, try with just audio or just video
                if (settings.videoEnabled && settings.audioEnabled) {
                    try {
                        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        localMediaState = { video: false, audio: true };
                        statusMessage.textContent = 'ไม่สามารถเข้าถึงกล้อง ใช้เฉพาะเสียง';
                    } catch (audioError) {
                        localStream = new MediaStream();
                        localMediaState = { video: false, audio: false };
                        statusMessage.textContent = 'ไม่สามารถเข้าถึงกล้องและไมโครโฟน คุยแบบข้อความได้';
                    }
                } else {
                    localStream = new MediaStream();
                    localMediaState = { video: false, audio: false };
                    statusMessage.textContent = 'ไม่สามารถเข้าถึงอุปกรณ์ คุยแบบข้อความได้';
                }
            }
        }

        localVideo.srcObject = localStream;
        updateLocalMediaStatus();

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    roomId: currentRoom,
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                statusMessage.textContent = 'การเชื่อมต่อขาดหลุด กำลังค้นหาคู่คุยใหม่...';
                cleanupConnection();
            }
        };

        // Send initial media state
        sendMediaState();

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc_offer', { roomId: currentRoom, offer });

    } catch (error) {
        console.error('WebRTC error:', error);
        statusMessage.textContent = 'เกิดข้อผิดพลาด คุยแบบข้อความได้';
        findMatchBtn.disabled = false;
        waitingOverlay.classList.add('hidden');
    }
}

function cleanupConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
    }
    
    currentRoom = null;
    disableChat();
}

function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (localVideo.srcObject) {
        localVideo.srcObject = null;
    }
}

// ==================== Matching ====================

findMatchBtn.addEventListener('click', () => {
    if (socket) {
        selectedCountry = countrySelect.value;
        localStorage.setItem('selectedCountry', selectedCountry);
        socket.emit('find_match', { country: selectedCountry });
    }
});

// Country selector change
countrySelect.addEventListener('change', () => {
    selectedCountry = countrySelect.value;
    localStorage.setItem('selectedCountry', selectedCountry);
});

// Settings modal
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

saveSettingsBtn.addEventListener('click', () => {
    settings.autoMatch = document.getElementById('auto-match').checked;
    settings.soundNotifications = document.getElementById('sound-notifications').checked;
    settings.videoEnabled = document.getElementById('video-enabled').checked;
    settings.audioEnabled = document.getElementById('audio-enabled').checked;
    settings.language = document.getElementById('language-select').value;

    localStorage.setItem('settings', JSON.stringify(settings));
    settingsModal.classList.add('hidden');

    // Apply settings
    if (settings.autoMatch && !currentRoom) {
        findMatchBtn.click();
    }
});

function loadSettings() {
    document.getElementById('auto-match').checked = settings.autoMatch;
    document.getElementById('sound-notifications').checked = settings.soundNotifications;
    document.getElementById('video-enabled').checked = settings.videoEnabled;
    document.getElementById('audio-enabled').checked = settings.audioEnabled;
    document.getElementById('language-select').value = settings.language;
}

// Media controls
toggleCameraBtn.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            localMediaState.video = videoTrack.enabled;
            updateLocalMediaStatus();
            sendMediaState();
        }
    }
});

toggleMicBtn.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            localMediaState.audio = audioTrack.enabled;
            updateLocalMediaStatus();
            sendMediaState();
        }
    }
});

function updateLocalMediaStatus() {
    if (localMediaState.video) {
        localCameraStatus.classList.remove('disabled');
        localCameraStatus.innerHTML = '<i class="fas fa-video"></i>';
    } else {
        localCameraStatus.classList.add('disabled');
        localCameraStatus.innerHTML = '<i class="fas fa-video-slash"></i>';
    }

    if (localMediaState.audio) {
        localMicStatus.classList.remove('disabled');
        localMicStatus.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
        localMicStatus.classList.add('disabled');
        localMicStatus.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }

    // Update button states
    if (localMediaState.video) {
        toggleCameraBtn.classList.add('active');
        toggleCameraBtn.classList.remove('inactive');
        toggleCameraBtn.innerHTML = '<i class="fas fa-video"></i>';
    } else {
        toggleCameraBtn.classList.remove('active');
        toggleCameraBtn.classList.add('inactive');
        toggleCameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    }

    if (localMediaState.audio) {
        toggleMicBtn.classList.add('active');
        toggleMicBtn.classList.remove('inactive');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
        toggleMicBtn.classList.remove('active');
        toggleMicBtn.classList.add('inactive');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
}

function updateRemoteMediaStatus() {
    if (remoteMediaState.video) {
        remoteCameraStatus.classList.remove('disabled');
        remoteCameraStatus.innerHTML = '<i class="fas fa-video"></i>';
    } else {
        remoteCameraStatus.classList.add('disabled');
        remoteCameraStatus.innerHTML = '<i class="fas fa-video-slash"></i>';
    }

    if (remoteMediaState.audio) {
        remoteMicStatus.classList.remove('disabled');
        remoteMicStatus.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
        remoteMicStatus.classList.add('disabled');
        remoteMicStatus.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
}

function sendMediaState() {
    if (socket && currentRoom) {
        socket.emit('media_state', {
            roomId: currentRoom,
            video: localMediaState.video,
            audio: localMediaState.audio
        });
    }
}

skipBtn.addEventListener('click', () => {
    if (socket && currentRoom) {
        stopLocalStream();
        socket.emit('skip');
    }
});

// ==================== Chat ====================

function enableChat() {
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
}

function disableChat() {
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    chatMessages.innerHTML = '';
}

function addChatMessage(username, message, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'partner'}`;
    
    messageDiv.innerHTML = `
        <div class="username">${username}</div>
        <div class="message">${message}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && socket && currentRoom) {
        socket.emit('chat_message', {
            roomId: currentRoom,
            message
        });
        messageInput.value = '';
    }
}
