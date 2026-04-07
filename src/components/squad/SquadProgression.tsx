import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player } from '../../types/entities';
import { useModalParams } from '../../hooks/useModalParams';

type ProgressionSort = 'form_trend' | 'goals' | 'biggest_climbers' | 'biggest_droppers';

/** Compute trend arrow from last 3+ form entries */
function getTrendArrow(formHistory: number[]): string {
  if (formHistory.length < 3) return '\u2192'; // flat arrow for < 3 entries
  const last3 = formHistory.slice(-3);
  const diff = last3[2] - last3[0];
  if (diff >= 4) return '\u2197\u2197';
  if (diff >= 2) return '\u2197';
  if (diff <= -4) return '\u2198\u2198';
  if (diff <= -2) return '\u2198';
  return '\u2192';
}

function getTrendColor(arrow: string): string {
  if (arrow.includes('\u2197')) return 'plm-text-emerald-600';
  if (arrow.includes('\u2198')) return 'plm-text-red-600';
  return 'plm-text-warm-400';
}

/** Micro sparkline SVG for form history */
function FormSparkline({ formHistory }: { formHistory: number[] }) {
  if (formHistory.length === 0) {
    // Single neutral dot + badge
    return (
      <div className="plm-flex plm-items-center plm-gap-1.5">
        <svg width="24" height="16" viewBox="0 0 24 16" className="plm-flex-shrink-0">
          <circle cx="12" cy="8" r="3" fill="#9CA3AF" />
        </svg>
        <span className="plm-text-[9px] plm-text-warm-400 plm-bg-warm-100 plm-px-1 plm-py-0.5 plm-rounded plm-whitespace-nowrap">
          New to club
        </span>
      </div>
    );
  }

  const width = 60;
  const height = 20;
  const padding = 3;
  const dotRadius = 2;

  // Map form values (-5 to +5) to SVG y coordinates
  const yScale = (form: number) => {
    const normalized = (form + 5) / 10; // 0 to 1
    return height - padding - normalized * (height - 2 * padding);
  };

  const xStep = formHistory.length > 1
    ? (width - 2 * padding) / (formHistory.length - 1)
    : 0;

  const points = formHistory.map((form, i) => ({
    x: padding + i * xStep,
    y: yScale(form),
    form,
  }));

  if (formHistory.length <= 2) {
    // Dots only, no line
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="plm-flex-shrink-0">
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={dotRadius + 0.5}
            fill={getFormDotColor(p.form)}
          />
        ))}
      </svg>
    );
  }

  // Full sparkline with line + dots
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="plm-flex-shrink-0">
      <path d={pathD} fill="none" stroke="#9CA3AF" strokeWidth="1" opacity="0.5" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={dotRadius}
          fill={getFormDotColor(p.form)}
        />
      ))}
    </svg>
  );
}

function getFormDotColor(form: number): string {
  if (form >= 2) return '#059669'; // emerald-600
  if (form <= -2) return '#DC2626'; // red-600
  return '#9CA3AF'; // gray-400
}

export function SquadProgression() {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const tempFillIns = useGameStore((s) => s.tempFillIns);
  const [sortKey, setSortKey] = useState<ProgressionSort>('form_trend');
  const { openModal } = useModalParams();

  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  const players = useMemo(() => {
    if (!playerClub) return [];
    const roster = [...playerClub.roster];
    const temps = tempFillIns.filter((p) => !roster.some((r) => r.id === p.id));
    // Exclude temporary fill-ins from progression view
    const allNonTemp = [...roster, ...temps].filter((p) => !p.isTemporary);

    return allNonTemp.sort((a, b) => {
      switch (sortKey) {
        case 'form_trend': {
          const trendA = formTrendValue(a.formHistory);
          const trendB = formTrendValue(b.formHistory);
          return trendB - trendA;
        }
        case 'goals':
          return b.goals - a.goals;
        case 'biggest_climbers': {
          const deltaA = formTrendValue(a.formHistory);
          const deltaB = formTrendValue(b.formHistory);
          return deltaB - deltaA;
        }
        case 'biggest_droppers': {
          const deltaA = formTrendValue(a.formHistory);
          const deltaB = formTrendValue(b.formHistory);
          return deltaA - deltaB;
        }
        default:
          return 0;
      }
    });
  }, [playerClub, tempFillIns, sortKey]);

  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-3">
        <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal">
          Progression
        </h2>
      </div>

      {/* Sort options */}
      <div className="plm-flex plm-items-center plm-gap-1 plm-mb-3 plm-flex-wrap" role="group" aria-label="Sort progression">
        <span className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-wider plm-mr-1">Sort:</span>
        {([
          ['form_trend', 'Form'],
          ['goals', 'Goals'],
          ['biggest_climbers', 'Risers'],
          ['biggest_droppers', 'Droppers'],
        ] as [ProgressionSort, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            aria-pressed={sortKey === key}
            className={`plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-wider plm-px-2 plm-py-1.5 plm-rounded plm-min-h-[36px] ${
              sortKey === key
                ? 'plm-bg-warm-200 plm-text-charcoal'
                : 'plm-text-warm-400 hover:plm-text-warm-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="plm-hidden md:plm-block">
        <table className="plm-w-full plm-text-sm" role="table">
          <caption className="plm-sr-only">Squad progression</caption>
          <thead>
            <tr className="plm-border-b plm-border-warm-200">
              <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">Pos</th>
              <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Name</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-20">Sparkline</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-10">Trend</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">Form</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">G</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">A</th>
              <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">CS</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <DesktopProgressionRow
                key={player.id}
                player={player}
                onOpenModal={() => openModal(player.id, playerClub!.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards with inline sparkline */}
      <div className="md:plm-hidden plm-space-y-1">
        {players.map((player) => (
          <MobileProgressionCard
            key={player.id}
            player={player}
            onOpenModal={() => openModal(player.id, playerClub!.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopProgressionRow({ player, onOpenModal }: { player: Player; onOpenModal: () => void }) {
  const arrow = getTrendArrow(player.formHistory);
  const trendColor = getTrendColor(arrow);

  return (
    <tr
      onClick={onOpenModal}
      className="plm-border-b plm-border-warm-100 plm-transition-colors hover:plm-bg-warm-50 plm-cursor-pointer"
    >
      <td className="plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase">{player.position}</td>
      <td className="plm-py-2">
        <span className="plm-text-sm plm-font-medium plm-text-charcoal">{player.name}</span>
      </td>
      <td className="plm-py-2 plm-text-center">
        <div className="plm-flex plm-justify-center">
          <FormSparkline formHistory={player.formHistory} />
        </div>
      </td>
      <td className="plm-py-2 plm-text-center">
        {player.formHistory.length >= 3 && (
          <span className={`plm-text-base plm-font-bold ${trendColor}`}>{arrow}</span>
        )}
      </td>
      <td className="plm-py-2 plm-text-center">
        <FormBadgeSmall form={player.form} />
      </td>
      <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.goals}</td>
      <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.assists}</td>
      <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.cleanSheets}</td>
    </tr>
  );
}

function MobileProgressionCard({ player, onOpenModal }: { player: Player; onOpenModal: () => void }) {
  const arrow = getTrendArrow(player.formHistory);
  const trendColor = getTrendColor(arrow);

  return (
    <button
      onClick={onOpenModal}
      className="plm-w-full plm-flex plm-items-center plm-gap-2 plm-p-3 plm-min-h-[44px] plm-text-left plm-rounded plm-border plm-border-warm-100 plm-bg-white hover:plm-bg-warm-50 plm-transition-colors"
    >
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-tracking-wider">
        {player.position}
      </span>
      <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
      </span>
      <FormSparkline formHistory={player.formHistory} />
      {player.formHistory.length >= 3 && (
        <span className={`plm-text-sm plm-font-bold ${trendColor}`}>{arrow}</span>
      )}
      <FormBadgeSmall form={player.form} />
      <span className="plm-text-[10px] plm-text-warm-500 plm-tabular-nums plm-w-12 plm-text-right">
        {player.goals}G {player.assists}A
      </span>
    </button>
  );
}

function FormBadgeSmall({ form }: { form: number }) {
  if (form >= 2) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form >= 1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form <= -2) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  if (form <= -1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  return <span className="plm-text-[9px] plm-text-warm-400 plm-px-1 plm-py-0.5">0</span>;
}

function formTrendValue(formHistory: number[]): number {
  if (formHistory.length < 3) return 0;
  return formHistory[formHistory.length - 1] - formHistory[formHistory.length - 3];
}
