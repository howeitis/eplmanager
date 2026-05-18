import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Player } from '@/types/entities';
import type { Formation } from '@/engine/matchSim';
import {
  getFormationSlots,
  checkPositionCompatibility,
  type FormationSlotDef,
} from '@/data/formations';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface SubInModalProps {
  player: Player | null;
  formation: Formation;
  onClose: () => void;
}

/**
 * Lets the user sub a player into the Starting XI directly from the squad
 * list. Reverses the existing picker's UX: instead of "pick a slot, then a
 * player," this is "pick a player, then a slot." Lists every XI slot,
 * sorted by position compatibility, with the current incumbent shown so
 * the swap is explicit.
 *
 * Position-compatibility logic mirrors `SlotAssignmentPanel` in
 * StartingXIPicker — `exact` and `compatible` slots are highlighted as
 * "Compatible"; everything else is collapsed under "Other Positions".
 */
export function SubInModal({ player, formation, onClose }: SubInModalProps) {
  const startingXI = useGameStore((s) => s.startingXI);
  const assignToSlot = useGameStore((s) => s.assignToSlot);
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const tempFillIns = useGameStore((s) => s.tempFillIns);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const { handleBackdropClick } = useModalDismiss(dialogRef, onClose, { enabled: !!player });

  const [showOthers, setShowOthers] = useState(false);

  const allPlayers = useMemo(() => {
    const club = clubs.find((c) => c.id === manager?.clubId);
    if (!club) return [];
    const roster = [...club.roster];
    const temps = tempFillIns.filter((p) => !roster.some((r) => r.id === p.id));
    return [...roster, ...temps];
  }, [clubs, manager?.clubId, tempFillIns]);

  const slots = useMemo(() => getFormationSlots(formation), [formation]);

  const { compatible, others } = useMemo(() => {
    if (!player) return { compatible: [] as FormationSlotDef[], others: [] as FormationSlotDef[] };
    const comp: FormationSlotDef[] = [];
    const other: FormationSlotDef[] = [];
    for (const slot of slots) {
      const match = checkPositionCompatibility(slot.position, player.position, player.stats);
      if (match === 'exact' || match === 'compatible') comp.push(slot);
      else other.push(slot);
    }
    return { compatible: comp, others: other };
  }, [slots, player]);

  if (!player) return null;

  const isPlayerInXI = Object.values(startingXI).includes(player.id);

  const handlePick = (targetSlot: string) => {
    // Find which slot the chosen player currently occupies (if any). If
    // they're already in the XI, we treat this as a swap: the incumbent
    // of the target slot moves into the chosen player's old slot.
    let playerCurrentSlot: string | null = null;
    for (const [s, id] of Object.entries(startingXI)) {
      if (id === player.id) {
        playerCurrentSlot = s;
        break;
      }
    }
    if (playerCurrentSlot && playerCurrentSlot !== targetSlot) {
      const incumbentId = startingXI[targetSlot];
      // If the target slot has an incumbent, move them into the player's
      // old slot. If the target slot is empty, just clear the old slot
      // so the player doesn't appear twice.
      if (incumbentId) {
        assignToSlot(playerCurrentSlot, incumbentId);
      } else {
        // No clean "remove" exposed here, but assignToSlot is the only
        // mutator and re-using the same flow the picker uses would
        // require calling removeFromSlot. Use it directly.
        useGameStore.getState().removeFromSlot(playerCurrentSlot);
      }
    }
    assignToSlot(targetSlot, player.id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-in-title"
      className="plm-fixed plm-inset-0 plm-z-[60] plm-flex plm-items-end md:plm-items-center plm-justify-center plm-bg-black/60 plm-backdrop-blur-sm plm-px-0 md:plm-px-4 plm-py-0 md:plm-py-6"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="plm-w-full md:plm-max-w-md plm-bg-white plm-rounded-t-2xl md:plm-rounded-xl plm-shadow-2xl plm-overflow-hidden plm-max-h-[85vh] plm-flex plm-flex-col"
      >
        {/* Header */}
        <div className="plm-px-4 plm-py-3 plm-border-b plm-border-warm-200 plm-flex plm-items-start plm-justify-between plm-gap-3">
          <div className="plm-min-w-0">
            <div className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.25em] plm-text-warm-500">
              Sub In
            </div>
            <h2 id="sub-in-title" className="plm-text-base plm-font-display plm-font-semibold plm-text-charcoal plm-truncate">
              {player.name}
            </h2>
            <div className="plm-text-[11px] plm-text-warm-500 plm-mt-0.5">
              {player.position} · OVR {player.overall}
              {isPlayerInXI && (
                <span className="plm-ml-2 plm-text-emerald-600 plm-font-semibold">In XI</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="plm-text-warm-400 plm-text-xl plm-leading-none plm-min-h-[36px] plm-min-w-[36px] plm-flex plm-items-center plm-justify-center hover:plm-text-warm-700"
          >
            ✕
          </button>
        </div>

        {/* Slot list */}
        <div className="plm-flex-1 plm-overflow-y-auto">
          <SectionHeader>Compatible Slots</SectionHeader>
          {compatible.length === 0 && (
            <div className="plm-px-4 plm-py-3 plm-text-xs plm-italic plm-text-warm-500">
              No exact-position slots in {formation}. See "Other Positions" below.
            </div>
          )}
          {compatible.map((slot) => (
            <SlotRow
              key={slot.slot}
              slot={slot}
              incumbentId={startingXI[slot.slot]}
              allPlayers={allPlayers}
              match={checkPositionCompatibility(slot.position, player.position, player.stats)}
              onPick={() => handlePick(slot.slot)}
            />
          ))}

          {others.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                className="plm-w-full plm-flex plm-items-center plm-justify-between plm-px-4 plm-py-2 plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.2em] plm-text-warm-500 plm-bg-warm-50 plm-border-y plm-border-warm-200 plm-min-h-[36px]"
              >
                <span>Other Positions ({others.length})</span>
                <span className="plm-text-xs">{showOthers ? '▾' : '▸'}</span>
              </button>
              {showOthers && others.map((slot) => (
                <SlotRow
                  key={slot.slot}
                  slot={slot}
                  incumbentId={startingXI[slot.slot]}
                  allPlayers={allPlayers}
                  match="cross"
                  onPick={() => handlePick(slot.slot)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="plm-px-4 plm-pt-3 plm-pb-1 plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.2em] plm-text-warm-500">
      {children}
    </div>
  );
}

function SlotRow({
  slot,
  incumbentId,
  allPlayers,
  match,
  onPick,
}: {
  slot: FormationSlotDef;
  incumbentId: string | undefined;
  allPlayers: Player[];
  match: 'exact' | 'compatible' | 'cross';
  onPick: () => void;
}) {
  const incumbent = incumbentId ? allPlayers.find((p) => p.id === incumbentId) : undefined;
  return (
    <button
      type="button"
      onClick={onPick}
      className="plm-w-full plm-flex plm-items-center plm-gap-3 plm-px-4 plm-py-3 plm-min-h-[56px] plm-text-left hover:plm-bg-warm-50 plm-border-b plm-border-warm-100 plm-transition-colors"
    >
      <div className="plm-flex plm-flex-col plm-items-center plm-justify-center plm-w-12 plm-flex-shrink-0">
        <span className="plm-text-[10px] plm-font-bold plm-text-warm-500 plm-uppercase plm-tracking-wider">
          {slot.position}
        </span>
        <span className="plm-text-[9px] plm-text-warm-400 plm-mt-0.5">{slot.slot}</span>
      </div>
      <div className="plm-flex-1 plm-min-w-0">
        {incumbent ? (
          <>
            <div className="plm-text-sm plm-text-charcoal plm-truncate">{incumbent.name}</div>
            <div className="plm-text-[11px] plm-text-warm-500">
              OVR {incumbent.overall} · Form {incumbent.form > 0 ? `+${incumbent.form}` : incumbent.form}
              {incumbent.injured && <span className="plm-text-red-500 plm-ml-1">· INJ</span>}
            </div>
          </>
        ) : (
          <div className="plm-text-sm plm-italic plm-text-warm-400">Slot empty</div>
        )}
      </div>
      <div className="plm-flex plm-flex-col plm-items-end plm-flex-shrink-0">
        <MatchBadge match={match} />
        <span className="plm-text-[10px] plm-text-emerald-600 plm-font-semibold plm-mt-1 plm-uppercase plm-tracking-wider">
          {incumbent ? 'Swap In' : 'Sub In'}
        </span>
      </div>
    </button>
  );
}

function MatchBadge({ match }: { match: 'exact' | 'compatible' | 'cross' }) {
  if (match === 'exact') {
    return (
      <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-emerald-700 plm-bg-emerald-50 plm-border plm-border-emerald-200 plm-px-1.5 plm-py-0.5 plm-rounded">
        Exact
      </span>
    );
  }
  if (match === 'compatible') {
    return (
      <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-amber-700 plm-bg-amber-50 plm-border plm-border-amber-200 plm-px-1.5 plm-py-0.5 plm-rounded">
        Adapt
      </span>
    );
  }
  return (
    <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-orange-700 plm-bg-orange-50 plm-border plm-border-orange-200 plm-px-1.5 plm-py-0.5 plm-rounded">
      Out of pos
    </span>
  );
}
