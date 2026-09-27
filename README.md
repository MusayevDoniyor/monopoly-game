# Monopoly Master

A browser-based property trading board game with local AI opponents and real-time online rooms. The game includes two board editions: a 40-space classic layout and a custom 36-space world layout.

## Run locally

Requirements: Node.js and npm.

```sh
npm ci
npm start
```

Open <http://localhost:8080>. To run the automated game-engine checks, use:

```sh
npm test
```

On Windows, `start.bat` opens the browser-based game. `Play-Monopoly.bat` launches it in an app-style browser window when Microsoft Edge or Chrome is installed.

## Online play and deployment

The Render Blueprint is defined in [`render.yaml`](render.yaml). It runs the Node server and its WebSocket multiplayer endpoint on the same service. Players can create a room and share its four-character code with friends.

Room membership and the latest game state are held in server memory. There is no persistent database: a server restart or instance replacement ends active rooms. The included Render configuration uses the free plan, which can sleep when idle and may delay the next connection while the service starts.

## Project layout

- `index.html`, `css/`, `images/`: browser interface and visual assets
- `js/`: game engine, board/card data, AI, audio, UI, and multiplayer client
- `server.js`: static HTTP server and WebSocket room server
- `tests/`: automated game-engine checks
- `render.yaml`: Render deployment Blueprint

The optional Gemini advisor uses a key entered by the player. The key is stored in that browser's local storage and requests go directly from the browser to Google's Gemini API. The built-in heuristic advisor works without a key.
