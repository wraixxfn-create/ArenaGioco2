# Meridian Drift

**Meridian Drift** is a browser-first trading and exploration game built around one idea: **every deal changes the route**.

You are Mara Venn, provisional pilot of the *Wayfarer / 09*, a patchwork courier crossing a broken sky. Read the weather, resolve signals, buy and sell cargo, take faction contracts, and decide which risks are worth a damaged hull. The market reacts to local pressure, the weather rotates between watches, and the ship log records the story you create.

## Playable systems

- Interactive route chart with discovered and unresolved stations.
- Fuel, hull, morale, cargo capacity, action slots, credits, Insight, and Renown.
- A market whose supply pressure changes when the player buys or sells.
- Weather effects that alter travel and commodity prices.
- Faction contracts with deadlines, cargo requirements, destinations, rewards, and reputation.
- Ship repair, three real ship upgrades, and three recruitable specialists with mechanical effects.
- Procedural watch-to-watch market drift and world events.
- Codex with faction reputation, milestones, weather sequence, and persistent ship log.
- Local save persistence with an explicit reset flow.
- Responsive layout for desktop, tablet, and mobile-sized browsers.
- Lightweight Web Audio feedback with a working mute control.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. For a production bundle:

```bash
npm run build
npm run preview
```

The project is intentionally dependency-light: React + Vite, with game data and state transitions separated into `src/game/content.js` and `src/game/logic.js`, and presentation in `src/App.jsx` / `src/styles.css`.
