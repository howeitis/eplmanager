import { useState, useEffect } from 'react';
import type { SaveMetadata } from '../../types/entities';
import { getAllSaveMetadata, deleteSave } from '../../utils/save';

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
      <div className="plm-flex plm-items-center plm-justify-center plm-min-h-screen plm-bg-gray-50">
        <p className="plm-text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="plm-min-h-screen plm-bg-gray-50 plm-px-4 plm-py-8">
      <div className="plm-max-w-md plm-mx-auto">
        <h1 className="plm-text-2xl plm-font-bold plm-text-gray-900 plm-text-center plm-mb-2">
          Premier League Manager
        </h1>
        <p className="plm-text-gray-500 plm-text-center plm-mb-8 plm-text-sm">
          Select a save slot to continue or start a new game
        </p>

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
                aria-label={save ? `Load save slot ${slot}: ${save.clubName}, Season ${save.seasonNumber}` : `Start new game in slot ${slot}`}
                className="plm-w-full plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-gray-200 plm-p-4 plm-text-left hover:plm-border-gray-400 plm-transition-colors plm-min-h-[44px] plm-cursor-pointer"
              >
                <div className="plm-flex plm-justify-between plm-items-start">
                  <div>
                    <div className="plm-text-xs plm-text-gray-400 plm-mb-1">
                      Slot {slot}
                    </div>
                    {save ? (
                      <>
                        <div className="plm-font-semibold plm-text-gray-900">
                          {save.clubName}
                        </div>
                        <div className="plm-text-sm plm-text-gray-500 plm-mt-1">
                          Season {save.seasonNumber} &middot; {ordinal(save.leaguePosition)} place
                        </div>
                        <div className="plm-text-xs plm-text-gray-400 plm-mt-1">
                          Last saved: {new Date(save.lastSaved).toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      <div className="plm-text-gray-400 plm-italic">
                        Empty Slot
                      </div>
                    )}
                  </div>
                  {save && (
                    <button
                      onClick={(e) => handleDelete(slot, e)}
                      aria-label={`Delete save slot ${slot}`}
                      className="plm-text-xs plm-text-red-400 hover:plm-text-red-600 plm-px-2 plm-py-2.5 plm-min-h-[44px] plm-min-w-[44px] plm-flex plm-items-center plm-justify-center"
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
