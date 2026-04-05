import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import type { TransferRecord, Club } from '../../types/entities';

type ScopeFilter = 'all' | 'my_club';
type TimeFilter = 'current_window' | 'current_season' | 'all_time';

interface TransferLedgerProps {
  clubs: Club[];
}

export function TransferLedger({ clubs }: TransferLedgerProps) {
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeFilter>('current_season');
  const { openModal } = useModalParams();

  const transferHistory = useGameStore((s) => s.transferHistory);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId || '';

  const currentWindow: 'summer' | 'january' =
    currentPhase === 'january_window' || currentPhase === 'january' ? 'january' : 'summer';

  const filtered = useMemo(() => {
    let records = [...transferHistory];

    // Time filter
    if (timeRange === 'current_window') {
      records = records.filter((r) => r.season === seasonNumber && r.window === currentWindow);
    } else if (timeRange === 'current_season') {
      records = records.filter((r) => r.season === seasonNumber);
    }
    // all_time: no filter

    // Scope filter
    if (scope === 'my_club') {
      records = records.filter((r) => r.fromClubId === playerClubId || r.toClubId === playerClubId);
    }

    return records;
  }, [transferHistory, timeRange, scope, seasonNumber, currentWindow, playerClubId]);

  const netSpend = useMemo(() => {
    let spend = 0;
    let income = 0;

    for (const record of filtered) {
      if (record.toClubId === playerClubId) {
        // Player bought
        spend += record.fee;
      } else if (record.fromClubId === playerClubId) {
        // Player sold
        income += record.fee;
      }
    }

    return Math.round((income - spend) * 10) / 10;
  }, [filtered, playerClubId]);

  const getClubName = (clubId: string) => {
    if (clubId === 'continent') return 'Abroad';
    return clubs.find((c) => c.id === clubId)?.shortName || clubId;
  };

  const findPlayerClubId = (record: TransferRecord): string | null => {
    // Try to find the current club that has this player
    for (const club of clubs) {
      if (club.roster.some((p) => p.id === record.playerId)) return club.id;
    }
    return null;
  };

  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">Transfer Ledger</h2>

      {/* Scope toggle */}
      <div className="plm-flex plm-gap-2 plm-mb-2">
        <button
          onClick={() => setScope('all')}
          aria-pressed={scope === 'all'}
          className={`plm-text-xs plm-font-medium plm-px-3 plm-py-2 plm-rounded plm-border plm-transition-colors plm-min-h-[44px] ${
            scope === 'all'
              ? 'plm-bg-gray-900 plm-text-white plm-border-gray-900'
              : 'plm-bg-white plm-text-gray-600 plm-border-gray-300 hover:plm-border-gray-400'
          }`}
        >
          All League
        </button>
        <button
          onClick={() => setScope('my_club')}
          aria-pressed={scope === 'my_club'}
          className={`plm-text-xs plm-font-medium plm-px-3 plm-py-2 plm-rounded plm-border plm-transition-colors plm-min-h-[44px] ${
            scope === 'my_club'
              ? 'plm-bg-gray-900 plm-text-white plm-border-gray-900'
              : 'plm-bg-white plm-text-gray-600 plm-border-gray-300 hover:plm-border-gray-400'
          }`}
        >
          My Club Only
        </button>
      </div>

      {/* Time range toggle */}
      <div className="plm-flex plm-gap-2 plm-mb-3">
        {([
          ['current_window', 'This Window'],
          ['current_season', 'This Season'],
          ['all_time', 'All-Time'],
        ] as [TimeFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            aria-pressed={timeRange === value}
            className={`plm-text-xs plm-font-medium plm-px-3 plm-py-2 plm-rounded plm-border plm-transition-colors plm-min-h-[44px] ${
              timeRange === value
                ? 'plm-bg-gray-900 plm-text-white plm-border-gray-900'
                : 'plm-bg-white plm-text-gray-600 plm-border-gray-300 hover:plm-border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <p className="plm-text-sm plm-text-gray-400 plm-text-center plm-py-8">
          No transfers recorded.
        </p>
      ) : (
        <div className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-divide-y plm-divide-gray-100">
          {filtered.map((record, i) => {
            const isMyClub = record.fromClubId === playerClubId || record.toClubId === playerClubId;
            const currentClubId = findPlayerClubId(record);

            return (
              <div
                key={`${record.playerId}-${record.season}-${record.window}-${i}`}
                className={`plm-px-3 plm-py-2.5 plm-cursor-pointer hover:plm-bg-gray-50 plm-transition-colors ${
                  isMyClub ? 'plm-bg-blue-50/50' : ''
                }`}
                onClick={() => currentClubId && openModal(record.playerId, currentClubId)}
                role="button"
                tabIndex={0}
                aria-label={`View ${record.playerName} transfer details`}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && currentClubId) { e.preventDefault(); openModal(record.playerId, currentClubId); } }}
              >
                <div className="plm-flex plm-items-center plm-justify-between">
                  <div className="plm-flex-1 plm-min-w-0">
                    <div className="plm-text-sm plm-font-semibold plm-text-gray-900 plm-truncate">
                      {record.playerName}
                    </div>
                    <div className="plm-text-xs plm-text-gray-500">
                      {record.playerPosition} &middot; {record.playerOverall} OVR &middot; {record.playerAge}
                    </div>
                  </div>
                  <div className="plm-text-right plm-flex-shrink-0 plm-ml-2">
                    <div className="plm-text-sm plm-font-bold plm-text-green-700">
                      &pound;{record.fee.toFixed(1)}M
                    </div>
                    <div className="plm-text-xs plm-text-gray-400">
                      {record.window === 'summer' ? 'Sum' : 'Jan'} S{record.season}
                    </div>
                  </div>
                </div>
                <div className="plm-text-xs plm-text-gray-400 plm-mt-0.5">
                  {getClubName(record.fromClubId)} → {getClubName(record.toClubId)}
                  {record.isContinentSale && record.continentDestination && (
                    <span> ({record.continentDestination})</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Net spend footer */}
      <div className="plm-mt-3 plm-bg-gray-50 plm-rounded-lg plm-border plm-border-gray-200 plm-px-3 plm-py-2.5 plm-flex plm-items-center plm-justify-between">
        <span className="plm-text-xs plm-font-medium plm-text-gray-500">
          Net Spend ({timeRange === 'current_window' ? 'this window' : timeRange === 'current_season' ? 'this season' : 'all-time'})
        </span>
        <span className={`plm-text-sm plm-font-bold ${netSpend >= 0 ? 'plm-text-green-700' : 'plm-text-red-600'}`}>
          {netSpend >= 0 ? '+' : ''}&pound;{netSpend.toFixed(1)}M
        </span>
      </div>
    </div>
  );
}
