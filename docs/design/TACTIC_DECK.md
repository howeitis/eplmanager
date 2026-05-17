# Tactic Deck — Product Plan

> A roadmap for evolving the pre-match formation/mentality picker into a
> collectible tactical card system. Phase A has shipped. Phases B–D are
> spec'd here for the next builders to pick up.

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

- **Engine math** — `matchSim.ts` still takes `formation: Formation` and
  `mentality: Mentality` in `TSSConfig`. The picker just maps card.id back
  to those enums before calling the existing callbacks. This kept the blast
  radius small and let us ship without rerunning balance tests.
- **Save schema** — `SaveData` is untouched. No `tacticCards` field yet.
  Every player implicitly "owns" all 9 baseline cards.
- **`BALANCE`** — not modified. The 100-season `fullBalanceCheck` was
  unchanged after Phase A.

### Known limitations of Phase A

- The deck is a **re-skin**. Mechanically identical to today. The "card"
  feeling is in the visual treatment only.
- All cards are **bronze** tier. The tier system exists in the type but
  isn't used.
- **No card collection.** Every player has the same 9 cards available
  from day one.
- **No pack-opening moment** for tactic cards (PackOpening currently
  only handles `Player` cards).
- The locked Instruction slot is the player's first prompt that "there's
  more coming." It's currently the only hint.

---

## Phase B — Instruction cards (the depth payload)

**Estimate:** ~3 days of work, plus content authoring.
**Status:** spec only.

### Why this is the most important phase

Phase A is a coat of paint. Phase B is where the deck becomes a *new
game*. Conditional and situational instruction cards introduce real
tactical decisions that change match-to-match.

### What ships

1. Unlock the Instruction slot in `TacticDeckPicker`.
2. Add the first **30 Instruction cards** to the pool.
3. Extend the engine to accept and apply Instruction effects.
4. Persist owned cards in the save (schema v5 migration).
5. Mint tactic cards at season-end via the existing `PackOpening` flow.

### Card design

Instruction cards have two kinds of effects:

**Flat effects** — apply every match (small deltas):
- "Press From The Front" — +1 ATK, -1 DEF
- "Compact Lines" — +1 DEF
- "Tempo Quickens" — +1 to form bonus this month

**Conditional effects** — only fire in specific states (bigger deltas):
- "Underdog's Bite" — +2 ATK when opponent's TSS exceeds yours by 5+
- "See It Out" — +3 DEF when leading after minute 70 (pairs with Mid-match Moments if/when that ships)
- "Derby Day" — +2 ATK / +2 DEF in rivalry fixtures only
- "Cup Tied" — only playable in FA Cup matches
- "Wounded Animal" — +2 ATK in the match after a 3+ goal defeat
- "Away Days" — +1 form when playing away

Conditional cards multiply effective pool size: you collect them, but
only *play* them situationally. This is what stops players from settling
on a single optimal loadout.

### Engine integration

`TSSConfig` gains a new optional field:

```typescript
interface TSSConfig {
  // existing fields...
  instructionEffects?: InstructionEffect[];
}

interface InstructionEffect {
  atkMod?: number;
  defMod?: number;
  formMod?: number;
  condition?: (ctx: MatchContext) => boolean;
}
```

In `calculateTSS()`, after the existing modifier stack, apply each
instruction effect whose condition is met (or unconditional). This sits
alongside the existing event modifiers (`FORMATION_DOUBLE`, `TSS_HOME`,
`DERBY_CHAOS`) — no conflict, both are additive.

**Balance constraint:** the sum of all Instruction effects in a loadout
must cap at **±2 TSS** swing. With one Instruction slot and the existing
shape+tempo range (~±4 TSS combined), total tactical swing stays in
today's envelope. The `fullBalanceCheck.test.ts` should be re-run after
each batch of Instruction cards is added.

### Save schema bump

`CURRENT_SCHEMA_VERSION` goes from 4 → 5. Migration backfills:

```typescript
data = {
  ...data,
  ownedTacticCards: ALL_TACTIC_CARDS.map(c => c.id), // grandfather everything
  activeLoadout: defaultLoadoutFromFormationMentality(data),
};
```

Store ownership lives in `metaSlice` (career-persistent, alongside
manager binder):

```typescript
interface MetaSlice {
  // existing fields...
  ownedTacticCards: TacticCardId[];
  activeLoadout: TacticLoadout;
}
```

### Pack integration

Reuse the existing `PackOpening` component — its `players` array
becomes generic `cards` and can carry tactic cards. Mint timing:

- **+1 instruction card** at season end (always)
- **+1 extra** if you won a trophy
- **+1 extra** if you reached the "Iconic" reputation tier this season
- Higher-tier drops as your reputation climbs (see Phase D)

### Open design questions

- **Can Instruction be empty?** Yes — playing without an Instruction
  card should be valid. The slot accepts `undefined`.
- **One instruction per match or one per month?** Recommend **per
  match** so weekly drama emerges, but per-month is simpler and aligns
  with current cadence. Decide before authoring conditional cards.
- **Should Shape/Tempo also gain collectibility?** Eventually yes
  (Phase D). For now they're "stock" cards everyone owns.

### Files to create / modify

```
NEW: src/data/instructionCards.ts        — the 30+ Instruction cards
NEW: src/engine/instructionEffects.ts    — effect evaluator + types
MOD: src/engine/matchSim.ts              — apply instruction effects in calculateTSS
MOD: src/types/store.ts                  — extend MetaSlice
MOD: src/store/metaSlice.ts              — ownership + active loadout
MOD: src/utils/save.ts                   — v5 migration
MOD: src/components/squad/TacticDeckPicker.tsx — unlock Instruction slot
NEW: src/components/squad/TacticCardSheet.tsx  — bottom-sheet card picker
MOD: src/App.tsx                         — mint tactic cards at season end
MOD: src/components/shared/PackOpening.tsx     — accept tactic cards
NEW: src/data/__tests__/instructionCards.test.ts — balance cap test
MOD: src/engine/__tests__/fullBalanceCheck.test.ts — re-run with cards
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

| # | Phase | Effort | Ship together with |
|---|---|---|---|
| 1 | A — re-skin | DONE | — |
| 2 | B — instruction cards | ~3 days | Save schema v5 migration + balance test re-run |
| 3 | C — schools | ~2 days | Career-start flow tweak |
| 4 | D — tiers + sets + legendaries | ~4 days | Ongoing content drops; doesn't need to land in one PR |

**Don't ship Phase C before Phase B.** Schools are pointless without
Instructions for them to bias toward.

**Phase D can be drip-fed.** Each batch of legendaries / tier variants
is a content patch, not a system change.

---

## Documentation that needs updating when these phases ship

When **Phase B** lands:

- `CLAUDE.md` → "Project Phase": move from "5–6 polish" to "Phase 7 — Tactic Deck"
- `CLAUDE.md` → "Hard Requirements → Seeded Randomness": add tactic-card pack RNG seed derivation
- `CLAUDE.md` → "Key Game Entities": new entries for `TacticCard`, `TacticLoadout`, `InstructionEffect`
- `CLAUDE.md` → "Hot Files": flag `matchSim.ts` (will grow), add `instructionCards.ts` as a content-author touchpoint
- `CLAUDE.md` → "Save Schema": document v5 explicitly
- `CLAUDE.md` → "Testing Expectations": add note that new Instruction cards trigger a balance re-run

When **Phase C** lands:

- `CLAUDE.md` → "Key Game Entities → Manager": add `school` field
- New section in `CLAUDE.md` or this doc about school-biased pack drops

When **Phase D** lands:

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
