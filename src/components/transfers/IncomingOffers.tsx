import type { TransferOffer, Club } from '../../types/entities';

interface IncomingOffersProps {
  offers: TransferOffer[];
  clubs: Club[];
  onRespond: (offer: TransferOffer, accept: boolean) => void;
}

export function IncomingOffers({ offers, clubs, onRespond }: IncomingOffersProps) {
  const getClubName = (clubId: string) =>
    clubs.find((c) => c.id === clubId)?.name || clubId;

  const getClubColor = (clubId: string) =>
    clubs.find((c) => c.id === clubId)?.colors.primary || '#666';

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
      <div className="plm-space-y-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="plm-bg-white plm-rounded-lg plm-border plm-border-blue-200 plm-p-3"
          >
            <div className="plm-flex plm-items-center plm-gap-2 plm-mb-2">
              <div
                className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
                style={{ backgroundColor: getClubColor(offer.toClubId) }}
              />
              <div className="plm-flex-1">
                <div className="plm-text-sm plm-font-semibold plm-text-gray-900">
                  {offer.playerName}
                </div>
                <div className="plm-text-xs plm-text-gray-500">
                  {offer.playerPosition} &middot; {offer.playerOverall} OVR
                </div>
              </div>
            </div>
            <p className="plm-text-xs plm-text-gray-600 plm-mb-2">
              <span className="plm-font-medium">{getClubName(offer.toClubId)}</span> offer{' '}
              <span className="plm-font-bold plm-text-green-700">&pound;{offer.fee.toFixed(1)}M</span>
            </p>
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
                aria-label={`Reject offer for ${offer.playerName}`}
                className="plm-flex-1 plm-text-sm plm-font-medium plm-text-gray-700 plm-px-3 plm-py-2.5 plm-rounded plm-border plm-border-gray-300 hover:plm-bg-gray-50 plm-transition-colors plm-min-h-[44px]"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
