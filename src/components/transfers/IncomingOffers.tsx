import { useMemo } from 'react';
import type { TransferOffer, Club } from '../../types/entities';
import { useModalParams } from '../../hooks/useModalParams';

interface IncomingOffersProps {
  offers: TransferOffer[];
  clubs: Club[];
  playerClubId: string;
  onRespond: (offer: TransferOffer, accept: boolean) => void;
}

interface OfferGroup {
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerOverall: number;
  playerAge: number;
  offers: TransferOffer[];
  topFee: number;
}

export function IncomingOffers({ offers, clubs, playerClubId, onRespond }: IncomingOffersProps) {
  const { openModal } = useModalParams();

  const getClubName = (clubId: string) =>
    clubs.find((c) => c.id === clubId)?.name || clubId;

  const getClubColor = (clubId: string) =>
    clubs.find((c) => c.id === clubId)?.colors.primary || '#666';

  const groups = useMemo<OfferGroup[]>(() => {
    const byPlayer = new Map<string, OfferGroup>();
    for (const offer of offers) {
      const existing = byPlayer.get(offer.playerId);
      if (existing) {
        existing.offers.push(offer);
        if (offer.fee > existing.topFee) existing.topFee = offer.fee;
      } else {
        byPlayer.set(offer.playerId, {
          playerId: offer.playerId,
          playerName: offer.playerName,
          playerPosition: offer.playerPosition,
          playerOverall: offer.playerOverall,
          playerAge: offer.playerAge,
          offers: [offer],
          topFee: offer.fee,
        });
      }
    }
    const list = Array.from(byPlayer.values());
    // Sort each group's offers by fee desc so the best bid shows first
    for (const g of list) g.offers.sort((a, b) => b.fee - a.fee);
    // Multi-offer groups first, then by top fee desc
    list.sort((a, b) => {
      if (b.offers.length !== a.offers.length) return b.offers.length - a.offers.length;
      return b.topFee - a.topFee;
    });
    return list;
  }, [offers]);

  if (offers.length === 0) {
    return (
      <div>
        <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">
          Incoming Offers
        </h2>
        <p className="plm-text-sm plm-text-gray-400 plm-text-center plm-py-8">
          No incoming offers.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">
        Incoming Offers
      </h2>
      <div className="plm-grid plm-grid-cols-1 lg:plm-grid-cols-2 plm-gap-2">
        {groups.map((group) => (
          <div
            key={group.playerId}
            className="plm-bg-white plm-rounded-lg plm-border plm-border-blue-200 plm-p-3"
          >
            <div className="plm-flex plm-items-start plm-justify-between plm-gap-2 plm-mb-2">
              <div
                className="plm-min-w-0 plm-cursor-pointer hover:plm-opacity-70 plm-transition-opacity"
                onClick={() => openModal(group.playerId, playerClubId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(group.playerId, playerClubId); } }}
                aria-label={`View ${group.playerName} player card`}
              >
                <div className="plm-text-sm plm-font-semibold plm-text-blue-700 plm-underline plm-decoration-blue-300 plm-truncate">
                  {group.playerName}
                </div>
                <div className="plm-text-xs plm-text-gray-500">
                  {group.playerPosition} &middot; {group.playerOverall} OVR &middot; Age {group.playerAge}
                </div>
              </div>
              {group.offers.length > 1 && (
                <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-bg-blue-50 plm-text-blue-700 plm-border plm-border-blue-200 plm-rounded-full plm-px-2 plm-py-0.5 plm-flex-shrink-0">
                  {group.offers.length} bids
                </span>
              )}
            </div>

            <div className="plm-space-y-2">
              {group.offers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className={`plm-rounded plm-p-2 ${
                    group.offers.length > 1 && idx === 0
                      ? 'plm-bg-green-50 plm-border plm-border-green-200'
                      : 'plm-bg-gray-50 plm-border plm-border-gray-200'
                  }`}
                >
                  <div className="plm-flex plm-items-center plm-gap-2 plm-mb-2">
                    <div
                      className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
                      style={{ backgroundColor: getClubColor(offer.toClubId) }}
                    />
                    <div className="plm-flex-1 plm-min-w-0 plm-text-xs plm-text-gray-700 plm-truncate">
                      <span className="plm-font-medium">{getClubName(offer.toClubId)}</span>
                      {group.offers.length > 1 && idx === 0 && (
                        <span className="plm-ml-1.5 plm-text-[10px] plm-font-semibold plm-text-green-700 plm-uppercase plm-tracking-wider">
                          Top bid
                        </span>
                      )}
                    </div>
                    <span className="plm-text-sm plm-font-bold plm-text-green-700 plm-flex-shrink-0">
                      &pound;{offer.fee.toFixed(1)}M
                    </span>
                  </div>
                  <div className="plm-flex plm-gap-2">
                    <button
                      onClick={() => onRespond(offer, true)}
                      aria-label={`Accept offer of £${offer.fee.toFixed(1)}M for ${offer.playerName}`}
                      className="plm-flex-1 plm-bg-green-600 plm-text-white plm-text-sm plm-font-medium plm-px-3 plm-py-2.5 plm-rounded hover:plm-bg-green-700 plm-transition-colors plm-min-h-[44px]"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onRespond(offer, false)}
                      aria-label={`Reject offer for ${offer.playerName} from ${getClubName(offer.toClubId)}`}
                      className="plm-flex-1 plm-text-sm plm-font-medium plm-text-gray-700 plm-px-3 plm-py-2.5 plm-rounded plm-border plm-border-gray-300 hover:plm-bg-gray-50 plm-transition-colors plm-min-h-[44px]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {group.offers.length > 1 && (
              <button
                onClick={() => {
                  for (const offer of group.offers) onRespond(offer, false);
                }}
                aria-label={`Reject all ${group.offers.length} offers for ${group.playerName}`}
                className="plm-w-full plm-mt-2 plm-text-xs plm-font-medium plm-text-red-700 plm-bg-red-50 plm-border plm-border-red-200 plm-rounded plm-px-3 plm-py-2.5 hover:plm-bg-red-100 plm-transition-colors plm-min-h-[44px]"
              >
                Reject all {group.offers.length} offers
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
