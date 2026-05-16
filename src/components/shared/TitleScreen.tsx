import { getBrandLogoUrl, getHeroImageUrl } from '@/data/assets';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div
      className="plm-fixed plm-inset-0 plm-flex plm-flex-col plm-items-center plm-justify-center plm-min-h-screen plm-overflow-hidden"
      style={{ backgroundColor: '#0a0a12' }}
    >
      {/* Blurred hero background */}
      <div
        className="plm-absolute plm-inset-0 plm-bg-cover plm-bg-center plm-opacity-40"
        style={{
          backgroundImage: `url(${getHeroImageUrl()})`,
          filter: 'blur(8px) brightness(0.6)',
          transform: 'scale(1.05)',
        }}
      />

      {/* Dark gradient overlay */}
      <div className="plm-absolute plm-inset-0 plm-bg-gradient-to-b plm-from-black/60 plm-via-transparent plm-to-black/80" />

      {/* Content */}
      <div className="plm-relative plm-z-10 plm-flex plm-flex-col plm-items-center plm-gap-6 plm-px-6 plm-text-center plm-animate-fade-in">
        {/* Logo */}
        <img
          src={getBrandLogoUrl()}
          alt="EPL Manager Logo"
          className="plm-w-32 plm-h-32 md:plm-w-40 md:plm-h-40 plm-object-contain plm-drop-shadow-lg"
        />

        {/* Title */}
        <div>
          <h1 className="plm-font-display plm-text-4xl md:plm-text-5xl plm-font-black plm-text-white plm-tracking-tight plm-leading-none">
            Premier League
          </h1>
          <h2 className="plm-font-display plm-text-2xl md:plm-text-3xl plm-font-bold plm-text-amber-400 plm-tracking-wider plm-uppercase plm-mt-1">
            Manager
          </h2>
        </div>

        {/* Tagline */}
        <p className="plm-text-warm-400 plm-text-sm plm-font-body plm-max-w-xs plm-leading-relaxed">
          Build your dynasty. Manage your squad. Conquer the league.
        </p>

        {/* Start button */}
        <button
          onClick={onStart}
          className="plm-mt-4 plm-px-10 plm-py-3.5 plm-rounded-lg plm-text-sm plm-font-bold plm-uppercase plm-tracking-wider plm-transition-all plm-min-h-[44px] plm-bg-white plm-text-charcoal hover:plm-bg-warm-200 plm-shadow-lg hover:plm-shadow-xl"
        >
          Play
        </button>

        {/* Version / credit */}
        <span className="plm-text-[10px] plm-text-warm-600 plm-uppercase plm-tracking-widest plm-mt-8">
          Season 2026
        </span>
      </div>
    </div>
  );
}
