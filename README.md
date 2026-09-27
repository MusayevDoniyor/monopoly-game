# 🎩 Monopoly Master: Deluxe PC Edition

A complete, AAA-quality digital edition of **Monopoly** designed to look, sound, and feel like a native desktop game from **Steam** or the **Microsoft Store**.

---

## 🎮 How to Launch

### 🚀 Option 1: Native Standalone PC Game Window (Recommended)
Double-click [`Play-Monopoly.bat`](file:///C:/Users/doniy/Desktop/monopoly-game/Play-Monopoly.bat) or [`start.bat`](file:///C:/Users/doniy/Desktop/monopoly-game/start.bat) in this folder.
- Launches the game in an **isolated, borderless native desktop window**.
- **No browser URL bar, no tabs, no bookmarks** — an authentic Steam/Windows PC game experience!

### 🖥️ Option 2: Electron Desktop App
```powershell
cd C:\Users\doniy\Desktop\monopoly-game
npm run desktop
```

### 🌐 Option 3: Browser / LAN Multiplayer
```powershell
npm start
```
Then open `http://localhost:8080`.

---

## 🌟 AAA Features Built Into This Edition

### 1. 🏆 Steam-Style Achievements System
Includes real-time Steam achievement toast notifications with custom icons, sounds, and persistent progression:
- 🏁 **Grand Tour**: Complete your first full lap around the board.
- 👑 **City Baron**: Acquire your first complete color monopoly.
- 🏨 **5-Star Hospitality**: Construct a luxury Hotel.
- ⚖️ **The Great Escape**: Successfully escape Jail by paying bail or rolling doubles.
- 💎 **Centibillionaire**: Accumulate over $3,000 cash.
- 🪦 **Hostile Takeover**: Bankrupt an opponent.
- ✈️ **Global Aviation Mogul**: Own 3 or more Airports/Stations simultaneously.
- 🎰 **Jackpot Strike**: Win +$250 or more from a Lucky Chest card.

### 2. 🎵 Procedural Ambient Lounge Soundtrack & SFX
- Built-in procedural **Lounge Jazz background music** synthesized on the fly via the Web Audio API.
- Individual toggles for **Music** and **SFX Mute** directly in the top header.

### 3. ✨ Particle FX Engine & Screen Shakes
- **Golden Coin Bursts**: Exploding gold coins fly across the screen when collecting $200 from START or winning cash.
- **Floating Cash Text**: Glowing emerald `+$200` and crimson `-$150` chips float up during transactions.
- **Screen Shake**: Tactile camera shake impact when getting thrown into Jail or paying huge rent penalties.
- **Victory Confetti Shower**: Full-screen rainbow confetti celebration when winning the championship!

### 4. 📐 Classic 2D Board Layout (11 Tiles Per Row, 40 Spaces)
- **Classic default**: GO, JAIL, FREE PARKING, and GO TO JAIL corners with 40 total spaces.
- **Corner 0**: `GO` (Collect $200)
- **Corner 1**: `JAIL` (**$150 Bail** on your next turn, with interactive prompt)
- **Corner 2**: `FREE PARKING` (No-fee rest area)
- **Corner 3**: `GO TO JAIL` (Police arrest)
- **Optional World edition**: 36 custom city spaces with START and SAFE ZONE corners.
- **Station/Airport Rent**: Scales linearly ($50 → $100 → $150 → $200).

### 5. 👥 Real-Time Online Multiplayer Rooms & AI Bots
- Create 4-letter room codes (`PARK`, `CITY`) so friends on phones, tablets, or other PCs can join in real time.
- Play against tournament-level AI bots that use **Markov probability heatmaps** and **housing scarcity strategies**.

### 6. 🧠 Gemini AI Tactical Advisor
- Click **"Ask Gemini AI"** on any turn for grandmaster tournament advice or witty live commentary.
