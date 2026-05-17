# Tactic Deck — Product Plan

> A roadmap for evolving the pre-match formation/mentality picker into a
> collectible tactical card system. **Phases A and B have shipped.**
> Phase B.5 (pack-opening integration), C (manager schools), and D
> (tier variants + sets + legendaries) are spec'd here for the next
> builders to pick up.

---

## Why this exists

The game has a **two-mode problem**. The card meta (`PackOpening`,
`RetroPlayerCard`, foil stamps, 3D tilt) is loud and dopaminergic;
everything else is utilitarian. The most-used decision screen in the
game — formation + mentality before every month — was two stock
radio-button pickers.

The tactic deck reframes pre-match tactics as a card-driven loadout.
This integrates the card meta into the core loop instead of leaving it
siloed at season's end, and gives the game a long content tail (more
cards = more variety = more replay value).

The deeper goal: tactical depth has historically been *invisible* in
this game (the 11 TSS modifiers are all under the hood). Cards make
those decisions **legible** and **collectible**, turning math into
material the player can actually feel.

---

## Current state — Phase A (shipped)

**Branch:** `claude/game-design-review-xwfUP`
**Commit:** see `feat(squad): tactic deck Phase A`

### What's in place

A three-slot loadout UI: **SHAPE / TEMPO / INSTRUCTION**.

- 6 Shape cards (one per existing formation)
- 3 Tempo cards (one per existing mentality)
- Instruction slot is locked with a "coming soon" placeholder

### Files of interest

| File | Purpose |
|---|---|
| `src/types/tactics.ts` | `TacticCard`, `TacticSlot`, `TacticTier`, `TacticLoadout` |
| `src/data/tacticCards.ts` | The 9 baseline cards. Modifiers derived from `BALANCE.formationModifiers` / `mentalityModifiers` so the deck **cannot drift from balance** |
| `src/components/squad/TacticDeckPicker.tsx` | The new picker UI. Slots in for the old `FormationPicker` + `MentalitySelector` |
| `src/data/__tests__/tacticCards.test.ts` | Parity test — locks card modifiers to `BALANCE` |

### What was NOT changed in Phase A (and why)

- **Engine math** — `matchSim.ts` was left alone in Phase A. The picker
  mapped card.id back to formation/mentality enums before calling the
  existing callbacks. This kept Phase A's blast radius small. *Phase B
  did extend the engine — see that section.*
- **Save schema** — `SaveData` was untouched in Phase A. *Phase B added
  v5 with `ownedTacticCards` + `activeInstructionCardId`.*
- **`BALANCE`** — not modified by either phase. The 100-season
  `fullBalanceCheck` is unchanged because instruction effects are
  opt-in and AI never receives one.

### Known limitations carried forward

- Shape and Tempo cards are still mechanical re-skins — no collection,
  no tier variants. Phase D addresses this.
- All instruction cards are currently **bronze** tier.
- The pack-opening moment for instruction unlocks is a dedicated modal,
  not a `PackOpening` invocation. Phase B.5 fixes this.
- AI doesn't use Instruction cards — they keep using the legacy
  formation/mentality enums. Closing this gap is a future enhancement
  (probably alongside Phase C's schools, since AI's "tactical identity"
  would be the natural place for it).

---

## Phase B — Instruction cards (the depth payload)

**Status: SHIPPED.** See `feat(tactics): Phase B` commit.

### Why this was the most important phase

Phase A was a coat of paint. Phase B is where the deck became a *new
game*. Conditional and situational instruction cards introduce real
tactical decisions that change match-to-match.

### What shipped

1. Instruction slot unlocked in `TacticDeckPicker`. Owned cards listed,
   plus a "None" option (slot is optional).
2. **16** starter instruction cards (8 flat + 8 conditional). Pool will
   grow incrementally; the engine cap absorbs unbounded content.
3. Engine accepts `InstructionEffect` with a cap of `INSTRUCTION_TSS_CAP = 2`
   on net (atk+def)/2 contribution — single-card swing can't blow the
   ±6 envelope.
4. Save schema bumped to v5. `ownedTacticCards: string[]` and
   `activeInstructionCardId: string | null` on the meta slice; migration
   grants `STARTER_INSTRUCTION_CARD_IDS` so existing saves are immediately
   usable.
5. **Reveal flow** is a dedicated `TacticCardUnlockModal` rather than
   the full `PackOpening` integration. See "Phase B.5 — Pack-opening
   integration" below.

### Files of interest (shipped)

| File | What it owns |
|---|---|
| [src/data/instructionCards.ts](src/data/instructionCards.ts) | The 16 cards + `INSTRUCTION_TSS_CAP` + `STARTER_INSTRUCTION_CARD_IDS` + the seeded mint helper. Content authors live here. |
| [src/engine/matchSim.ts](src/engine/matchSim.ts) | `evaluateInstructionEffect`, `resolveInstructionEffect`, and the `instructionEffect?` field on `TSSConfig`. |
| [src/components/shared/TacticCardUnlockModal.tsx](src/components/shared/TacticCardUnlockModal.tsx) | The season-end reveal moment. Flip-to-see-effect, equip-now affordance. |
| [src/store/metaSlice.ts](src/store/metaSlice.ts) | `ownedTacticCards`, `activeInstructionCardId`, and the equip / grant / reset actions. |
| [src/utils/save.ts](src/utils/save.ts) | v4 → v5 migration. |

### Future Phase B authoring

When adding more instruction cards:

1. Append to `INSTRUCTION_CARDS` in `instructionCards.ts`.
2. If conditional, include a `conditionLabel` (the picker shows it).
3. Re-run `npm test -- src/data/__tests__/instructionCards.test.ts` —
   the cap test will catch any card whose raw (atk+def)/2 exceeds the cap.
4. Re-run `npm test -- src/engine/__tests__/fullBalanceCheck.test.ts`
   if you've added 5+ new cards at once or a particularly strong
   conditional — even within the cap, big batches can shift the
   100-season distribution.

### Resolved design questions (from spec → ship)

- **Can Instruction be empty?** Yes. "None" is a first-class option in
  the picker; engine treats undefined effect as zero contribution.
- **One instruction per match or per month?** Per-equip-slot —
  whatever the player has selected when a match runs, applies. Today
  selection persists across the month; weekly cadence would let the
  player swap mid-month and is the right shape for Phase C+ once
  weekly events / mid-match Moments land.
- **Should Shape/Tempo also gain collectibility?** Still deferred to
  Phase D; everyone owns them today.

---

## Phase B.5 — Pack-opening integration (deferred from Phase B)

**Estimate:** ~2 days.
**Status:** spec only.

### Why this is the natural next slice

Phase B ships with a lightweight `TacticCardUnlockModal` for the
season-end reveal. It works and has accessibility wiring — but it
doesn't have the pack-opening intro → shake → burst rhythm the rest
of the trading-card meta uses. That mismatch is small today but will
feel cheap as the card pool grows.

### What ships

1. Extend `PackOpening.tsx` to accept a `cards` payload of either
   `Player[]` or `TacticCard[]` (discriminated union).
2. Render a `TacticCardFace` component for tactic cards (front + back),
   matching the visual idiom of `RetroPlayerCard` but tactic-shaped.
3. Replace `TacticCardUnlockModal` with a `PackOpening` invocation from
   `handleSeasonEnd`. Keep the modal as a fallback for single-card
   mid-season grants (Phase C events could surface one of these).
4. Bonus drops:
   - **+1 instruction card** at season end (today's baseline).
   - **+1 extra** if you won a trophy that season.
   - **+1 extra** at reputation milestones (50, 75, "Iconic").

### Why it's deferred from Phase B

- `PackOpening` is heavily player-shaped (clubId, cardVariant,
  hero-stat thresholds). Generalising it is ~1 day of work and a
  small refactor risk to a hot file.
- Player-facing impact of the dedicated modal is already real — the
  unlock feels like a moment, just a smaller one.
- Doing Phase B without this dependency unblocked the engine + content
  cleanly.

### Files to create / modify

```
MOD: src/components/shared/PackOpening.tsx     — accept tactic-card cards
NEW: src/components/shared/TacticCardFace.tsx  — tactic-card visual
MOD: src/App.tsx                               — queue tactic packs in runSeasonEndPackChain
MOD: src/components/shared/TacticCardUnlockModal.tsx — keep as fallback or delete
```

---

## Phase C — Manager Schools

**Estimate:** ~2 days.
**Status:** spec only.

### Why

Today's manager profile is +/- TSS bonuses tied to a "background"
(former pro, academy mentor, etc.). It's flavour; it doesn't shape
play.

Schools give the player a **declared tactical identity** at career
start, which then **biases their card drops**. Two playthroughs with
different schools = different decks = different games.

### What ships

At career creation (or first board meeting), the player picks one of
five schools:

- **Gegenpress** — biased toward attacking Instructions, press-related cards
- **Tiki-Taka** — biased toward midfield-control cards, possession Instructions
- **Catenaccio** — biased toward defensive Instructions, low-block cards
- **Direct** — biased toward counter-attack, long-ball Instructions
- **Total Football** — biased toward versatility (multi-formation cards)

Each card carries an optional `school` tag. At pack-opening time, the
drop weights are biased toward the manager's school (e.g. 60/40 in-school
vs out-of-school).

### Files to create / modify

```
NEW: src/data/managerSchools.ts          — school definitions + bias table
MOD: src/types/entities.ts (Manager)     — add `school?: ManagerSchool`
MOD: src/components/manager/...          — school picker UI on career start
MOD: src/engine/transfers.ts (or new packGen helper) — weighted card drops
MOD: src/utils/save.ts                   — v6 migration if needed
```

### Open design question

Can a manager change school mid-career? Recommend **no** for v1 — schools
are a commitment that gives replays texture. Phase D could add a rare
"midlife crisis" event that lets you swap once.

---

## Phase D — Tier variants, set bonuses, legendaries

**Estimate:** ~4 days, mostly content authoring.
**Status:** spec only.

### Tier variants

Same card name, multiple foil/power tiers. "High Press" exists as:

- Bronze: +1 ATK
- Silver: +2 ATK
- Gold: +3 ATK, +0.5 form
- Elite: +4 ATK, +1 DEF, "Gegenpress" foil treatment

Upgrading happens via the existing pack-opening tier-up flow (already
used for player cards). Drop rates skew bronze early career, gold/elite
at high reputation.

### Set bonuses

Playing 3 cards from the same school = +1 TSS. Playing 3 cards from
the same "era" (Class of '92, '00s Galácticos) unlocks a special foil
border effect (cosmetic only, but very dopaminergic).

Implementation: a thin layer over the loadout that detects set
membership and adds a synthetic modifier.

### Legendary signature cards

10–15 hand-authored cards with named identities:

- "The Invincibles' Wing Play"
- "Cloughie's Two Banks"
- "Sacchi's Pressing Trap"
- "Total Football '74"

Drop only on specific achievements: first title, 50+ reputation, Cup
final won, beating a tier-1 club in the FA Cup. These are the **chase
cards** — long-tail collection compulsion.

### Files to create / modify

```
MOD: src/data/instructionCards.ts        — add tier variants
NEW: src/data/legendaryCards.ts          — signature cards + unlock conditions
NEW: src/engine/setBonus.ts              — set detection + bonus calculation
MOD: src/components/squad/TacticDeckPicker.tsx — set bonus indicator
MOD: src/engine/matchSim.ts              — apply set bonus in calculateTSS
```

---

## Cross-cutting concerns

### Balance discipline

**Total tactical TSS swing must stay ≤±6** with all three slots maxed.
Today's formation + mentality envelope is ±4 (each ±0–4 in some direction).
Phase B's Instruction cap of ±2 keeps us at ±6. Phase D's set bonus adds
another +1 max.

If we ever go beyond ±6, run `fullBalanceCheck.test.ts` and adjust
explicit caps in `BALANCE` — don't trim cards individually. The card
pool is content; the cap is balance.

### RNG discipline

Per `CLAUDE.md`, all gameplay randomness must flow through the seeded
RNG. Pack-opening tactic card drops must derive from `seasonSeed`
(see `src/utils/rng.ts`) so that replaying a season produces the same
drops. **No `Math.random()` in card generation logic.** UI sparkles in
the pack-opening reveal can keep their `Math.random()` carve-out.

### Save migration discipline

Every phase that changes save shape MUST:

1. Bump `CURRENT_SCHEMA_VERSION` in `src/utils/save.ts`
2. Add a migration step in `migrateSaveData()`
3. Add a Vitest covering the migration

See the existing v1→v4 migrations as reference. The doc comments in
`save.ts` should be extended with each new version's notes.

### Accessibility

- Card buttons need 44px+ touch targets (Phase A complies).
- Locked slot must be announced to screen readers (`aria-disabled`).
- `prefers-reduced-motion` should disable card hover-tilt if cards
  eventually adopt the `InteractiveCard` tilt physics.

---

## Recommended sequencing

| # | Phase | Effort | Status |
|---|---|---|---|
| 1 | A — re-skin | — | **SHIPPED** |
| 2 | B — instruction cards | ~3 days | **SHIPPED** |
| 3 | B.5 — pack-opening integration | ~2 days | spec only |
| 4 | C — schools | ~2 days | spec only |
| 5 | D — tiers + sets + legendaries | ~4 days | spec only |

**Don't ship Phase C before B.5.** The card-reveal moment is what makes
school-biased drops feel earned. Land the pack-opening unification first.

**Phase D can be drip-fed.** Each batch of legendaries / tier variants
is a content patch, not a system change.

---

## Documentation that needs updating when these phases ship

**When Phase B landed (done):**
- ✅ `CLAUDE.md` → "Project Phase" moved to "Phase 7 — Tactic Deck"
- ✅ `CLAUDE.md` → "Seeded Randomness" documents `${seasonSeed}-instruction-mint`
- ✅ `CLAUDE.md` → "Key Game Entities" has `TacticCard`, `InstructionEffect`, `InstructionContext`
- ✅ `CLAUDE.md` → "Hot Files" lists `instructionCards.ts` + bumped `matchSim.ts` to 12 TSS modifiers
- ✅ `CLAUDE.md` → "Save Schema" documents v5
- ✅ `CLAUDE.md` → "Testing Expectations" calls out instruction-card balance re-runs

**When Phase B.5 lands:**

- `CLAUDE.md` → "Visual Design Direction → Cards & Pack Meta" should note that `PackOpening` accepts both player and tactic-card payloads
- `CLAUDE.md` → "Hot Files" should bump `PackOpening.tsx` LoC count

**When Phase C lands:**

- `CLAUDE.md` → "Key Game Entities → Manager": add `school` field
- New section about school-biased pack drops (in this doc or CLAUDE.md)

**When Phase D lands:**

- `CLAUDE.md` → "Visual Design Direction → Cards & Pack Meta → Tier color contract":
  extend to cover non-player tactic cards
- Update `tierColors.ts` references if a new classifier is needed for
  tactic-card tier assignment

---

## Open product questions for the next session

1. **Per-match or per-month tactics?** Affects Phase B authoring.
2. **Should the Instruction slot be optional in the loadout?** Recommend yes.
3. **Drop rates** — how many cards per season-end pack? Recommend 1
   guaranteed + 0–2 conditional drops based on achievements.
4. **Does the AI also use the tactic deck?** Today they pick from
   `TIER_FORMATION_WEIGHTS` in `matchSim.ts`. Extending the AI to use
   Instructions is a fair next step but not strictly required for v1 —
   they can keep using the legacy formation+mentality enums.
5. **Trading / duplicates** — when a player gets a duplicate card, what
   happens? Recommend: 3 dupes → upgrade to next tier (auto-merge), since
   this maps onto the existing `RetroPlayerCard` tier-up logic.

---

## Risks and how we mitigate

| Risk | Mitigation |
|---|---|
| Balance creep — adding instructions raises TSS swing past today's envelope | Hard caps in `BALANCE`; `fullBalanceCheck` re-run after each card batch; ±2 TSS swing per Instruction |
| Visual clutter — three-slot picker plus cards plus modifiers | Phase A already lives behind the existing `tacticsOpen` collapse. Keep it collapsed by default; preview-of-loadout in collapsed state |
| Save corruption from schema change | Migration test per version; existing tests for v1–v4 migrations are the pattern |
| Choice paralysis — 30+ instruction cards | Filter/sort in the card picker; only show owned cards; recommend "suggested" cards based on next opponent |
| AI gets weaker than the player once cards stack | Either extend AI to use Instructions, or cap player advantage at a fixed TSS delta — preserves ±6 envelope |

---

*This doc is intended as a working spec. Update it as Phase B lands; do
not let it drift behind reality.*
