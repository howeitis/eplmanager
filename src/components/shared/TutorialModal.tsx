interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-[100] plm-flex plm-items-center plm-justify-center plm-p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div
        className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-max-w-lg plm-w-full plm-shadow-xl plm-overflow-hidden plm-max-h-[85vh] plm-flex plm-flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plm-flex plm-items-center plm-justify-between plm-px-5 plm-py-3 plm-border-b plm-border-warm-200">
          <h3 id="tutorial-title" className="plm-font-display plm-font-bold plm-text-lg plm-text-charcoal">
            How the game works
          </h3>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="plm-text-warm-500 hover:plm-text-charcoal plm-text-xl plm-leading-none"
          >
            ×
          </button>
        </div>
        <div className="plm-overflow-y-auto plm-px-5 plm-py-4 plm-space-y-4 plm-text-sm plm-text-charcoal">
          <Section title="The season">
            Each season runs August–May, advanced one month at a time from the Hub. Set your formation and
            mentality in the Squad tab before each month.
          </Section>
          <Section title="Squad & captain">
            You have 16+ players across six positions (GK, CB, FB, MF, WG, ST). Pick a captain for a small
            TSS boost. Injuries create temporary fill-ins that auto-expire.
          </Section>
          <Section title="Matches">
            Results are simulated from Team Strength (stats × formation × mentality + home advantage + form).
            You'll see each month's results and top scorers.
          </Section>
          <Section title="Transfers">
            Two windows: summer and January. Browse listings, shortlist targets, make offers, and field
            incoming bids. Form doesn't affect market value — only ability, age, and trait.
          </Section>
          <Section title="Board expectations">
            Your board sets a minimum finish each season. Beating it raises reputation and budget; missing
            it has the opposite effect. Reputation at 0 = sack.
          </Section>
          <Section title="Season end">
            Aging kicks in: players 33+ may retire, 36+ often do. Retirees are replaced by regens. You also
            get an annual youth intake of 1–2 academy graduates.
          </Section>
          <Section title="Manager career">
            Trophies, accomplishments, and tenures are tracked across clubs. You can resign from the Manager
            tab and take over a different club mid-career.
          </Section>
        </div>
        <div className="plm-px-5 plm-py-3 plm-border-t plm-border-warm-200 plm-bg-warm-50">
          <button
            onClick={onClose}
            className="plm-w-full plm-py-2.5 plm-rounded plm-bg-charcoal plm-text-white plm-text-sm plm-font-semibold hover:plm-bg-charcoal-light"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="plm-font-display plm-font-bold plm-text-sm plm-text-charcoal plm-mb-1">
        {title}
      </h4>
      <p className="plm-text-sm plm-text-warm-600 plm-leading-relaxed">{children}</p>
    </div>
  );
}
