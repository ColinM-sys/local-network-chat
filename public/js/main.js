const socket = io();

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const roomInfo = document.getElementById('room-info');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const currentRoomSpan = document.getElementById('current-room');
const userCountSpan = document.getElementById('user-count');
const copyLinkBtn = document.getElementById('copy-link-btn');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let currentRoom = null;
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

// Initialize
function init() {
    currentRoom = getRoomFromUrl();

    if (currentRoom) {
        roomInfo.textContent = `Joining room: ${currentRoom}`;
        createRoomBtn.style.display = 'none';
    } else {
        roomInfo.textContent = 'Public lobby - anyone can join';
        currentRoom = 'lobby';
    }
}

// Join chat
function joinChat() {
    username = usernameInput.value.trim() || `User${Math.floor(Math.random() * 1000)}`;

    socket.emit('join', { room: currentRoom, name: username });

    joinScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    currentRoomSpan.textContent = `Room: ${currentRoom}`;
    messageInput.focus();
}

// Create a new private room
async function createPrivateRoom() {
    try {
        const response = await fetch('/api/create-room', { method: 'POST' });
        const data = await response.json();

        // For localhost, use query parameter
        const host = window.location.hostname;
        let newUrl;

        if (host === 'localhost' || host === '127.0.0.1') {
            newUrl = `${window.location.origin}?room=${data.roomId}`;
        } else {
            newUrl = `${window.location.protocol}//${data.url}`;
        }

        // Copy the link and redirect
        await navigator.clipboard.writeText(newUrl);
        alert(`Private room created!\n\nLink copied to clipboard:\n${newUrl}\n\nShare this link with others to chat privately.`);

        window.location.href = newUrl;
    } catch (err) {
        console.error('Failed to create room:', err);
        alert('Failed to create room. Please try again.');
    }
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

// Copy room link
async function copyLink() {
    const host = window.location.hostname;
    let url;

    if (host === 'localhost' || host === '127.0.0.1') {
        url = `${window.location.origin}?room=${currentRoom}`;
    } else {
        url = window.location.href;
    }

    try {
        await navigator.clipboard.writeText(url);
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
joinBtn.addEventListener('click', joinChat);
createRoomBtn.addEventListener('click', createPrivateRoom);
messageForm.addEventListener('submit', sendMessage);
copyLinkBtn.addEventListener('click', copyLink);

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinChat();
    }
});

// Initialize on load
init();
