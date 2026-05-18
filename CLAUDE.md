# CLAUDE.md — Premier League Manager

> This file is the persistent context for every Claude Code session on this project.
> It contains the global rules, conventions, and constraints that apply regardless
> of which feature is being built. **Read this file first, every session.**

---

## Project Identity

**Premier League Manager** is a lightweight, client-side football (soccer) management simulation played entirely in the browser. The player selects one of 20 real Premier League clubs, manages a squad of procedurally generated players through 38-game league seasons, and makes formation, mentality, and transfer decisions while watching the table evolve month by month.

A trading-card meta-layer (`PackOpening`, `RetroPlayerCard`, foil stamps, tier upgrades) wraps signings and end-of-season moments to give the loop physical, dopaminergic beats.

---

## Tech Stack

| Layer              | Choice                          | Notes                                                    |
|--------------------|---------------------------------|----------------------------------------------------------|
| Framework          | React 19 with TypeScript        | Strict mode.                                             |
| Build Tool         | Vite                            |                                                          |
| State Management   | Zustand (slice pattern)         | See "Zustand Slice Pattern" below. Hard requirement.     |
| Styling            | Tailwind CSS with `plm-` prefix | See "Tailwind Prefix" below. Hard requirement.           |
| Animation          | `@react-spring/web`             | Used in `InteractiveCard` 3D flip + tilt.                |
| Persistence        | IndexedDB via `idb-keyval`      | 3 save slots. Keys: `epl-manager-save-{1,2,3}`           |
| RNG                | `seedrandom`                    | See "Seeded Randomness" below. Hard requirement.         |
| Testing            | Vitest                          | Engine has heavy coverage; UI is untested today.         |

---

## Project Phase

The game is in **Phase 7 — Tactic Deck**. Engine, store, full UI, save/load, and the cards meta-layer are all shipped from earlier phases. The current effort reframes formation + mentality as a collectible 3-slot card loadout: Shape / Tempo / Instruction. Phases A (re-skin), B (Instruction slot, 16 starter cards, season-end mint), B.5 (pack-opening integration + bonus drops), C (manager schools + school-biased mint), and D (tier variants + set bonuses + legendary chase cards) have all shipped.

**Shipped:**
- ✅ Match engine (TSS → Poisson goals), 38-game league
- ✅ Player generation, aging, retirement, regens
- ✅ Transfer market with AI counter-offers and continent imports
- ✅ Narrative event engine + active modifiers
- ✅ FA Cup (R16 → Final, seeded draw)
- ✅ Reputation, board expectations, board meetings
- ✅ Full mobile-first UI across hub / squad / transfers / match / season / history / manager screens
- ✅ Trading-card meta: pack opening, 3D tilt + flip, foil stamps, tier upgrades, golden boot stamps
- ✅ 100-season headless balance test
- ✅ 3-slot IndexedDB save/load with explicit `schemaVersion` + migration
- ✅ Tactic Deck Phase A: 3-slot card loadout (Shape / Tempo / Instruction) replaces dual pickers
- ✅ Tactic Deck Phase B: Instruction slot unlocked, 16 starter cards, conditional effects, season-end mint
- ✅ Tactic Deck Phase B.5: `PackOpening` accepts tactic-card payloads, season-end reveal routes through it, bonus drops on trophies + reputation milestones (capped at 3)
- ✅ Tactic Deck Phase C: Manager Schools (Gegenpress / Tiki-Taka / Catenaccio / Direct / Total Football) picked at career creation, biases instruction-card mint 60/40 in-school vs out
- ✅ Tactic Deck Phase D: 12 silver/gold tier variants for 6 families, reputation-gated drop skew, school-set bonus (+1 TSS when Shape/Tempo/Instruction share a school), 6 legendary chase cards minted on career achievements

**Known incomplete:**
- ❌ UI component tests (Vitest only covers engine today)
- ❌ Prettier config (formatting is editor-driven)
- ❌ Type-checked ESLint (using `recommended`, not `recommendedTypeChecked`)

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

All **gameplay** randomness must flow through the seeded PRNG utility at [src/utils/rng.ts](src/utils/rng.ts). Any randomness that affects results, persistence, balance, or anything a player could replay or screenshot-diff is gameplay.

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
- **Instruction-card mint seed (Phase B / B.5 / C / D):** `${seasonSeed}-instruction-mint` — derived inside [computeInstructionDrops](src/data/instructionCards.ts), called at the end of the season-end pack chain in [App.tsx](src/App.tsx) `runSeasonEndPackChain`. Picks 1–3 unowned cards: legendaries first (when their unlock condition fires) then reputation-gated regular cards weighted 60/40 in-school vs out. Replaying the same season produces the same drops.

If you introduce new gameplay randomness (events, aging, transfers), derive a sub-seed from the appropriate parent seed.

**Instruction condition functions** (Phase B) must be pure functions of `InstructionContext` — no RNG, no state, no DOM. They're evaluated once per match in `calculateTSS` and must be deterministic so seeded replays match.

**UI-cosmetic carve-out.** `Math.random()` is permitted *only* for purely decorative animation values (confetti positions, particle bursts, sparkle offsets, glare jitter) where:
1. The output is never written to the store, save, or any game-affecting state.
2. The randomness cannot change a match result, transfer outcome, or league table.
3. The component would look effectively identical to the player if it were re-rolled.

If unsure whether something qualifies, route it through `SeededRNG`. Current carve-out lives in [PackOpening.tsx](src/components/shared/PackOpening.tsx) and [Confetti.tsx](src/components/shared/Confetti.tsx) — both particle systems with no gameplay coupling.

Engine code (`/src/engine/`) gets **no** carve-out. Any `Math.random()` there is a bug.

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

### 5. Engine Purity

The engine in `/src/engine/` is a pure-TypeScript layer with no React imports. Preserve that invariant — it is what makes headless simulation, the 100-season balance test, and future automated balancing possible. Engine functions take state in and return results out; side effects belong in the store layer.

### 6. Memory Management for Headless Sims

When running long simulations (100 seasons for balance checks), use a **streaming/accumulator pattern**:

- Loop through seasons one at a time.
- After each season, extract only the final league table and aggregate counts into a lightweight accumulator.
- **Discard** all match-by-match data, player form arrays, goalscorer lists, and per-month snapshots. Set to `null`.
- Assert on accumulated summaries after the loop, not on a giant array of season objects.

This prevents Out Of Memory errors in Node.js/Vitest. The reference implementation is [fullBalanceCheck.test.ts](src/engine/__tests__/fullBalanceCheck.test.ts).

---

## Folder Structure

```
/src
  /components      # React components
    /hub           # Game Hub screen
    /squad         # Squad & Formation screen
    /transfers     # Transfer Center screen
    /match         # Match Results display
    /season        # Season End, Awards, Board Meeting
    /history       # Season History screen
    /manager       # Manager profile screen
    /shared        # Shared UI (cards, table, nav, modals, pack opening)
  /data            # Static data (clubs, namePool, balance, managers)
  /engine          # Simulation logic (NO React imports)
    /matchSim.ts   # Match simulation engine
    /seasonSim.ts  # Full and lightweight season loops
    /playerGen.ts  # Player generation
    /transfers.ts  # Transfer logic
    /events.ts     # Narrative event engine
    /aging.ts      # Aging & retirement
    /faCup.ts      # FA Cup bracket + simulation
    /reputation.ts # Reputation drift
    /boardMeeting.ts
    /startingXI.ts
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
    /save.ts       # IndexedDB save/load + schema migration
    /cardTier.ts   # Card tier classifier
```

---

## Visual Design Direction

**Aesthetic:** Understated premium. High-end football annual, not an arcade game.

- **Typography:** Serif display headers (Playfair Display), clean sans-serif body (DM Sans). Strong hierarchy.
- **Color Palette:** Warm off-whites and deep charcoals as the base. Club-specific accent colors used sparingly for highlights and the league table row.
- **Layout:** Generous whitespace. Card-based components. Subtle shadows. The league table is the visual centerpiece — broadsheet sports page feel.
- **Motion:** Subtle transitions in the broadsheet UI. Table rows animate on position change. Results reveal with a slight stagger. **The cards meta is the one place where motion goes loud** (foil stamps, tilt physics, particle bursts).
- **Club Colors:** Each club has `primary` and `secondary` color values in the data file. Use them as accent colors, not backgrounds. The base palette stays neutral.

### Cards & Pack Meta

The trading-card meta-layer is a first-class feature. Treat its details with care.

- **Core files:** [InteractiveCard.tsx](src/components/shared/InteractiveCard.tsx) (tilt + flip physics), [RetroPlayerCard.tsx](src/components/shared/RetroPlayerCard.tsx) (player-card visual), [TacticCardFace.tsx](src/components/shared/TacticCardFace.tsx) (tactic-card visual — Phase B.5), [PackOpening.tsx](src/components/shared/PackOpening.tsx) (reveal flow — accepts both player and tactic payloads via discriminated `PackPayload`), [Confetti.tsx](src/components/shared/Confetti.tsx) (celebration). Animation keyframes live in [tailwind.config.js](tailwind.config.js).
- **`prefers-reduced-motion` must be respected.** `InteractiveCard` reads it and disables tilt + heavy transitions. Don't bypass.
- **400ms flip debounce.** `InteractiveCard` debounces flip toggles to dedupe `pointerup` + `click` from firing back-to-back on touch. If you add a new flip trigger, share the same debounce ref.
- **Tier color contract.** Player/manager tiers (`bronze | silver | gold | elite | future-star`) map to a fixed color palette shared by both card components via [src/utils/tierColors.ts](src/utils/tierColors.ts). That file owns both classifiers (`cardTierFromOverall`, `cardTierFromManagerReputation`) and the color/border/gradient/foil accessors. Don't reintroduce tier color logic inside `RetroPlayerCard` / `ManagerCard` — add it to the util and call it from the cards.
- **Modal accessibility plumbing.** Focus trap, Esc-to-dismiss, body-scroll lock, and backdrop click-through are shared via [src/hooks/useModalDismiss.ts](src/hooks/useModalDismiss.ts). New modal dialogs should consume this hook rather than re-implement the wiring.
- **3D transforms require inline `style={}`.** `perspective`, `transform-style: preserve-3d`, and `backface-visibility` cannot be Tailwind utilities — that's the one acceptable place for inline style.

---

## Save Schema

The save format lives in [src/utils/save.ts](src/utils/save.ts) and is **explicitly versioned** via `SaveData.schemaVersion`. **Current version: 5.**

- The current version is the `CURRENT_SCHEMA_VERSION` constant.
- `loadGame()` runs every save through `migrateSaveData()` before returning it, which upgrades older shapes step-by-step. Pre-versioning saves (no `schemaVersion` field) are treated as v1.
- On load, the migrated data is validated: 20 clubs, 380 fixtures, present manager. Validation failure throws a clean error rather than silently corrupting state.
- `tempFillIns` and `transferOffers` are intentionally **not** persisted — they're window-scoped and rebuilt on demand.

**Version history:**
- v1: pre-versioning. v2: schemaVersion introduced, optional fields backfilled. v3: GK stats relabelled + equal-weighted. v4: `manager.binder` added with retroactive accomplishment mint. v5: `ownedTacticCards` + `activeInstructionCardId` for Phase B tactic deck; migration grants `STARTER_INSTRUCTION_CARD_IDS`. **v6: `manager.school` (Phase C) defaulted from `playingBackground` and `manager.previousReputation` (Phase B.5) mirrored from `reputation`.**

**When you change the shape of saved state:**
1. Bump `CURRENT_SCHEMA_VERSION`.
2. Add a migration step in `migrateSaveData()` that upgrades the previous version to the new one.
3. Add a Vitest covering the migration.

Never silently change `SaveData` field semantics without bumping the version — existing saves will load with the new code's assumptions and corrupt.

---

## Key Game Entities (Quick Reference)

**Player:** 6 stats (ATK, DEF, MOV, PWR, MEN, SKL), overall rating (position-weighted), age, trait, form, injury status, market value. Has `acquiredThisWindow` flag for transfer cooldown and `isTemporary` flag for injury fill-ins.

**Club:** name, shortName, tier (1–5), budget, colors, rivalries, namePool. 16-player base squad.

**Match:** Resolved by Team Strength Score (TSS) → Poisson goal generation. Formation + mentality + home advantage + form + modifiers. Detailed math lives in [matchSim.ts](src/engine/matchSim.ts); balance knobs in [balance.ts](src/data/balance.ts).

**Season:** 10 monthly phases (Aug–May) + Season End + Summer Window. Formation/mentality set before each month.

**Manager:** Reputation (0–100), board expectations (rubber-band system), budget consequences. Phase B persists `ownedTacticCards: string[]` and `activeInstructionCardId: string | null` on the meta slice. Phase B.5 adds `previousReputation` (snapshot of last season's rep for milestone-crossing detection). Phase C adds `school: ManagerSchool` (declared tactical identity, biases season-end card drops).

**Temporary Fill-In:** Rating 40–50, `isTemporary: true`, stored in `tempFillIns` array (not main roster), auto-deleted on recovery, grayed-out in UI, excluded from saves.

**TacticCard (Phase A+B+D):** 3 slots — Shape, Tempo, Instruction. Shape and Tempo are mechanical re-skins of formation/mentality and mirror `BALANCE.formationModifiers` / `mentalityModifiers`. Instruction cards have an `effect: InstructionEffect` with optional `condition(InstructionContext) → boolean`. Engine caps each card's net (atk+def)/2 contribution at `INSTRUCTION_TSS_CAP = 2`. Phase D adds `family?` (groups tier variants of the same card), `schools?` (school-set affinity tags on every slot), `legendary?` + `unlockCondition?` + `unlockLabel?` (chase-card metadata). Types live in [src/types/tactics.ts](src/types/tactics.ts).

**InstructionEffect / InstructionContext (Phase B):** Defined in [src/types/tactics.ts](src/types/tactics.ts). Conditions are pure functions of `InstructionContext` (isHome, isDerby, isCup, opponent ratings, opponent tier) and **must not** read state, RNG, or DOM — they're evaluated once per match and seeded replays depend on them being deterministic.

---

## Hot Files (Handle With Care)

These five files are >800 LoC and any of them will swallow a context window on a casual read. They're not bad code — they're load-bearing. When editing:

| File | LoC | Watch out for |
|------|-----|---------------|
| [events.ts](src/engine/events.ts) | ~1020 | 20+ inline event templates. Adding a new event is easy; refactoring conditions is risky. Split into `runtime` + `templates/` when next touched. |
| [transfers.ts](src/engine/transfers.ts) | ~990 | Willingness curve, AI window, market generation, and continent imports all share state. Split into `offerLogic` / `aiTransfers` / `market` when next touched. |
| [PlayerDetailModal.tsx](src/components/shared/PlayerDetailModal.tsx) | ~970 | Browse + detail + transfer actions + celebration in one. Extract sub-components before adding features. |
| [RetroPlayerCard.tsx](src/components/shared/RetroPlayerCard.tsx) | ~960 | Foil stamps, hero stat, corner ornaments, back-face scout. Hardcoded hex colors should move to Tailwind theme. |
| [matchSim.ts](src/engine/matchSim.ts) | ~920 | TSS has 13 additive modifiers (Phase B added the instruction effect, Phase D added the school-set bonus — both user-only, capped). Adding a 14th changes balance significantly — re-run `fullBalanceCheck` after any TSS change. |
| [instructionCards.ts](src/data/instructionCards.ts) | ~470 | Content file for Phase B+. Adding a card here is the safe extension point; balance is enforced by `INSTRUCTION_TSS_CAP` in the engine + a parity test. Phase D added 12 silver/gold tier variants (gated by `allowedTiersForReputation`) and the legendary-mint integration. Re-run `fullBalanceCheck` after every batch of additions. |
| [legendaryCards.ts](src/data/legendaryCards.ts) | ~170 | Phase D chase-card pool. Six hand-authored cards with `unlockCondition: (LegendaryUnlockContext) => boolean`. Added one-per-season at most, only when the condition fires AND the card is unowned. Conditions are pure functions of season-end context (trophies / rep crossings / cup upsets / survival). |
| [setBonus.ts](src/engine/setBonus.ts) | ~80 | Phase D set-bonus engine. `detectSchoolSetBonus(formation, mentality, instructionCardId)` returns `{tssDelta, school}`. `SET_BONUS_TSS = 1`. Wired into `calculateTSS` via `config.setBonusTss` — only the user's side ever passes a non-zero value, so AI matches and `fullBalanceCheck` are unaffected. |
| [App.tsx](src/App.tsx) | ~2150 | Top-level orchestrator. Threads formation/mentality/instruction state into every match-sim call site. When extending Phase C/D systems, route them through here rather than duplicating store reads. |

---

## Testing Expectations

- **Engine changes require Vitest coverage.** The engine is heavily tested today (290+ tests across the project). New formulas, new event templates, new transfer logic, new tactic-card effects — each gets a test. Match the existing style in [src/engine/__tests__](src/engine/__tests__) and [src/data/__tests__](src/data/__tests__).
- **Balance-sensitive changes** (TSS modifiers, transfer willingness, injury rates, aging curves, **instruction cards**) must be sanity-checked against `balanceCheck.test.ts` or `fullBalanceCheck.test.ts` before being shipped. New instruction cards in particular: even with the ±2 TSS cap, large form swings or stacked conditionals can shift the 100-season distribution.
- **UI tests are not currently required.** If you add them, use Vitest + React Testing Library and put them in `__tests__` folders next to the component.
- **Save schema changes require a migration test.** See "Save Schema" above.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript build + Vite bundle |
| `npm run preview` | Preview a production build |
| `npm test` | Vitest, headless |
| `npm run test:watch` | Vitest, watch mode |
| `npm run lint` | ESLint over the repo |
| `npm run typecheck` | Standalone TypeScript check (no emit) |

---

## Formatting & Code Style

- TypeScript strict mode.
- Functional components with hooks. No class components.
- Named exports preferred over default exports (except where Zustand patterns require otherwise).
- `const` over `let`. No `var`.
- Descriptive variable names. No single-letter variables except in tight loops (`i`, `j`).
- Engine functions should be pure where possible — take state in, return results out.
- Comments for "why," not "what." The code should explain what it does; comments explain why.
- **No Prettier config exists today.** Formatting is editor-driven. If one is added, drop a `.prettierrc` at repo root with defaults — don't bikeshed config.
