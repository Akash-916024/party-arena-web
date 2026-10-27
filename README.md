# 🎮 Party Arena Web

> **Real-time multiplayer browser party games with room codes, live sync, and tournament modes.**

Party Arena Web brings fast, competitive arcade multiplayer mini-games to any web browser. Create a room, share the 4-letter room code with friends across different devices or tabs, and compete in real-time or turn-based party games.

Inspired by the native Party Arena mobile app, rewritten as a lightweight, server-authoritative web platform deployable completely free on **GitHub Pages** and **Render**.

---

## ✨ Features

- **Multiplayer Across Different Browsers**: Works on Chrome, Firefox, Safari, Edge, Android Chrome, and iOS Safari.
- **Instant Room Codes**: Simple 4-letter codes (e.g. `ABCD`) — no accounts or sign-ups required.
- **Server-Authoritative Physics & Logic**: Prevents cheating and guarantees instant synchronization across all connected players.
- **5 Built-in Party Mini-Games**:
  - 🏓 **Pong**: 2-player real-time paddle duel with glowing neon court, ball trail effects, and touch/keyboard controls.
  - ❌ **Tic-Tac-Toe**: 2-player classic turn-based grid with glowing neon marks and win-line detection.
  - ⚡ **Reaction Speed**: 2–8 player simultaneous reflex showdown with false-start detection and millisecond accuracy.
  - 🔴 **Connect Four**: 2-player gravity disc-dropping battle with falling physics and 4-in-a-row highlights.
  - 🧠 **Memory Match**: 2–4 player card-pairing with 3D flip animations and masked anti-cheat state sync.
- **Tournament Mode**:
  - **Individual Points**: Points scored across a playlist of games (1st: 3pts, 2nd: 2pts, 3rd: 1pt).
  - **Team Battle**: 2 teams clash across matches.
  - **Knockout**: Bracket elimination format.
- **Aesthetic UI**: Premium dark glassmorphism design system inspired by Apple HIG and cyberpunk arcades, with custom typography (Outfit & Inter), smooth micro-animations, and haptic feedback.

---

## 🏗️ Architecture

```
┌───────────────────────┐         WebSocket          ┌───────────────────────────────────┐
│  Browser 1 (Host)     │ ◄────────────────────────► │                                   │
└───────────────────────┘                            │        Node.js WebSocket          │
                                                     │              Server               │
┌───────────────────────┐         WebSocket          │                                   │
│  Browser 2 (Player)   │ ◄────────────────────────► │  • RoomManager (Rooms & Codes)    │
└───────────────────────┘                            │  • GameEngine (Server Game Loop)  │
                                                     │  • TournamentManager              │
┌───────────────────────┐         WebSocket          │                                   │
│  Browser 3..N         │ ◄────────────────────────► │                                   │
└───────────────────────┘                            └───────────────────────────────────┘
```

- **Frontend (`/client`)**: Vanilla HTML5, modern CSS custom properties, and JavaScript with HTML5 Canvas. Zero client build step needed!
- **Backend (`/server`)**: High-performance Node.js using the `ws` library for sub-millisecond WebSocket communication.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### 1. Install Server Dependencies
```bash
cd party-arena-web/server
npm install
```

### 2. Start the Server
```bash
# From the project root:
npm start

# Or directly from the server folder:
node server/server.js
```

The server will start at:
```
http://localhost:3000
```
It automatically serves both the **WebSocket server** (at `ws://localhost:3000`) and the **static client files** (at `http://localhost:3000`).

### 3. Play Multi-Tab
1. Open `http://localhost:3000` in **Browser Tab 1**.
2. Click **Create Party Room** and note the 4-letter room code (e.g. `ABCD`).
3. Open `http://localhost:3000` in **Browser Tab 2** (or in an Incognito window / another device on your network).
4. Click **Join with Room Code** and enter the room code.
5. In Tab 2, click **Ready Up**. In Tab 1 (Host), pick a game and hit **Start Game**!

---

## 🌐 Free Cloud Deployment

### Step 1: Deploy WebSocket Backend (Render.com — 100% Free)
1. Fork or push this repository to GitHub.
2. Sign up on [Render.com](https://render.com).
3. Click **New +** > **Web Service**.
4. Connect your GitHub repository.
5. Configure the settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
6. Click **Create Web Service**. Render will assign you a live URL like:
   `https://party-arena-web.onrender.com` (WebSocket: `wss://party-arena-web.onrender.com`)

### Step 2: Deploy Frontend (GitHub Pages — 100% Free)
1. In `client/js/network.js`, update line 223 with your Render WebSocket URL:
   ```javascript
   return 'wss://your-service-name.onrender.com';
   ```
2. In your GitHub repository settings:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Branch**, select your branch and `/client` folder (or push `client/` contents to a `gh-pages` branch).
3. Your game is now live and playable by anyone worldwide!

---

## 📁 Repository Structure

```
party-arena-web/
├── client/                      # Frontend (Static site for GitHub Pages)
│   ├── index.html               # Main application shell
│   ├── css/
│   │   └── styles.css           # Complete design system & game CSS
│   ├── js/
│   │   ├── app.js               # Application router & screens
│   │   ├── network.js           # WebSocket client with auto-reconnect
│   │   ├── room.js              # Lobby, room codes & player states
│   │   ├── tournament.js        # Tournament client state & bracket
│   │   ├── ui.js                # Toasts, modals, avatars & utilities
│   │   └── games/
│   │       ├── base-game.js     # Base game renderer class
│   │       ├── pong.js          # Pong real-time canvas renderer
│   │       ├── tic-tac-toe.js   # Tic-Tac-Toe interactive grid
│   │       ├── reaction.js      # Reaction Speed reflex zone
│   │       ├── connect-four.js  # Connect Four gravity grid
│   │       └── memory.js        # Memory Match 3D card flips
│   └── assets/                  # Icons & optional assets
│
├── server/                      # Backend (Node.js WebSocket Server)
│   ├── server.js                # Main server & static file host
│   ├── room-manager.js          # Room lifecycle, codes & players
│   ├── game-engine.js           # Authoritative game loops & logic
│   ├── tournament-manager.js    # Tournament progression state machine
│   ├── protocol.js              # Shared message contracts
│   └── package.json             # Server dependencies (ws, uuid)
│
├── .gitignore
├── package.json                 # Root launcher scripts
└── README.md                    # Project documentation
```

---

## 🛡️ License

MIT License. Free to use, modify, and distribute.
