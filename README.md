# Minecraft-like 3D Game

A simple Minecraft-like 3D block-building game built with Node.js and Three.js.

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Game

1. Start the server:
```bash
npm start
```

2. Navigate to:
```
http://localhost:3000
```

3. Click on the game canvas to lock your cursor and start playing!

## Controls

- **W/A/S/D**: Move forward/left/backward/right
- **Space**: Jump
- **Mouse**: Look around (click canvas to lock cursor)
- **Left Mouse Click**: Place a block

## Technologies Used

- **Node.js**: Server runtime
- **Express.js**: Web server
- **Three.js**: 3D graphics rendering
- **HTML5 Canvas**: Rendering surface

## How It Works

The game uses Three.js for 3D rendering and implements:
- First-person camera controls
- Physics-based movement with gravity
- Block collision detection
- Raycasting for block placement
- Basic terrain generation
