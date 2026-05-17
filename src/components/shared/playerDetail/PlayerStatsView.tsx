import { OwnClubActions } from './OwnClubActions';
import { OtherClubActions } from './OtherClubActions';
import { StatBox } from './StatBox';
import { getClubLogoUrl } from '@/data/assets';
import { STAT_KEYS, getStatLabel, getStatLongName } from '@/utils/statLabels';
import type { Player, Club } from '@/types/entities';
import type { SigningCelebrationData } from '../SigningCelebrationModal';

// Slot colors carry across positions — for GK the slot still represents the
// same column of the underlying storage, just labelled differently.
const STAT_COLORS: Record<string, string> = {
  ATK: 'plm-bg-red-500',
  DEF: 'plm-bg-blue-500',
  MOV: 'plm-bg-green-500',
  PWR: 'plm-bg-amber-500',
  MEN: 'plm-bg-purple-500',
  SKL: 'plm-bg-teal-500',
};

function getFormColor(form: number): string {
  if (form >= 3) return 'plm-bg-emerald-100 plm-text-emerald-700';
  if (form >= 1) return 'plm-bg-emerald-50 plm-text-emerald-600';
  if (form <= -3) return 'plm-bg-red-100 plm-text-red-700';
  if (form <= -1) return 'plm-bg-red-50 plm-text-red-600';
  return 'plm-bg-warm-100 plm-text-warm-600';
}

function formatFormValue(form: number): string {
  if (form > 0) return `+${form}`;
  return `${form}`;
}

interface PlayerStatsViewProps {
  player: Player;
  targetClub: Club;
  clubId: string;
  marketValue: number;
  isOwnClub: boolean;
  isListed: boolean;
  isOnShortlist: boolean;
  isTransferWindow: boolean;
  playerTransferred: boolean;
  onListForSale: () => void;
  onToggleShortlist: () => void;
  onCelebration: (data: SigningCelebrationData) => void;
}

/**
 * Alternate view: attribute bars, form chip, season stats, market value,
 * club, then the action set. Reached via the card-vs-stats toggle in the
 * modal header.
 */
export function PlayerStatsView({
  player,
  targetClub,
  clubId,
  marketValue,
  isOwnClub,
  isListed,
  isOnShortlist,
  isTransferWindow,
  playerTransferred,
  onListForSale,
  onToggleShortlist,
  onCelebration,
}: PlayerStatsViewProps) {
  return (
    <div className="plm-px-5 plm-pt-4 plm-space-y-5">
      {/* Stats bars */}
      <div>
        <h3 className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400 plm-mb-2">
          Attributes
        </h3>
        <div className="plm-space-y-2">
          {STAT_KEYS.map((stat) => {
            const value = player.stats[stat];
            const pct = Math.round((value / 99) * 100);
            const label = getStatLabel(player.position, stat);
            const longName = getStatLongName(player.position, stat);
            return (
              <div key={stat} className="plm-flex plm-items-center plm-gap-2">
                <span
                  className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-500 plm-w-8 plm-text-right"
                  title={longName}
                >
                  {label}
                </span>
                <div className="plm-flex-1 plm-h-2.5 plm-bg-warm-100 plm-rounded-full plm-overflow-hidden">
                  <div
                    className={`plm-h-full plm-rounded-full plm-transition-all ${STAT_COLORS[stat]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="plm-text-xs plm-font-bold plm-tabular-nums plm-text-charcoal plm-w-7 plm-text-right">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className="plm-flex plm-items-center plm-gap-3">
        <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
          Form
        </span>
        <span
          className={`plm-text-sm plm-font-bold plm-px-3 plm-py-1 plm-rounded-full ${getFormColor(player.form)}`}
        >
          {formatFormValue(player.form)}
        </span>
      </div>

      {/* Season stats */}
      {!player.isTemporary && (
        <div>
          <h3 className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400 plm-mb-2">
            Season Stats
          </h3>
          <div className="plm-grid plm-grid-cols-3 plm-gap-2">
            <StatBox label="Goals" value={player.goals} />
            <StatBox label="Assists" value={player.assists} />
            <StatBox label="Clean Sheets" value={player.cleanSheets} />
          </div>
        </div>
      )}

      {/* Market value */}
      <div className="plm-flex plm-items-center plm-justify-between plm-bg-warm-50 plm-rounded-lg plm-px-4 plm-py-3">
        <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
          Market Value
        </span>
        <span className="plm-text-lg plm-font-bold plm-text-charcoal">
          &pound;{marketValue.toFixed(1)}M
        </span>
      </div>

      {/* Club */}
      <div className="plm-flex plm-items-center plm-gap-2 plm-text-xs plm-text-warm-500">
        <img
          src={getClubLogoUrl(targetClub.id)}
          alt=""
          className="plm-w-5 plm-h-5 plm-flex-shrink-0 plm-object-contain"
        />
        <span>{targetClub.name}</span>
      </div>

      {/* Action buttons */}
      {!player.isTemporary && (
        <div className="plm-space-y-2 plm-pt-1">
          {isOwnClub ? (
            <OwnClubActions
              player={player}
              clubId={clubId}
              isListed={isListed}
              isTransferWindow={isTransferWindow}
              onListForSale={onListForSale}
            />
          ) : (
            <OtherClubActions
              player={player}
              clubId={clubId}
              isOnShortlist={isOnShortlist}
              isTransferWindow={isTransferWindow}
              playerTransferred={playerTransferred}
              onToggleShortlist={onToggleShortlist}
              onCelebration={onCelebration}
            />
          )}
        </div>
      )}
    </div>
  );
}
