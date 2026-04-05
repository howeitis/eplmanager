import { useState } from 'react';
import type { Position, PlayerStats } from '../../types/entities';
import type { MarketFilters } from '../../store/marketSlice';

const POSITIONS: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
const STAT_KEYS: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

interface MarketFilterPanelProps {
  filters: MarketFilters;
  budget: number;
  onChangeFilters: (f: Partial<MarketFilters>) => void;
  onReset: () => void;
}

export function MarketFilterPanel({ filters, budget, onChangeFilters, onReset }: MarketFilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const togglePosition = (pos: Position) => {
    const current = filters.positions;
    const next = current.includes(pos)
      ? current.filter((p) => p !== pos)
      : [...current, pos];
    onChangeFilters({ positions: next });
  };

  return (
    <div className="plm-space-y-4">
      {/* Name search */}
      <div>
        <label htmlFor="filter-name" className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-block plm-mb-1">
          Search
        </label>
        <input
          id="filter-name"
          type="text"
          placeholder="Player name..."
          value={filters.nameSearch}
          onChange={(e) => onChangeFilters({ nameSearch: e.target.value })}
          className="plm-w-full plm-border plm-border-gray-300 plm-rounded plm-px-3 plm-py-2 plm-text-sm plm-min-h-[44px]"
        />
      </div>

      {/* Position multi-select */}
      <div>
        <div className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-mb-1">
          Position
        </div>
        <div className="plm-flex plm-flex-wrap plm-gap-1.5" role="group" aria-label="Filter by position">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              aria-pressed={filters.positions.includes(pos)}
              className={`plm-px-3 plm-py-2 plm-text-xs plm-font-medium plm-rounded plm-border plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
                filters.positions.includes(pos)
                  ? 'plm-bg-gray-900 plm-text-white plm-border-gray-900'
                  : 'plm-bg-white plm-text-gray-600 plm-border-gray-300 hover:plm-border-gray-400'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Age range */}
      <div>
        <div className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-mb-1">
          Age: {filters.ageMin}–{filters.ageMax}
        </div>
        <div className="plm-flex plm-items-center plm-gap-2">
          <input
            type="range"
            min={17}
            max={35}
            value={filters.ageMin}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChangeFilters({ ageMin: Math.min(v, filters.ageMax) });
            }}
            className="plm-flex-1 plm-min-h-[44px]"
            aria-label="Minimum age"
          />
          <input
            type="range"
            min={17}
            max={35}
            value={filters.ageMax}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChangeFilters({ ageMax: Math.max(v, filters.ageMin) });
            }}
            className="plm-flex-1 plm-min-h-[44px]"
            aria-label="Maximum age"
          />
        </div>
      </div>

      {/* Overall range */}
      <div>
        <div className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-mb-1">
          Overall: {filters.overallMin}–{filters.overallMax}
        </div>
        <div className="plm-flex plm-items-center plm-gap-2">
          <input
            type="range"
            min={0}
            max={99}
            value={filters.overallMin}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChangeFilters({ overallMin: Math.min(v, filters.overallMax) });
            }}
            className="plm-flex-1 plm-min-h-[44px]"
            aria-label="Minimum overall"
          />
          <input
            type="range"
            min={0}
            max={99}
            value={filters.overallMax}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChangeFilters({ overallMax: Math.max(v, filters.overallMin) });
            }}
            className="plm-flex-1 plm-min-h-[44px]"
            aria-label="Maximum overall"
          />
        </div>
      </div>

      {/* Max price */}
      <div>
        <div className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-mb-1">
          Max Price: {filters.maxPrice !== null ? `£${filters.maxPrice.toFixed(0)}M` : `£${budget.toFixed(0)}M (budget)`}
        </div>
        <input
          type="range"
          min={1}
          max={Math.max(Math.ceil(budget), 1)}
          value={filters.maxPrice !== null ? filters.maxPrice : Math.ceil(budget)}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            onChangeFilters({ maxPrice: v >= Math.ceil(budget) ? null : v });
          }}
          className="plm-w-full plm-min-h-[44px]"
          aria-label="Maximum price"
        />
      </div>

      {/* Advanced: stat thresholds */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="plm-text-xs plm-font-medium plm-text-gray-600 hover:plm-text-gray-900 plm-flex plm-items-center plm-gap-1 plm-min-h-[44px]"
          aria-expanded={showAdvanced}
        >
          <span className="plm-transition-transform" style={{ display: 'inline-block', transform: showAdvanced ? 'rotate(90deg)' : '' }}>
            ▸
          </span>
          Advanced Stats
        </button>
        {showAdvanced && (
          <div className="plm-space-y-2 plm-mt-2">
            {STAT_KEYS.map((stat) => (
              <div key={stat}>
                <div className="plm-flex plm-items-center plm-justify-between">
                  <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400">
                    {stat}
                  </span>
                  <span className="plm-text-xs plm-text-gray-600 plm-tabular-nums">
                    ≥ {filters.statThresholds[stat]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={filters.statThresholds[stat]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onChangeFilters({
                      statThresholds: { ...filters.statThresholds, [stat]: v },
                    });
                  }}
                  className="plm-w-full plm-min-h-[44px]"
                  aria-label={`Minimum ${stat}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="plm-w-full plm-py-2 plm-text-xs plm-font-medium plm-text-gray-500 hover:plm-text-gray-800 plm-border plm-border-gray-200 plm-rounded plm-transition-colors plm-min-h-[44px]"
      >
        Reset All Filters
      </button>
    </div>
  );
}
