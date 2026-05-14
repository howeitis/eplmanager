import type { TransferOffer, Club } from '../../types/entities';
import { getClubLogoUrl } from '../../data/assets';

interface OutgoingOffersProps {
  offers: TransferOffer[];
  clubs: Club[];
  budget: number;
  onAcceptCounter: (offer: TransferOffer) => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'plm-bg-yellow-50 plm-text-yellow-700 plm-border-yellow-200',
  accepted: 'plm-bg-green-50 plm-text-green-700 plm-border-green-200',
  rejected: 'plm-bg-red-50 plm-text-red-700 plm-border-red-200',
  countered: 'plm-bg-blue-50 plm-text-blue-700 plm-border-blue-200',
  player_refused: 'plm-bg-orange-50 plm-text-orange-700 plm-border-orange-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  countered: 'Counter Offer',
  player_refused: 'Player Refused',
};

export function OutgoingOffers({ offers, clubs, budget, onAcceptCounter }: OutgoingOffersProps) {
  const getClubName = (clubId: string) =>
    clubs.find((c) => c.id === clubId)?.name || clubId;

  if (offers.length === 0) {
    return (
      <div>
        <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">
          Outgoing Offers
        </h2>
        <p className="plm-text-sm plm-text-gray-400 plm-text-center plm-py-8">
          No outgoing offers yet. Browse the market to make bids.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">
        Outgoing Offers
      </h2>
      <div className="plm-grid plm-grid-cols-1 lg:plm-grid-cols-2 plm-gap-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className={`plm-rounded-lg plm-border plm-p-3 ${STATUS_STYLES[offer.status] || 'plm-bg-gray-50 plm-border-gray-200'}`}
          >
            <div className="plm-flex plm-items-center plm-justify-between plm-gap-2 plm-mb-1">
              <div className="plm-flex plm-items-center plm-gap-2 plm-min-w-0">
                {getClubLogoUrl(offer.fromClubId) ? (
                  <img
                    src={getClubLogoUrl(offer.fromClubId)}
                    alt=""
                    aria-hidden
                    className="plm-w-7 plm-h-7 plm-object-contain plm-flex-shrink-0"
                  />
                ) : null}
                <div className="plm-min-w-0">
                  <div className="plm-text-sm plm-font-semibold plm-truncate">
                    {offer.playerName}
                  </div>
                  <div className="plm-text-xs plm-opacity-75 plm-truncate">
                    {offer.playerPosition} &middot; {offer.playerOverall} OVR &middot; {offer.playerAge} &middot; from {getClubName(offer.fromClubId)}
                  </div>
                </div>
              </div>
              <span className="plm-text-xs plm-font-medium plm-px-2 plm-py-0.5 plm-rounded plm-bg-white plm-bg-opacity-50 plm-flex-shrink-0">
                {STATUS_LABELS[offer.status]}
              </span>
            </div>

            <p className="plm-text-xs plm-mb-1">
              {offer.status === 'accepted' && offer.counterFee
                ? <>Paid: &pound;{offer.counterFee.toFixed(1)}M <span className="plm-text-gray-400">(countered from &pound;{offer.fee.toFixed(1)}M)</span></>
                : <>Your offer: &pound;{offer.fee.toFixed(1)}M</>}
            </p>

            {offer.status === 'countered' && offer.counterFee && (
              <div className="plm-mt-2">
                <p className="plm-text-xs plm-font-medium plm-mb-2">
                  They want &pound;{offer.counterFee.toFixed(1)}M
                </p>
                <div className="plm-flex plm-gap-2">
                  <button
                    onClick={() => onAcceptCounter(offer)}
                    disabled={offer.counterFee > budget}
                    className="plm-bg-blue-600 plm-text-white plm-text-sm plm-font-medium plm-px-4 plm-py-2.5 plm-rounded hover:plm-bg-blue-700 disabled:plm-opacity-40 disabled:plm-cursor-not-allowed plm-transition-colors plm-min-h-[44px]"
                  >
                    Accept &pound;{offer.counterFee.toFixed(1)}M
                  </button>
                  {offer.counterFee > budget && (
                    <span className="plm-text-xs plm-text-red-600 plm-self-center">
                      Exceeds budget
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
