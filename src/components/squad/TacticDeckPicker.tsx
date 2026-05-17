import type { Formation, Mentality } from '@/engine/matchSim';
import type { TacticCard } from '@/types/tactics';
import { SHAPE_CARDS, TEMPO_CARDS } from '@/data/tacticCards';
import { useGameStore } from '@/store/gameStore';

interface TacticDeckPickerProps {
  formation: Formation;
  mentality: Mentality;
  onFormationChange: (f: Formation) => void;
  onMentalityChange: (m: Mentality) => void;
}

/**
 * Phase A picker — three slots laid out vertically. Shape and Tempo
 * are populated with the baseline 6 + 3 cards (a re-skin of formation
 * + mentality). Instruction is locked with a Phase B placeholder.
 *
 * The combined ATK/DEF totals are shown at the top so the player can
 * see the impact of their loadout at a glance.
 */
export function TacticDeckPicker({
  formation,
  mentality,
  onFormationChange,
  onMentalityChange,
}: TacticDeckPickerProps) {
  const preferredFormation = useGameStore((s) => s.manager?.preferredFormation);

  const activeShape = SHAPE_CARDS.find((c) => c.formation === formation) ?? SHAPE_CARDS[0];
  const activeTempo = TEMPO_CARDS.find((c) => c.mentality === mentality) ?? TEMPO_CARDS[0];

  const totalAtk = activeShape.atkMod + activeTempo.atkMod;
  const totalDef = activeShape.defMod + activeTempo.defMod;

  return (
    <div className="plm-space-y-5">
      <header className="plm-flex plm-items-baseline plm-justify-between plm-gap-3">
        <div>
          <h3 className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">
            Tactic Loadout
          </h3>
          <p className="plm-text-[11px] plm-text-warm-400 plm-mt-0.5">
            Play three cards. Their effects combine before kickoff.
          </p>
        </div>
        <LoadoutTotals atk={totalAtk} def={totalDef} />
      </header>

      <SlotSection label="Shape" hint="How the team lines up" slotIndex={1}>
        <CardRow>
          {SHAPE_CARDS.map((card) => (
            <TacticMiniCard
              key={card.id}
              card={card}
              active={card.formation === formation}
              starred={card.formation === preferredFormation}
              onClick={() => card.formation && onFormationChange(card.formation)}
            />
          ))}
        </CardRow>
      </SlotSection>

      <SlotSection label="Tempo" hint="Posture and intent" slotIndex={2}>
        <CardRow>
          {TEMPO_CARDS.map((card) => (
            <TacticMiniCard
              key={card.id}
              card={card}
              active={card.mentality === mentality}
              onClick={() => card.mentality && onMentalityChange(card.mentality)}
            />
          ))}
        </CardRow>
      </SlotSection>

      <SlotSection label="Instruction" hint="A special play card" slotIndex={3} locked>
        <LockedSlot />
      </SlotSection>
    </div>
  );
}

function LoadoutTotals({ atk, def }: { atk: number; def: number }) {
  return (
    <div className="plm-flex plm-gap-2 plm-text-[10px] plm-font-semibold plm-tabular-nums">
      <ModBadge label="ATK" value={atk} />
      <ModBadge label="DEF" value={def} />
    </div>
  );
}

function ModBadge({ label, value }: { label: string; value: number }) {
  const tone = value > 0
    ? 'plm-text-emerald-700 plm-bg-emerald-50 plm-border-emerald-200'
    : value < 0
      ? 'plm-text-red-700 plm-bg-red-50 plm-border-red-200'
      : 'plm-text-warm-600 plm-bg-warm-50 plm-border-warm-200';
  return (
    <span className={`plm-inline-flex plm-items-center plm-gap-1 plm-px-2 plm-py-1 plm-rounded plm-border ${tone}`}>
      <span className="plm-text-warm-500 plm-tracking-wider">{label}</span>
      <span>{value > 0 ? '+' : ''}{value}</span>
    </span>
  );
}

function SlotSection({
  label,
  hint,
  slotIndex,
  locked,
  children,
}: {
  label: string;
  hint: string;
  slotIndex: number;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-2">
        <div className="plm-flex plm-items-baseline plm-gap-2">
          <span className="plm-text-[10px] plm-font-bold plm-text-warm-400 plm-tabular-nums">
            {String(slotIndex).padStart(2, '0')}
          </span>
          <h4 className="plm-text-xs plm-font-semibold plm-text-charcoal plm-uppercase plm-tracking-wider">
            {label}
          </h4>
          {locked && (
            <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-amber-700 plm-bg-amber-50 plm-border plm-border-amber-200 plm-px-1.5 plm-py-0.5 plm-rounded">
              Locked
            </span>
          )}
        </div>
        <span className="plm-text-[10px] plm-text-warm-400 plm-italic">{hint}</span>
      </div>
      {children}
    </section>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  // Horizontal scroll on mobile, grid on md+. Cards stay 44px+ tall for
  // touch-target compliance.
  return (
    <div className="plm-flex plm-gap-2 plm-overflow-x-auto plm-pb-1 -plm-mx-1 plm-px-1 md:plm-grid md:plm-grid-cols-3 md:plm-overflow-visible md:plm-mx-0 md:plm-px-0">
      {children}
    </div>
  );
}

interface MiniCardProps {
  card: TacticCard;
  active: boolean;
  starred?: boolean;
  onClick: () => void;
}

function TacticMiniCard({ card, active, starred, onClick }: MiniCardProps) {
  const subtitle = card.formation ?? formatMentality(card.mentality);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${card.name}: ${card.description}`}
      className={`plm-relative plm-flex-shrink-0 plm-w-[8.5rem] md:plm-w-auto plm-min-h-[88px] plm-rounded-lg plm-border plm-text-left plm-px-2.5 plm-py-2 plm-transition-all plm-duration-200 plm-overflow-hidden ${
        active
          ? 'plm-bg-charcoal plm-text-warm-50 plm-border-charcoal plm-shadow-md plm-scale-[1.02]'
          : 'plm-bg-warm-50 plm-text-warm-800 plm-border-warm-200 hover:plm-border-warm-400 hover:plm-bg-white'
      }`}
    >
      {/* Bronze tier accent at the bottom — Phase B can swap to tier colour */}
      <span
        aria-hidden="true"
        className={`plm-absolute plm-bottom-0 plm-left-0 plm-right-0 plm-h-0.5 ${
          active ? 'plm-bg-amber-400' : 'plm-bg-amber-700/40'
        }`}
      />
      <div className="plm-flex plm-items-start plm-justify-between plm-gap-1">
        <span className={`plm-text-[10px] plm-font-bold plm-tabular-nums plm-uppercase plm-tracking-wider ${
          active ? 'plm-text-warm-300' : 'plm-text-warm-500'
        }`}>
          {subtitle}
        </span>
        {starred && (
          <span className={`plm-text-[10px] plm-font-bold ${active ? 'plm-text-amber-300' : 'plm-text-amber-600'}`} aria-label="Preferred formation">
            ★
          </span>
        )}
      </div>
      <div className={`plm-font-display plm-font-bold plm-text-sm plm-leading-tight plm-mt-1 ${
        active ? 'plm-text-warm-50' : 'plm-text-charcoal'
      }`}>
        {card.name}
      </div>
      <div className="plm-flex plm-gap-2 plm-mt-2 plm-text-[10px] plm-font-semibold plm-tabular-nums">
        <ModInline tone={active ? 'inverted' : 'normal'} label="ATK" value={card.atkMod} />
        <ModInline tone={active ? 'inverted' : 'normal'} label="DEF" value={card.defMod} />
      </div>
    </button>
  );
}

function ModInline({ label, value, tone }: { label: string; value: number; tone: 'normal' | 'inverted' }) {
  const colour = value > 0
    ? (tone === 'inverted' ? 'plm-text-emerald-300' : 'plm-text-emerald-600')
    : value < 0
      ? (tone === 'inverted' ? 'plm-text-red-300' : 'plm-text-red-500')
      : (tone === 'inverted' ? 'plm-text-warm-400' : 'plm-text-warm-500');
  return (
    <span className={colour}>
      {label} {value > 0 ? '+' : ''}{value}
    </span>
  );
}

function LockedSlot() {
  return (
    <div className="plm-rounded-lg plm-border plm-border-dashed plm-border-warm-300 plm-bg-warm-50/50 plm-px-3 plm-py-4 plm-text-center">
      <div className="plm-text-[11px] plm-font-semibold plm-text-warm-600 plm-mb-1">
        Special Play Cards
      </div>
      <p className="plm-text-[10px] plm-text-warm-500 plm-leading-relaxed">
        Coming soon. Earn instruction cards from match wins, cup runs, and post-season packs.
        Each one bends the rules — conditional bonuses, derby-day kickers, underdog plays.
      </p>
    </div>
  );
}

function formatMentality(m: Mentality | undefined): string {
  if (!m) return '';
  return m.charAt(0).toUpperCase() + m.slice(1);
}
