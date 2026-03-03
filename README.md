# Local Network Chat

A lightweight, real-time chat app for computers on the same local network. No accounts, no cloud servers — just instant messaging between devices using your LAN.

Built with Node.js, Express, and Socket.IO.

## Features

- **Public Lobby** — Join a shared chat room instantly, no signup required
- **Private Rooms** — Create private chat rooms with unique shareable links (format: `xxxx.xxxx`)
- **Real-Time Messaging** — Instant delivery via WebSockets (Socket.IO)
- **User Presence** — See who's online and get join/leave notifications
- **Message History** — New users see the last 50 messages when joining a room
- **Custom Nicknames** — Pick any display name, no registration needed
- **Auto-Cleanup** — Rooms store the last 100 messages in memory
- **Subdomain Support** — Optional subdomain-based room routing for production deployments
- **Mobile Friendly** — Responsive design works on phones, tablets, and desktops

## How It Works

One machine on the network runs the server. All other devices connect by opening the server's local IP in their browser. Messages are relayed in real time via WebSockets — everything stays on your network.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Computer A  │     │   Server     │     │  Computer B  │
│  (browser)   │◄───►│  (Node.js)   │◄───►│  (browser)   │
│ 10.0.0.54    │     │ 10.0.0.241   │     │ 10.0.0.129   │
└──────────────┘     └──────────────┘     └──────────────┘
                           ▲
                           │
                     ┌──────────────┐
                     │  Phone/Tab   │
                     │  (browser)   │
                     │ 10.0.0.x     │
                     └──────────────┘
```

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)

### Setup

```bash
# Clone the repo
git clone https://github.com/ColinM-sys/local-network-chat.git
cd local-network-chat

# Install dependencies
npm install

# Start the server
npm start
```

The server starts on **port 3000** by default.

### Connect from other devices

1. Find the server machine's local IP (e.g., `10.0.0.241`)
2. On any device on the same network, open a browser and go to:
   ```
   http://10.0.0.241:3000
   ```
3. Choose **Join Public Chat** or **Create Private Chat**
4. Pick a nickname and start chatting

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3000` | Server port |
| `BASE_DOMAIN` | `localhost:3000` | Base domain for subdomain-based room routing |

Example with custom port:

```bash
PORT=8080 npm start
```

## Project Structure

```
local-network-chat/
├── server.js          # Express + Socket.IO server
├── package.json       # Dependencies (express, socket.io)
└── public/
    ├── index.html     # Main HTML (home, join, chat screens)
    ├── css/
    │   └── styles.css # Responsive styling
    └── js/
        └── main.js    # Client-side Socket.IO logic
```

## License

ISC
