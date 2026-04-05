/**
 * StartingXIPicker — Visual formation view with player assignment.
 *
 * AUDIT FINDINGS (Task 7.3 Step 1):
 * - No `startingXI` state existed in teamSlice or any slice prior to Task 7.3.
 * - FormationPicker.tsx only selects formation type, no player-to-slot assignment.
 * - calculateTSS used whole-squad average. Now changed to Starting XI avg + depth bonus.
 * - MatchResult had no XI fields. Now has homeStartingXI/awayStartingXI.
 * - No FormationSlot type existed. Created in data/formations.ts.
 */

import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player, Position } from '../../types/entities';
import type { Formation } from '../../engine/matchSim';
import {
  getFormationSlots,
  checkPositionCompatibility,
  type FormationSlotDef,
} from '../../data/formations';
import type { XISwap } from '../../engine/startingXI';

interface StartingXIPickerProps {
  formation: Formation;
  xiNotifications: XISwap[];
  onDismissNotifications: () => void;
}

export function StartingXIPicker({
  formation,
  xiNotifications,
  onDismissNotifications,
}: StartingXIPickerProps) {
  const startingXI = useGameStore((s) => s.startingXI);
  const assignToSlot = useGameStore((s) => s.assignToSlot);
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const tempFillIns = useGameStore((s) => s.tempFillIns);

  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const playerClub = clubs.find((c) => c.id === manager?.clubId);
  const allPlayers = useMemo(() => {
    if (!playerClub) return [];
    const roster = [...playerClub.roster];
    const temps = tempFillIns.filter((p) => !roster.some((r) => r.id === p.id));
    return [...roster, ...temps];
  }, [playerClub, tempFillIns]);

  const slots = getFormationSlots(formation);
  const xiPlayerIds = new Set(Object.values(startingXI));

  // Count filled slots
  const filledCount = Object.values(startingXI).filter(Boolean).length;
  const isComplete = filledCount >= 11;

  return (
    <div>
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-2">
        <h3 className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">
          Starting XI
        </h3>
        <span className={`plm-text-xs plm-font-bold plm-tabular-nums ${
          isComplete ? 'plm-text-emerald-600' : 'plm-text-amber-600'
        }`}>
          {filledCount}/11
        </span>
      </div>

      {/* Notification Banner — auto-swap alerts */}
      {xiNotifications.length > 0 && (
        <div className="plm-mb-3 plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded plm-p-2.5">
          <div className="plm-flex plm-items-start plm-justify-between plm-gap-2">
            <div className="plm-flex-1">
              <div className="plm-text-[10px] plm-font-semibold plm-text-amber-700 plm-uppercase plm-tracking-wider plm-mb-1">
                Injury Auto-Swap
              </div>
              {xiNotifications.map((swap) => (
                <div key={swap.slot} className="plm-text-xs plm-text-amber-800">
                  <span className="plm-line-through plm-text-red-500">{swap.outPlayerName}</span>
                  {' → '}
                  <span className="plm-font-semibold plm-text-emerald-700">{swap.inPlayerName}</span>
                  <span className="plm-text-warm-400 plm-ml-1">({swap.slot})</span>
                </div>
              ))}
            </div>
            <button
              onClick={onDismissNotifications}
              className="plm-text-amber-500 plm-text-sm plm-font-bold plm-min-h-[36px] plm-min-w-[36px] plm-flex plm-items-center plm-justify-center hover:plm-text-amber-700"
              aria-label="Dismiss notifications"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Validation warning */}
      {!isComplete && (
        <div className="plm-mb-3 plm-bg-red-50 plm-border plm-border-red-200 plm-rounded plm-p-2 plm-text-xs plm-text-red-700">
          Select {11 - filledCount} more player{filledCount < 10 ? 's' : ''} to advance.
        </div>
      )}

      {/* Pitch View */}
      <div className="plm-relative plm-bg-emerald-800 plm-rounded-lg plm-overflow-hidden plm-aspect-[3/4] md:plm-aspect-[4/5]">
        {/* Pitch markings */}
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none">
          {/* Center circle */}
          <div className="plm-absolute plm-left-1/2 plm-top-1/2 plm-w-16 plm-h-16 md:plm-w-24 md:plm-h-24 plm-border plm-border-emerald-600/40 plm-rounded-full plm--translate-x-1/2 plm--translate-y-1/2" />
          {/* Halfway line */}
          <div className="plm-absolute plm-left-0 plm-right-0 plm-top-1/2 plm-h-px plm-bg-emerald-600/40" />
          {/* Penalty areas */}
          <div className="plm-absolute plm-left-1/4 plm-right-1/4 plm-bottom-0 plm-h-[12%] plm-border plm-border-b-0 plm-border-emerald-600/40 plm-rounded-t" />
          <div className="plm-absolute plm-left-1/4 plm-right-1/4 plm-top-0 plm-h-[12%] plm-border plm-border-t-0 plm-border-emerald-600/40 plm-rounded-b" />
        </div>

        {/* Player Slots */}
        {slots.map((slot) => (
          <PitchSlot
            key={slot.slot}
            slot={slot}
            player={findPlayerForSlot(slot.slot, startingXI, allPlayers)}
            isActive={activeSlot === slot.slot}
            onTap={() => setActiveSlot(activeSlot === slot.slot ? null : slot.slot)}
          />
        ))}
      </div>

      {/* Slot Assignment Dropdown (mobile: bottom sheet style, desktop: inline) */}
      {activeSlot && (
        <SlotAssignmentPanel
          slot={slots.find((s) => s.slot === activeSlot)!}
          allPlayers={allPlayers}
          xiPlayerIds={xiPlayerIds}
          currentPlayerId={startingXI[activeSlot]}
          onAssign={(playerId) => {
            assignToSlot(activeSlot, playerId);
            setActiveSlot(null);
          }}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </div>
  );
}

// ─── Helpers ───

function findPlayerForSlot(
  slotName: string,
  xi: Record<string, string>,
  roster: Player[],
): Player | undefined {
  const playerId = xi[slotName];
  if (!playerId) return undefined;
  return roster.find((p) => p.id === playerId);
}

// ─── Pitch Slot Component ───

function PitchSlot({
  slot,
  player,
  isActive,
  onTap,
}: {
  slot: FormationSlotDef;
  player: Player | undefined;
  isActive: boolean;
  onTap: () => void;
}) {
  const isInjured = player?.injured;
  const isEmpty = !player;

  return (
    <button
      onClick={onTap}
      className="plm-absolute plm-transform plm--translate-x-1/2 plm--translate-y-1/2 plm-z-10"
      style={{
        left: `${slot.x}%`,
        bottom: `${slot.y}%`,
      }}
      aria-label={`${slot.slot}: ${player ? player.name : 'Empty'}`}
    >
      <div className={`plm-flex plm-flex-col plm-items-center plm-transition-all ${
        isActive ? 'plm-scale-110' : ''
      }`}>
        {/* Player dot */}
        <div className={`plm-w-8 plm-h-8 md:plm-w-10 md:plm-h-10 plm-rounded-full plm-flex plm-items-center plm-justify-center plm-text-[9px] md:plm-text-[10px] plm-font-bold plm-shadow-md plm-transition-all plm-border-2 ${
          isEmpty
            ? 'plm-bg-white/20 plm-border-white/40 plm-text-white/60'
            : isInjured
              ? 'plm-bg-red-500 plm-border-red-300 plm-text-white'
              : isActive
                ? 'plm-bg-white plm-border-amber-400 plm-text-charcoal'
                : 'plm-bg-white plm-border-white/80 plm-text-charcoal'
        }`}>
          {player ? player.overall : slot.slot}
        </div>

        {/* Player name */}
        <div className={`plm-text-[8px] md:plm-text-[9px] plm-font-medium plm-mt-0.5 plm-truncate plm-max-w-[60px] md:plm-max-w-[80px] plm-text-center ${
          isEmpty ? 'plm-text-white/50' : 'plm-text-white'
        }`}>
          {player
            ? player.name.split(' ').pop()
            : slot.slot}
        </div>

        {/* Injury badge */}
        {isInjured && (
          <span className="plm-text-[7px] plm-bg-red-600 plm-text-white plm-px-1 plm-rounded plm-font-bold plm-mt-0.5">
            INJ
          </span>
        )}

        {/* Cross-position warning */}
        {player && checkPositionCompatibility(slot.position, player.position) !== 'exact' && (
          <span className={`plm-text-[7px] plm-px-1 plm-rounded plm-font-bold plm-mt-0.5 ${
            checkPositionCompatibility(slot.position, player.position) === 'compatible'
              ? 'plm-bg-amber-500 plm-text-white'
              : 'plm-bg-orange-500 plm-text-white'
          }`}>
            {player.position}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Slot Assignment Panel ───

function SlotAssignmentPanel({
  slot,
  allPlayers,
  xiPlayerIds,
  currentPlayerId,
  onAssign,
  onClose,
}: {
  slot: FormationSlotDef;
  allPlayers: Player[];
  xiPlayerIds: Set<string>;
  currentPlayerId: string | undefined;
  onAssign: (playerId: string) => void;
  onClose: () => void;
}) {
  const [showOtherPositions, setShowOtherPositions] = useState(false);

  // Separate players into position-compatible and others
  const { compatible, others } = useMemo(() => {
    const available = allPlayers.filter((p) => !p.injured && !p.isTemporary);
    const comp: Player[] = [];
    const other: Player[] = [];

    for (const p of available) {
      const match = checkPositionCompatibility(slot.position, p.position);
      if (match === 'exact' || match === 'compatible') {
        comp.push(p);
      } else {
        other.push(p);
      }
    }

    // Sort each group by overall descending
    comp.sort((a, b) => b.overall - a.overall);
    other.sort((a, b) => b.overall - a.overall);

    return { compatible: comp, others: other };
  }, [allPlayers, slot.position]);

  return (
    <div className="plm-mt-3 plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-shadow-sm plm-overflow-hidden">
      <div className="plm-flex plm-items-center plm-justify-between plm-p-3 plm-border-b plm-border-warm-100">
        <div>
          <span className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">
            {slot.slot}
          </span>
          <span className="plm-text-[10px] plm-text-warm-400 plm-ml-2">
            ({slot.position})
          </span>
        </div>
        <button
          onClick={onClose}
          className="plm-text-warm-400 plm-text-sm plm-font-bold plm-min-h-[36px] plm-min-w-[36px] plm-flex plm-items-center plm-justify-center hover:plm-text-warm-600"
          aria-label="Close assignment panel"
        >
          ✕
        </button>
      </div>

      <div className="plm-max-h-[240px] plm-overflow-y-auto">
        {/* Position-compatible players */}
        {compatible.map((player) => (
          <PlayerOption
            key={player.id}
            player={player}
            slotPosition={slot.position}
            isSelected={player.id === currentPlayerId}
            isInOtherSlot={xiPlayerIds.has(player.id) && player.id !== currentPlayerId}
            onSelect={() => onAssign(player.id)}
          />
        ))}

        {/* Other positions (collapsed) */}
        {others.length > 0 && (
          <>
            <button
              onClick={() => setShowOtherPositions(!showOtherPositions)}
              className="plm-w-full plm-py-2 plm-px-3 plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-tracking-wider plm-bg-warm-50 plm-border-y plm-border-warm-100 plm-text-left plm-min-h-[36px]"
            >
              Other Positions ({others.length}) {showOtherPositions ? '▲' : '▼'}
            </button>
            {showOtherPositions &&
              others.map((player) => (
                <PlayerOption
                  key={player.id}
                  player={player}
                  slotPosition={slot.position}
                  isSelected={player.id === currentPlayerId}
                  isInOtherSlot={xiPlayerIds.has(player.id) && player.id !== currentPlayerId}
                  onSelect={() => onAssign(player.id)}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Player Option in Dropdown ───

function PlayerOption({
  player,
  slotPosition,
  isSelected,
  isInOtherSlot,
  onSelect,
}: {
  player: Player;
  slotPosition: Position;
  isSelected: boolean;
  isInOtherSlot: boolean;
  onSelect: () => void;
}) {
  const compat = checkPositionCompatibility(slotPosition, player.position);

  return (
    <button
      onClick={onSelect}
      disabled={isInOtherSlot}
      className={`plm-w-full plm-flex plm-items-center plm-gap-2 plm-px-3 plm-py-2 plm-text-left plm-transition-colors plm-min-h-[44px] plm-border-b plm-border-warm-50 ${
        isSelected
          ? 'plm-bg-emerald-50'
          : isInOtherSlot
            ? 'plm-opacity-30 plm-cursor-not-allowed'
            : 'hover:plm-bg-warm-50'
      }`}
    >
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5">
        {player.position}
      </span>
      <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
      </span>

      {/* Cross-position warning chip */}
      {compat === 'compatible' && (
        <span className="plm-text-[8px] plm-bg-amber-100 plm-text-amber-700 plm-px-1.5 plm-py-0.5 plm-rounded plm-font-semibold">
          Adapt
        </span>
      )}
      {compat === 'cross' && (
        <span className="plm-text-[8px] plm-bg-orange-100 plm-text-orange-700 plm-px-1.5 plm-py-0.5 plm-rounded plm-font-semibold">
          ⚠ Out of pos
        </span>
      )}

      {/* Already in XI chip */}
      {isInOtherSlot && (
        <span className="plm-text-[8px] plm-bg-warm-200 plm-text-warm-500 plm-px-1.5 plm-py-0.5 plm-rounded plm-font-medium">
          In XI
        </span>
      )}

      {isSelected && (
        <span className="plm-text-emerald-600 plm-text-sm plm-font-bold">✓</span>
      )}

      <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums plm-w-6 plm-text-right">
        {player.overall}
      </span>
    </button>
  );
}
