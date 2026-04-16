import type { Player, PlayerStats } from '../../types/entities';

// Diverse player emoji pool — all 5 Fitzpatrick skin tones × multiple hair styles.
// Skin tone modifiers: 🏻light 🏼med-light 🏽med 🏾med-dark 🏿dark
// Hair ZWJ: 🦰red 🦱curly 🦲bald 🦳white
const PLAYER_EMOJIS: string[] = [
  '\u{1F468}\u{1F3FB}',                           // man · light
  '\u{1F468}\u{1F3FC}',                           // man · med-light
  '\u{1F468}\u{1F3FD}',                           // man · medium
  '\u{1F468}\u{1F3FE}',                           // man · med-dark
  '\u{1F468}\u{1F3FF}',                           // man · dark
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B1}',          // man · light · curly
  '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B1}',          // man · med-light · curly
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B1}',          // man · medium · curly
  '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B1}',          // man · med-dark · curly
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B1}',          // man · dark · curly
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B2}',          // man · light · bald
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B2}',          // man · medium · bald
  '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B2}',          // man · med-dark · bald
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B2}',          // man · dark · bald
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B0}',          // man · light · red hair
  '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B0}',          // man · med-light · red hair
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B3}',          // man · medium · white hair
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B3}',          // man · dark · white hair
  '\u{1F9D4}\u{1F3FB}',                           // bearded · light
  '\u{1F9D4}\u{1F3FD}',                           // bearded · medium
  '\u{1F9D4}\u{1F3FE}',                           // bearded · med-dark
  '\u{1F9D4}\u{1F3FF}',                           // bearded · dark
];

function hashPlayerId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getPlayerEmoji(id: string): string {
  return PLAYER_EMOJIS[hashPlayerId(id) % PLAYER_EMOJIS.length];
}

const STAT_KEYS: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

const NATIONALITY_FLAGS: Record<string, string> = {
  english: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  french: '\u{1F1EB}\u{1F1F7}',
  brazilian: '\u{1F1E7}\u{1F1F7}',
  spanish: '\u{1F1EA}\u{1F1F8}',
  portuguese: '\u{1F1F5}\u{1F1F9}',
  dutch: '\u{1F1F3}\u{1F1F1}',
  german: '\u{1F1E9}\u{1F1EA}',
  argentinian: '\u{1F1E6}\u{1F1F7}',
  belgian: '\u{1F1E7}\u{1F1EA}',
  norwegian: '\u{1F1F3}\u{1F1F4}',
  danish: '\u{1F1E9}\u{1F1F0}',
  irish: '\u{1F1EE}\u{1F1EA}',
  scottish: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  welsh: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  italian: '\u{1F1EE}\u{1F1F9}',
  japanese: '\u{1F1EF}\u{1F1F5}',
  korean: '\u{1F1F0}\u{1F1F7}',
  nigerian: '\u{1F1F3}\u{1F1EC}',
  ghanaian: '\u{1F1EC}\u{1F1ED}',
  ivorian: '\u{1F1E8}\u{1F1EE}',
  senegalese: '\u{1F1F8}\u{1F1F3}',
  cameroonian: '\u{1F1E8}\u{1F1F2}',
  colombian: '\u{1F1E8}\u{1F1F4}',
  mexican: '\u{1F1F2}\u{1F1FD}',
  uruguayan: '\u{1F1FA}\u{1F1FE}',
  swedish: '\u{1F1F8}\u{1F1EA}',
  swiss: '\u{1F1E8}\u{1F1ED}',
  austrian: '\u{1F1E6}\u{1F1F9}',
  croatian: '\u{1F1ED}\u{1F1F7}',
  serbian: '\u{1F1F7}\u{1F1F8}',
  polish: '\u{1F1F5}\u{1F1F1}',
  turkish: '\u{1F1F9}\u{1F1F7}',
  american: '\u{1F1FA}\u{1F1F8}',
};

function getFlag(nationality: string): string {
  return NATIONALITY_FLAGS[nationality.toLowerCase()] || '\u{1F30D}';
}

function getNationalityLabel(nationality: string): string {
  return nationality.charAt(0).toUpperCase() + nationality.slice(1);
}

function getOverallColor(overall: number): string {
  if (overall >= 85) return '#FFD700'; // Gold
  if (overall >= 75) return '#C0C0C0'; // Silver
  if (overall >= 65) return '#CD7F32'; // Bronze
  return '#8B7355'; // Common
}

function getCardBorderColor(overall: number): string {
  if (overall >= 85) return '#B8860B';
  if (overall >= 75) return '#808080';
  if (overall >= 65) return '#8B4513';
  return '#6B5B45';
}

function getCardBgGradient(overall: number): string {
  if (overall >= 85) return 'linear-gradient(135deg, #FFF8DC 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #FFF8DC 100%)';
  if (overall >= 75) return 'linear-gradient(135deg, #F5F5F5 0%, #C0C0C0 30%, #F5F5F5 50%, #C0C0C0 70%, #F5F5F5 100%)';
  if (overall >= 65) return 'linear-gradient(135deg, #FFF3E0 0%, #CD7F32 30%, #FFF3E0 50%, #CD7F32 70%, #FFF3E0 100%)';
  return 'linear-gradient(135deg, #FAF0E6 0%, #D2B48C 30%, #FAF0E6 50%, #D2B48C 70%, #FAF0E6 100%)';
}

interface RetroPlayerCardProps {
  player: Player;
  clubName?: string;
  clubColors?: { primary: string; secondary: string };
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function RetroPlayerCard({
  player,
  clubName,
  clubColors,
  size = 'md',
  animated = false,
}: RetroPlayerCardProps) {
  const overallColor = getOverallColor(player.overall);
  const borderColor = getCardBorderColor(player.overall);
  const bgGradient = getCardBgGradient(player.overall);

  const sizeClasses = {
    sm: 'plm-w-40 plm-h-56',
    md: 'plm-w-52 plm-h-72',
    lg: 'plm-w-64 plm-h-[22rem]',
  };

  const fontSizes = {
    sm: { ovr: 'plm-text-2xl', name: 'plm-text-xs', stat: 'plm-text-[9px]', pos: 'plm-text-[8px]', emoji: 'plm-text-3xl' },
    md: { ovr: 'plm-text-3xl', name: 'plm-text-sm', stat: 'plm-text-[10px]', pos: 'plm-text-[9px]', emoji: 'plm-text-4xl' },
    lg: { ovr: 'plm-text-4xl', name: 'plm-text-base', stat: 'plm-text-xs', pos: 'plm-text-[10px]', emoji: 'plm-text-5xl' },
  };

  const fs = fontSizes[size];

  return (
    <div
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 ${animated ? 'plm-animate-card-flip' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
        perspective: '1000px',
      }}
    >
      {/* Shimmer overlay for high-rated cards */}
      {player.overall >= 80 && (
        <div className="plm-absolute plm-inset-0 plm-overflow-hidden plm-pointer-events-none plm-z-10">
          <div
            className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
          />
        </div>
      )}

      {/* Top section: OVR + Position */}
      <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-2">
        <div className="plm-text-center">
          <div
            className={`${fs.ovr} plm-font-display plm-font-black plm-leading-none`}
            style={{ color: overallColor, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {player.overall}
          </div>
          <div
            className={`${fs.pos} plm-font-bold plm-uppercase plm-tracking-wider plm-mt-0.5`}
            style={{ color: borderColor }}
          >
            {player.position}
          </div>
        </div>
        <div className="plm-text-right plm-mt-0.5">
          <span className={size === 'sm' ? 'plm-text-lg' : 'plm-text-xl'}>{getFlag(player.nationality)}</span>
        </div>
      </div>

      {/* Face emoji */}
      <div className="plm-flex plm-justify-center plm-mt-1">
        <div
          className={`${fs.emoji} plm-leading-none`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        >
          {getPlayerEmoji(player.id)}
        </div>
      </div>

      {/* Name plate */}
      <div
        className="plm-mx-2.5 plm-mt-1.5 plm-py-1 plm-rounded plm-text-center"
        style={{
          backgroundColor: clubColors?.primary || borderColor,
          borderBottom: `2px solid ${clubColors?.secondary || overallColor}`,
        }}
      >
        <div
          className={`${fs.name} plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1`}
          style={{ color: isLightColor(clubColors?.primary || borderColor) ? '#1A1A1A' : '#FFFFFF' }}
        >
          {player.name}
        </div>
      </div>

      {/* Nationality + Age */}
      <div className="plm-flex plm-justify-center plm-items-center plm-gap-1 plm-mt-1">
        <span className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold`} style={{ color: borderColor }}>
          {getNationalityLabel(player.nationality)}
        </span>
        <span style={{ color: borderColor }}>&middot;</span>
        <span className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold`} style={{ color: borderColor }}>
          Age {player.age}
        </span>
      </div>

      {/* Full club name */}
      {clubName && (
        <div className="plm-flex plm-justify-center plm-px-2 plm-mt-0.5">
          <span
            className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold plm-text-center plm-leading-tight`}
            style={{ color: borderColor }}
          >
            {clubName}
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div className="plm-mx-2.5 plm-mt-1.5 plm-grid plm-grid-cols-3 plm-gap-x-1 plm-gap-y-0.5">
        {STAT_KEYS.map((stat) => (
          <div key={stat} className="plm-flex plm-items-center plm-justify-between plm-px-1">
            <span className={`${fs.stat} plm-font-bold plm-uppercase`} style={{ color: borderColor }}>
              {stat}
            </span>
            <span
              className={`${fs.stat} plm-font-black plm-tabular-nums`}
              style={{ color: '#1A1A1A' }}
            >
              {player.stats[stat]}
            </span>
          </div>
        ))}
      </div>

      {/* Trait badge */}
      <div className="plm-flex plm-justify-center plm-mt-1.5">
        <span
          className={`${fs.pos} plm-font-bold plm-uppercase plm-tracking-wider plm-px-2 plm-py-0.5 plm-rounded-full`}
          style={{
            backgroundColor: borderColor + '30',
            color: borderColor,
            border: `1px solid ${borderColor}50`,
          }}
        >
          {player.trait}
        </span>
      </div>

      {/* Corner decorations */}
      <div className="plm-absolute plm-bottom-1 plm-right-1.5 plm-opacity-20">
        <svg width={size === 'sm' ? 16 : 20} height={size === 'sm' ? 16 : 20} viewBox="0 0 24 24" fill={borderColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
