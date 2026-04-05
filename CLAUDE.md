# CLAUDE.md — Premier League Manager

> This file is the persistent context for every Claude Code session on this project.
> It contains the global rules, conventions, and constraints that apply regardless
> of which phase or task is being built. **Read this file first, every session.**
>
> Phase-specific game mechanics, engine specs, and UI layouts will be provided
> in the chat prompt. This file does NOT contain those — it contains only the
> rules you must always follow.

---

## Project Identity

**Premier League Manager** is a lightweight, client-side football (soccer) management simulation played entirely in the browser. The player selects one of 20 real Premier League clubs, manages a squad of procedurally generated players through 38-game league seasons, and makes formation, mentality, and transfer decisions while watching the table evolve month by month.

---

## Tech Stack

| Layer              | Choice                          | Notes                                                    |
|--------------------|---------------------------------|----------------------------------------------------------|
| Framework          | React 18+ with TypeScript       |                                                          |
| Build Tool         | Vite                            |                                                          |
| State Management   | Zustand (slice pattern)         | See "Zustand Slice Pattern" below. Hard requirement.     |
| Styling            | Tailwind CSS with `plm-` prefix | See "Tailwind Prefix" below. Hard requirement.           |
| Persistence        | IndexedDB via `idb-keyval`      | 3 save slots. Keys: `epl-manager-save-{1,2,3}`          |
| RNG                | `seedrandom`                    | See "Seeded Randomness" below. Hard requirement.         |
| Testing            | Vitest                          |                                                          |

---

## Hard Requirements (Non-Negotiable)

### 1. Tailwind Prefix: `plm-`

Every Tailwind utility class in this project uses the `plm-` prefix. No exceptions.

```javascript
// tailwind.config.js
module.exports = {
  prefix: 'plm-',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // ...
}
```

This means:
- `plm-bg-white` not `bg-white`
- `plm-text-gray-900` not `text-gray-900`
- `plm-flex` not `flex`
- `md:plm-grid-cols-2` not `md:grid-cols-2`
- `hover:plm-bg-gray-100` not `hover:bg-gray-100`

**Why:** This game will be integrated into an existing personal site. The prefix guarantees total CSS isolation from the host site's styles. Retrofitting a prefix onto an existing codebase is painful — build it in from the first component.

### 2. Seeded Randomness

**Every `Math.random()` call is a bug.** All randomness must flow through the seeded PRNG utility at `/src/utils/rng.ts`.

The RNG utility wraps `seedrandom` and exposes:
- `random()` → float [0, 1)
- `randomInt(min, max)` → integer [min, max]
- `randomFloat(min, max)` → float [min, max)
- `poissonRandom(lambda)` → Poisson-distributed integer
- `weightedPick(items, weights)` → weighted random selection

Seed derivation hierarchy:
- **Game seed:** Generated once at game creation. Stored in save file.
- **Season seed:** `gameSeed + seasonNumber`
- **Match seed:** `seasonSeed + fixtureId`
- **Transfer seed:** `seasonSeed + "transfer" + windowId`

If you introduce new randomness (events, aging, etc.), derive a sub-seed from the appropriate parent seed. Never call `Math.random()`.

### 3. Zustand Slice Pattern

The store is split into 5 slices. This is a hard requirement — a monolithic store file will exceed context window limits and cause state corruption.

| Slice         | File                            | Owns                                                |
|---------------|---------------------------------|-----------------------------------------------------|
| `teamSlice`   | `/src/store/teamSlice.ts`       | Club rosters, player management, injuries, fill-ins |
| `matchSlice`  | `/src/store/matchSlice.ts`      | Fixtures, results, league table, FA Cup             |
| `marketSlice` | `/src/store/marketSlice.ts`     | Budgets, transfers, offers                          |
| `seasonSlice` | `/src/store/seasonSlice.ts`     | Phase state, calendar, events, modifiers            |
| `metaSlice`   | `/src/store/metaSlice.ts`       | Manager profile, reputation, history, save metadata |

**TypeScript pattern (follow exactly):**

```typescript
// /src/types/store.ts — define FIRST, before any slice
export interface GameState extends TeamSlice, MatchSlice, MarketSlice, SeasonSlice, MetaSlice {}

// Each slice file — reference GameState, don't try to infer it
import { StateCreator } from 'zustand';
import { GameState } from '../types/store';

export interface TeamSlice { /* ... */ }
export const createTeamSlice: StateCreator<GameState, [], [], TeamSlice> = (set, get) => ({
  /* ... */
});

// /src/store/gameStore.ts — compose slices
import { create } from 'zustand';
import { GameState } from '../types/store';
// ... import all slice creators
export const useGameStore = create<GameState>((...a) => ({
  ...createTeamSlice(...a),
  ...createMatchSlice(...a),
  ...createMarketSlice(...a),
  ...createSeasonSlice(...a),
  ...createMetaSlice(...a),
}));
```

**Slice boundaries are firewalls.** When working on transfer logic, open `marketSlice.ts` and `transfers.ts`. Do not touch `matchSlice.ts`. If you need to read data from another slice, use `get()` — don't move state between slices.

### 4. Mobile-First Development

Every component starts with the mobile layout and scales up. No "desktop-first, add responsive later."

**Breakpoints:**
- `sm`: 640px (large phones, landscape)
- `md`: 768px (tablets — primary layout shift)
- `lg`: 1024px (desktop — full layout)

**Key rules:**
- Touch targets minimum 44px
- No hover-dependent interactions — everything works with tap
- Bottom navigation bar on mobile, sidebar/top nav on desktop
- Minimum font size: 12px on mobile
- Transfer flows use bottom sheets/modals on mobile, not multi-panel layouts
- Formation picker: tap-to-assign on mobile, pitch graphic on desktop

Build at 375px first. Verify it works. Then add `md:plm-` and `lg:plm-` enhancements.

### 5. Engine Before UI

Phases 1–2 must be fully complete and verified headlessly before any React game components are built. The sim engine must produce correct results in Vitest before a single pixel of game UI is rendered.

### 6. Memory Management for Headless Sims

When running long simulations (100 seasons for balance checks), use a **streaming/accumulator pattern**:

- Loop through seasons one at a time.
- After each season, extract only the final league table and aggregate counts into a lightweight accumulator.
- **Discard** all match-by-match data, player form arrays, goalscorer lists, and per-month snapshots. Set to `null`.
- Assert on accumulated summaries after the loop, not on a giant array of season objects.

This prevents Out Of Memory errors in Node.js/Vitest.

---

## Folder Structure

```
/src
  /components      # React components (Phase 5+)
    /hub           # Game Hub screen
    /squad         # Squad & Formation screen
    /transfers     # Transfer Center screen
    /match         # Match Results display
    /season        # Season End, Awards, Interview
    /history       # Season History screen
    /shared        # Shared UI components (buttons, cards, table, nav)
  /data            # Static data (clubs.ts, namePool.ts)
  /engine          # Simulation logic (NO React imports)
    /matchSim.ts   # Match simulation engine
    /playerGen.ts  # Player generation
    /transfers.ts  # Transfer logic
    /events.ts     # Narrative event engine
    /aging.ts      # Aging & retirement
    /__tests__     # Vitest test files for engine
  /store           # Zustand store slices
    /gameStore.ts  # Composed store
    /teamSlice.ts
    /matchSlice.ts
    /marketSlice.ts
    /seasonSlice.ts
    /metaSlice.ts
  /types           # TypeScript types
    /store.ts      # GameState interface (define FIRST)
    /entities.ts   # Club, Player, Match, etc.
  /utils           # Utilities
    /rng.ts        # Seeded PRNG wrapper
    /save.ts       # IndexedDB save/load helpers
```

**Rule:** Engine files (`/src/engine/`) must never import React or any UI library. They are pure TypeScript modules that operate on game state and return results. This separation is what makes headless testing possible.

---

## Visual Design Direction

**Aesthetic:** Understated premium. High-end football annual, not an arcade game.

- **Typography:** Serif display headers (Playfair Display or similar), clean sans-serif body (DM Sans or Source Sans 3). Strong hierarchy.
- **Color Palette:** Warm off-whites and deep charcoals as the base. Club-specific accent colors used sparingly for highlights and the league table row.
- **Layout:** Generous whitespace. Card-based components. Subtle shadows. The league table is the visual centerpiece — broadsheet sports page feel.
- **Motion:** Subtle transitions. Table rows animate on position change. Results reveal with a slight stagger. No flashy animations.
- **Club Colors:** Each club has `primary` and `secondary` color values in the data file. Use them as accent colors, not backgrounds. The base palette stays neutral.

---

## Key Game Entities (Quick Reference)

These are the core types. Full field lists are in the phase-specific PRD sections.

**Player:** 6 stats (ATK, DEF, MOV, PWR, MEN, SKL), overall rating (position-weighted), age, trait, form, injury status, market value. Has `acquiredThisWindow` flag for transfer cooldown and `isTemporary` flag for injury fill-ins.

**Club:** name, shortName, tier (1–5), budget, colors, rivalries, namePool. 16-player squad.

**Match:** Resolved by Team Strength Score (TSS) → Poisson goal generation. Formation + mentality + home advantage + form + modifiers.

**Season:** 10 monthly phases (Aug–May) + Season End + Summer Window. Formation/mentality set before each month.

**Manager:** Reputation (0–100), board expectations (rubber-band system), budget consequences.

**Temporary Fill-In:** Rating 40–50, `isTemporary: true`, stored in `tempFillIns` array (not main roster), auto-deleted on recovery, grayed-out in UI, excluded from saves.

---

## Formatting & Code Style

- TypeScript strict mode.
- Functional components with hooks. No class components.
- Named exports preferred over default exports (except where Zustand patterns require otherwise).
- `const` over `let`. No `var`.
- Descriptive variable names. No single-letter variables except in tight loops (`i`, `j`).
- Engine functions should be pure where possible — take state in, return results out.
- Comments for "why," not "what." The code should explain what it does; comments explain why.

---

## What This File Does NOT Contain

This file intentionally omits:
- Specific game mechanics (match resolution math, transfer willingness formula, event lists)
- Detailed UI layout specs (which panels go where, mobile vs desktop tables)
- Task-level build instructions

Those are provided in the chat prompt for each phase. This file is the foundation they build on.
