import type { Formation, Mentality } from '@/engine/matchSim';
import type { TacticCard } from '@/types/tactics';
import { MANAGER_SCHOOLS } from '@/types/tactics';
import { SHAPE_CARDS, TEMPO_CARDS } from '@/data/tacticCards';
import { INSTRUCTION_CARDS, getInstructionCard } from '@/data/instructionCards';
import { detectSchoolSetBonusFromCards, SET_BONUS_TSS } from '@/engine/setBonus';
import { useGameStore } from '@/store/gameStore';

interface TacticDeckPickerProps {
  formation: Formation;
  mentality: Mentality;
  onFormationChange: (f: Formation) => void;
  onMentalityChange: (m: Mentality) => void;
}

/**
 * Three-slot picker. Shape and Tempo are populated from the baseline
 * 6 + 3 cards (re-skin of formation + mentality). The Instruction slot
 * (Phase B) shows the manager's owned instruction cards plus a "None"
 * option — equipped card persists to the store and is read by the engine
 * on every match.
 *
 * The combined ATK/DEF totals at the top reflect Shape + Tempo only;
 * Instruction effects can be conditional, so we surface them per-card
 * with a "fires when" label rather than baking them into the total.
 */
export function TacticDeckPicker({
  formation,
  mentality,
  onFormationChange,
  onMentalityChange,
}: TacticDeckPickerProps) {
  const preferredFormation = useGameStore((s) => s.manager?.preferredFormation);
  const ownedTacticCards = useGameStore((s) => s.ownedTacticCards);
  const activeInstructionCardId = useGameStore((s) => s.activeInstructionCardId);
  const setActiveInstructionCardId = useGameStore((s) => s.setActiveInstructionCardId);

  const activeShape = SHAPE_CARDS.find((c) => c.formation === formation) ?? SHAPE_CARDS[0];
  const activeTempo = TEMPO_CARDS.find((c) => c.mentality === mentality) ?? TEMPO_CARDS[0];

  const totalAtk = activeShape.atkMod + activeTempo.atkMod;
  const totalDef = activeShape.defMod + activeTempo.defMod;

  // Phase D: school-set bonus pill. Reads the active loadout's school
  // intersection; renders when all three slots share at least one school.
  const setResult = detectSchoolSetBonusFromCards(
    activeShape,
    activeTempo,
    activeInstructionCardId ? (getInstructionCard(activeInstructionCardId) ?? null) : null,
  );

  // Filter to instruction cards the manager actually owns. The order matches
  // INSTRUCTION_CARDS so flat cards stay grouped before conditionals.
  const ownedSet = new Set(ownedTacticCards);
  const ownedInstructions = INSTRUCTION_CARDS.filter((c) => ownedSet.has(c.id));
  const activeInstruction = activeInstructionCardId ? getInstructionCard(activeInstructionCardId) : null;

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

      {setResult.tssDelta > 0 && setResult.school && (
        <div
          className="plm-flex plm-items-center plm-justify-between plm-gap-3 plm-rounded-lg plm-border plm-px-3 plm-py-2 plm-text-xs"
          style={{
            background: 'rgba(180, 142, 53, 0.12)',
            borderColor: 'rgba(180, 142, 53, 0.45)',
          }}
        >
          <div className="plm-flex plm-items-center plm-gap-2">
            <span
              className="plm-text-[10px] plm-font-bold plm-tracking-[0.3em] plm-uppercase"
              style={{ color: '#B48E35' }}
            >
              Set Active
            </span>
            <span className="plm-font-semibold plm-text-warm-100">
              {MANAGER_SCHOOLS[setResult.school].name}
            </span>
          </div>
          <span
            className="plm-text-[11px] plm-font-bold plm-tabular-nums"
            style={{ color: '#B48E35' }}
          >
            +{SET_BONUS_TSS} TSS
          </span>
        </div>
      )}

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

      <SlotSection
        label="Instruction"
        hint={activeInstruction ? cardSummary(activeInstruction) : 'A special play card'}
        slotIndex={3}
      >
        {ownedInstructions.length === 0 ? (
          <EmptyInstructions />
        ) : (
          <CardRow>
            <NoneCard
              active={!activeInstructionCardId}
              onClick={() => setActiveInstructionCardId(null)}
            />
            {ownedInstructions.map((card) => (
              <InstructionMiniCard
                key={card.id}
                card={card}
                active={card.id === activeInstructionCardId}
                onClick={() => setActiveInstructionCardId(card.id)}
              />
            ))}
          </CardRow>
        )}
      </SlotSection>
    </div>
  );
}

function cardSummary(card: TacticCard): string {
  if (card.effect?.conditionLabel) {
    return `${card.name} · ${card.effect.conditionLabel}`;
  }
  return card.name;
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

function EmptyInstructions() {
  return (
    <div className="plm-rounded-lg plm-border plm-border-dashed plm-border-warm-300 plm-bg-warm-50/50 plm-px-3 plm-py-4 plm-text-center">
      <div className="plm-text-[11px] plm-font-semibold plm-text-warm-600 plm-mb-1">
        No Instructions Yet
      </div>
      <p className="plm-text-[10px] plm-text-warm-500 plm-leading-relaxed">
        End the season to unlock your first instruction card.
      </p>
    </div>
  );
}

function NoneCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label="No instruction equipped"
      className={`plm-relative plm-flex-shrink-0 plm-w-[8.5rem] md:plm-w-auto plm-min-h-[88px] plm-rounded-lg plm-border plm-border-dashed plm-text-left plm-px-2.5 plm-py-2 plm-transition-all plm-duration-200 ${
        active
          ? 'plm-bg-charcoal/90 plm-text-warm-50 plm-border-charcoal plm-shadow-md plm-scale-[1.02]'
          : 'plm-bg-transparent plm-text-warm-500 plm-border-warm-300 hover:plm-border-warm-500 hover:plm-text-warm-700'
      }`}
    >
      <div className={`plm-text-[10px] plm-font-bold plm-tabular-nums plm-uppercase plm-tracking-wider ${
        active ? 'plm-text-warm-300' : 'plm-text-warm-400'
      }`}>
        Empty
      </div>
      <div className={`plm-font-display plm-font-bold plm-text-sm plm-leading-tight plm-mt-1 ${
        active ? 'plm-text-warm-50' : 'plm-text-warm-600'
      }`}>
        No Instruction
      </div>
      <div className={`plm-text-[10px] plm-mt-2 plm-italic ${
        active ? 'plm-text-warm-300' : 'plm-text-warm-500'
      }`}>
        Play it straight.
      </div>
    </button>
  );
}

function InstructionMiniCard({
  card,
  active,
  onClick,
}: {
  card: TacticCard;
  active: boolean;
  onClick: () => void;
}) {
  const isConditional = !!card.effect?.condition;
  const tagLabel = isConditional ? 'Conditional' : 'Always On';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${card.name}: ${card.description}`}
      className={`plm-relative plm-flex-shrink-0 plm-w-[10rem] md:plm-w-auto plm-min-h-[110px] plm-rounded-lg plm-border plm-text-left plm-px-2.5 plm-py-2 plm-transition-all plm-duration-200 plm-overflow-hidden ${
        active
          ? 'plm-bg-charcoal plm-text-warm-50 plm-border-charcoal plm-shadow-md plm-scale-[1.02]'
          : 'plm-bg-warm-50 plm-text-warm-800 plm-border-warm-200 hover:plm-border-warm-400 hover:plm-bg-white'
      }`}
    >
      <span
        aria-hidden="true"
        className={`plm-absolute plm-bottom-0 plm-left-0 plm-right-0 plm-h-0.5 ${
          active ? 'plm-bg-amber-400' : 'plm-bg-amber-700/40'
        }`}
      />
      <div className="plm-flex plm-items-start plm-justify-between plm-gap-1">
        <span className={`plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider ${
          active
            ? (isConditional ? 'plm-text-amber-300' : 'plm-text-warm-300')
            : (isConditional ? 'plm-text-amber-700' : 'plm-text-warm-500')
        }`}>
          {tagLabel}
        </span>
      </div>
      <div className={`plm-font-display plm-font-bold plm-text-sm plm-leading-tight plm-mt-1 ${
        active ? 'plm-text-warm-50' : 'plm-text-charcoal'
      }`}>
        {card.name}
      </div>
      <div className={`plm-text-[10px] plm-mt-1 plm-leading-snug plm-line-clamp-2 ${
        active ? 'plm-text-warm-300' : 'plm-text-warm-500'
      }`}>
        {card.description}
      </div>
      {card.effect && (
        <div className="plm-flex plm-flex-wrap plm-gap-x-2 plm-gap-y-0.5 plm-mt-2 plm-text-[10px] plm-font-semibold plm-tabular-nums">
          {card.effect.atkMod !== 0 && (
            <ModInline tone={active ? 'inverted' : 'normal'} label="ATK" value={card.effect.atkMod} />
          )}
          {card.effect.defMod !== 0 && (
            <ModInline tone={active ? 'inverted' : 'normal'} label="DEF" value={card.effect.defMod} />
          )}
          {card.effect.formMod !== 0 && (
            <ModInline tone={active ? 'inverted' : 'normal'} label="FORM" value={card.effect.formMod} />
          )}
        </div>
      )}
      {isConditional && card.effect?.conditionLabel && (
        <div className={`plm-text-[9px] plm-mt-1 plm-italic plm-leading-tight ${
          active ? 'plm-text-warm-300' : 'plm-text-warm-500'
        }`}>
          ⓘ {card.effect.conditionLabel}
        </div>
      )}
    </button>
  );
}

function formatMentality(m: Mentality | undefined): string {
  if (!m) return '';
  return m.charAt(0).toUpperCase() + m.slice(1);
}
