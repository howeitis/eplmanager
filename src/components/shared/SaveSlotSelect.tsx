import { useState, useEffect } from 'react';
import type { GamePhase, SaveMetadata } from '../../types/entities';
import { getAllSaveMetadata, deleteSave } from '../../utils/save';
import { getManagerFaceUri } from '../../utils/avatarFace';
import { getBrandLogoUrl, getHeroImageUrl } from '../../data/assets';

const PHASE_LABELS: Record<GamePhase, string> = {
  summer_window: 'Summer Window',
  july_advance: 'July',
  august: 'August',
  august_deadline: 'August Deadline',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  january_window: 'January Window',
  january: 'January',
  january_deadline: 'January Deadline',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  season_end: 'Season End',
};

interface SaveSlotSelectProps {
  onSelectSlot: (slot: number, isExisting: boolean) => void;
}

export function SaveSlotSelect({ onSelectSlot }: SaveSlotSelectProps) {
  const [metadata, setMetadata] = useState<Record<number, SaveMetadata>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSaveMetadata().then((data) => {
      setMetadata(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this save?')) {
      await deleteSave(slot);
      const updated = await getAllSaveMetadata();
      setMetadata(updated);
    }
  };

  if (loading) {
    return (
      <div className="plm-fixed plm-inset-0 plm-flex plm-items-center plm-justify-center" style={{ backgroundColor: '#0a0a12' }}>
        <p className="plm-text-warm-400">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="plm-fixed plm-inset-0 plm-flex plm-flex-col plm-items-center plm-justify-center plm-min-h-screen plm-overflow-hidden"
      style={{ backgroundColor: '#0a0a12' }}
    >
      {/* Blurred hero background */}
      <div
        className="plm-absolute plm-inset-0 plm-bg-cover plm-bg-center plm-opacity-30"
        style={{
          backgroundImage: `url(${getHeroImageUrl()})`,
          filter: 'blur(8px) brightness(0.5)',
          transform: 'scale(1.05)',
        }}
      />

      {/* Dark gradient overlay */}
      <div className="plm-absolute plm-inset-0 plm-bg-gradient-to-b plm-from-black/70 plm-via-black/40 plm-to-black/80" />

      {/* Content */}
      <div className="plm-relative plm-z-10 plm-w-full plm-max-w-md plm-px-4 plm-py-8">
        {/* Logo + title */}
        <div className="plm-flex plm-flex-col plm-items-center plm-mb-8 plm-gap-3">
          <img
            src={getBrandLogoUrl()}
            alt="EPL Manager Logo"
            className="plm-w-16 plm-h-16 plm-object-contain plm-drop-shadow-lg"
          />
          <div className="plm-text-center">
            <h1 className="plm-font-display plm-text-2xl plm-font-black plm-text-white plm-tracking-tight plm-leading-none">
              Premier League
            </h1>
            <h2 className="plm-font-display plm-text-base plm-font-bold plm-text-amber-400 plm-tracking-wider plm-uppercase plm-mt-0.5">
              Manager
            </h2>
          </div>
          <p className="plm-text-warm-400 plm-text-xs plm-text-center plm-mt-1">
            Select a save slot to continue or start a new game
          </p>
        </div>

        <div className="plm-space-y-3">
          {[1, 2, 3].map((slot) => {
            const save = metadata[slot];
            return (
              <div
                key={slot}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSlot(slot, !!save)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSlot(slot, !!save); } }}
                aria-label={save ? `Load save slot ${slot}: ${save.clubName}, Season ${save.seasonNumber}${save.currentPhase ? `, ${PHASE_LABELS[save.currentPhase]}` : ''}${save.leaguePosition > 0 ? `, ${ordinal(save.leaguePosition)} place` : ''}` : `Start new game in slot ${slot}`}
                className="plm-w-full plm-rounded-lg plm-border plm-p-4 plm-text-left plm-transition-all plm-min-h-[44px] plm-cursor-pointer"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderColor: save ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.12)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = save ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = save ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.12)';
                }}
              >
                <div className="plm-flex plm-justify-between plm-items-start">
                  <div>
                    <div className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-wider plm-mb-1">
                      Slot {slot}
                    </div>
                    {save ? (
                      <>
                        {save.managerAvatar && save.managerName && (
                          <div className="plm-flex plm-items-center plm-gap-1.5 plm-mb-1">
                            <img
                              src={getManagerFaceUri(save.managerAvatar)}
                              alt=""
                              aria-hidden="true"
                              draggable={false}
                              className="plm-w-6 plm-h-6 plm-rounded-full plm-object-contain plm-bg-white/10"
                            />
                            <span className="plm-text-sm plm-font-medium plm-text-white">{save.managerName}</span>
                          </div>
                        )}
                        <div className="plm-font-semibold plm-text-amber-300">
                          {save.clubName}
                        </div>
                        <div className="plm-text-sm plm-text-warm-400 plm-mt-1">
                          Season {save.seasonNumber}
                          {save.currentPhase && (
                            <>
                              {' '}&middot; {PHASE_LABELS[save.currentPhase]}
                            </>
                          )}
                          {save.leaguePosition > 0 && (
                            <>
                              {' '}&middot; {ordinal(save.leaguePosition)} place
                            </>
                          )}
                        </div>
                        <div className="plm-text-xs plm-text-warm-600 plm-mt-1">
                          Last saved: {new Date(save.lastSaved).toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      <div className="plm-text-warm-500 plm-italic plm-text-sm">
                        Empty Slot — Start New Game
                      </div>
                    )}
                  </div>
                  {save && (
                    <button
                      onClick={(e) => handleDelete(slot, e)}
                      aria-label={`Delete save slot ${slot}`}
                      className="plm-text-xs plm-text-red-400 hover:plm-text-red-300 plm-px-2 plm-py-2.5 plm-min-h-[44px] plm-min-w-[44px] plm-flex plm-items-center plm-justify-center"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
