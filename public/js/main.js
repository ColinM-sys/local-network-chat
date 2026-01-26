const socket = io();

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const privateCreatedScreen = document.getElementById('private-created-screen');
const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const roomInfo = document.getElementById('room-info');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const joinLobbyBtn = document.getElementById('join-lobby-btn');
const createPrivateBtn = document.getElementById('create-private-btn');
const privateLink = document.getElementById('private-link');
const copyPrivateLinkBtn = document.getElementById('copy-private-link-btn');
const joinPrivateBtn = document.getElementById('join-private-btn');
const currentRoomSpan = document.getElementById('current-room');
const userCountSpan = document.getElementById('user-count');
const copyLinkBtn = document.getElementById('copy-link-btn');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let currentRoom = null;
let currentRoomUrl = null;
let username = null;

// Get room from subdomain or URL
function getRoomFromUrl() {
    const host = window.location.hostname;

    // For localhost, check URL params
    if (host === 'localhost' || host === '127.0.0.1') {
        const params = new URLSearchParams(window.location.search);
        return params.get('room');
    }

    // Extract subdomain - everything before the main domain
    const parts = host.split('.');
    if (parts.length > 2) {
        // Rejoin all parts except the last two (domain.tld)
        return parts.slice(0, -2).join('.');
    }

    return null;
}

// Generate room URL
function getRoomUrl(roomId) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return `${window.location.origin}?room=${roomId}`;
    }
    // For production with subdomain support
    const baseDomain = host.split('.').slice(-2).join('.');
    return `${window.location.protocol}//${roomId}.${baseDomain}`;
}

// Show a specific screen
function showScreen(screen) {
    homeScreen.classList.add('hidden');
    privateCreatedScreen.classList.add('hidden');
    joinScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

// Initialize
function init() {
    const roomFromUrl = getRoomFromUrl();

    if (roomFromUrl) {
        // User arrived via a room link - go straight to join screen
        currentRoom = roomFromUrl;
        currentRoomUrl = window.location.href;
        roomInfo.textContent = `Private room: ${currentRoom}`;
        showScreen(joinScreen);
    } else {
        // Show home screen with options
        showScreen(homeScreen);
    }
}

// Join public lobby
function joinLobby() {
    currentRoom = 'lobby';
    currentRoomUrl = window.location.origin;
    roomInfo.textContent = 'Public chat - anyone can join';
    showScreen(joinScreen);
}

// Create a new private room
async function createPrivateRoom() {
    try {
        const response = await fetch('/api/create-room', { method: 'POST' });
        const data = await response.json();

        currentRoom = data.roomId;
        currentRoomUrl = getRoomUrl(data.roomId);

        // Show the private created screen with the link
        privateLink.value = currentRoomUrl;
        showScreen(privateCreatedScreen);
    } catch (err) {
        console.error('Failed to create room:', err);
        alert('Failed to create room. Please try again.');
    }
}

// Copy private link
async function copyPrivateLink() {
    try {
        await navigator.clipboard.writeText(privateLink.value);
        copyPrivateLinkBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyPrivateLinkBtn.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Go to join screen from private created screen
function goToJoinFromPrivate() {
    roomInfo.textContent = `Private room: ${currentRoom}`;
    showScreen(joinScreen);
}

// Join chat
function joinChat() {
    username = usernameInput.value.trim() || `User${Math.floor(Math.random() * 1000)}`;

    socket.emit('join', { room: currentRoom, name: username });

    showScreen(chatScreen);
    currentRoomSpan.textContent = currentRoom === 'lobby' ? 'Public Chat' : `Room: ${currentRoom}`;
    messageInput.focus();
}

// Send message
function sendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit('message', { text });
    messageInput.value = '';
}

// Add message to chat
function addMessage(data, isSelf = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSelf ? 'self' : 'other'}`;

    const time = new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        <div class="username">${escapeHtml(data.username)}</div>
        <div class="text">${escapeHtml(data.text)}</div>
        <div class="time">${time}</div>
    `;

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add system message
function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'system-message';
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy room link (in chat)
async function copyLink() {
    try {
        await navigator.clipboard.writeText(currentRoomUrl);
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Copy Link';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Socket event handlers
socket.on('history', (messages) => {
    messages.forEach(msg => {
        addMessage(msg, msg.username === username);
    });
});

socket.on('message', (data) => {
    addMessage(data, data.username === username);
});

socket.on('userJoined', (data) => {
    addSystemMessage(`${data.username} joined the chat`);
    userCountSpan.textContent = `${data.userCount} online`;
});

socket.on('userLeft', (data) => {
    addSystemMessage(`${data.username} left the chat`);
    userCountSpan.textContent = `${data.userCount} online`;
});

// Event listeners
joinLobbyBtn.addEventListener('click', joinLobby);
createPrivateBtn.addEventListener('click', createPrivateRoom);
copyPrivateLinkBtn.addEventListener('click', copyPrivateLink);
joinPrivateBtn.addEventListener('click', goToJoinFromPrivate);
joinBtn.addEventListener('click', joinChat);
messageForm.addEventListener('submit', sendMessage);
copyLinkBtn.addEventListener('click', copyLink);

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinChat();
    }
});

// Initialize on load
init();
