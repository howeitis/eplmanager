import { useState, useMemo } from 'react';
import type { PlayingBackground, ManagerPhilosophy } from '@/types/entities';
import { getManagerFaceUri } from '@/utils/avatarFace';
import { createRNG } from '@/utils/rng';

const NATIONALITIES = [
  'American', 'Argentine', 'Australian', 'Belgian', 'Brazilian',
  'Canadian', 'Chilean', 'Dutch', 'English', 'French',
  'German', 'Ghanaian', 'Irish', 'Italian', 'Japanese',
  'Mexican', 'Nigerian', 'Norwegian', 'Portuguese', 'Scottish',
  'South African', 'South Korean', 'Spanish', 'Swedish', 'Welsh',
];

const PLAYING_BACKGROUNDS: { value: PlayingBackground; label: string; bonus: string }[] = [
  { value: 'former-pro', label: 'Former Professional', bonus: '+5% TSS in derbies and against same-tier sides' },
  { value: 'lower-league-pro', label: 'Lower League Pro', bonus: '+10% on player sale fees' },
  { value: 'academy-coach', label: 'Academy Coach', bonus: 'Extra wonderkid at start, +1 youth intake every season' },
  { value: 'journalist', label: 'Journalist', bonus: 'Kinder board (1-place leniency) + cheeky end-of-season interview' },
  { value: 'analyst', label: 'Analyst', bonus: '+10% season-end budget' },
  { value: 'never-played', label: 'Never Played', bonus: 'Wild card — random −2% to +5% TSS swing every match' },
];

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3'];

const PHILOSOPHIES: { value: ManagerPhilosophy; label: string; bonus: string }[] = [
  { value: 'attacking', label: 'Attacking', bonus: 'Extra attacker in starting squad' },
  { value: 'possession', label: 'Possession', bonus: 'Extra midfielder in starting squad' },
  { value: 'pragmatic', label: 'Pragmatic', bonus: 'Extra player (random position) in starting squad' },
  { value: 'defensive', label: 'Defensive', bonus: 'Extra defender in starting squad' },
  { value: 'developmental', label: 'Developmental', bonus: 'Extra young player (U20) in starting squad' },
  { value: 'rotation-heavy', label: 'Rotation-Heavy', bonus: 'Extra player (random position) in starting squad' },
];

const AVATAR_TILE_COUNT = 6;

function generateAvatarSeeds(batchKey: number): string[] {
  const rng = createRNG(`manager-avatar-${batchKey}`);
  const seeds: string[] = [];
  for (let i = 0; i < AVATAR_TILE_COUNT; i++) {
    seeds.push(`mgr-${batchKey}-${rng.randomInt(0, 1_000_000)}`);
  }
  return seeds;
}

export interface ManagerCreationData {
  name: string;
  nationality: string;
  age: number;
  playingBackground: PlayingBackground;
  preferredFormation: string;
  philosophy: ManagerPhilosophy;
  avatar: string;
  bio: string;
}

interface ManagerCreationProps {
  clubName: string;
  onSubmit: (data: ManagerCreationData) => void;
  onBack: () => void;
}

export function ManagerCreation({ clubName, onSubmit, onBack }: ManagerCreationProps) {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [playingBackground, setPlayingBackground] = useState<PlayingBackground | ''>('');
  const [preferredFormation, setPreferredFormation] = useState('');
  const [philosophy, setPhilosophy] = useState<ManagerPhilosophy | ''>('');
  const [avatar, setAvatar] = useState('');
  const [avatarBatchKey, setAvatarBatchKey] = useState(() => Date.now());
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const avatarSeeds = useMemo(() => generateAvatarSeeds(avatarBatchKey), [avatarBatchKey]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    else if (name.trim().length > 40) newErrors.name = 'Name must be 40 characters or fewer';
    if (!nationality) newErrors.nationality = 'Select a nationality';
    if (age === '' || age < 28 || age > 70) newErrors.age = 'Age must be between 28 and 70';
    if (!playingBackground) newErrors.playingBackground = 'Select a playing background';
    if (!preferredFormation) newErrors.preferredFormation = 'Select a preferred formation';
    if (!philosophy) newErrors.philosophy = 'Select a philosophy';
    if (!avatar) newErrors.avatar = 'Select an avatar';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      nationality,
      age: age as number,
      playingBackground: playingBackground as PlayingBackground,
      preferredFormation,
      philosophy: philosophy as ManagerPhilosophy,
      avatar,
      bio: bio.trim(),
    });
  };

  const selectClass = 'plm-w-full plm-bg-white plm-border plm-border-gray-200 plm-rounded-lg plm-px-3 plm-py-2.5 plm-text-gray-900 plm-text-sm focus:plm-outline-none focus:plm-ring-2 focus:plm-ring-gray-400 plm-min-h-[44px]';
  const inputClass = `${selectClass} plm-appearance-none plm-shadow-none`;
  const labelClass = 'plm-block plm-text-sm plm-font-medium plm-text-gray-700 plm-mb-1';
  const errorClass = 'plm-text-xs plm-text-red-500 plm-mt-1';

  return (
    <div className="plm-min-h-screen plm-bg-gray-50 plm-px-4 plm-py-8">
      <div className="plm-max-w-md plm-mx-auto">
        <button
          onClick={onBack}
          className="plm-text-sm plm-text-gray-500 hover:plm-text-gray-700 plm-mb-4 plm-min-h-[44px] plm-flex plm-items-center"
        >
          &larr; Back to Club Selection
        </button>

        <h1 className="plm-text-2xl plm-font-bold plm-text-gray-900 plm-mb-1 plm-font-display">
          Create Your Manager
        </h1>
        <p className="plm-text-sm plm-text-gray-500 plm-mb-6">
          Taking charge at <span className="plm-font-semibold plm-text-gray-700">{clubName}</span>
        </p>

        <form onSubmit={handleSubmit} className="plm-space-y-4">
          {/* Avatar */}
          <div>
            <div className="plm-flex plm-items-center plm-justify-between plm-mb-1">
              <label className={labelClass} style={{ marginBottom: 0 }}>Avatar</label>
              <button
                type="button"
                onClick={() => {
                  setAvatarBatchKey(Date.now());
                  setAvatar('');
                }}
                className="plm-text-xs plm-text-gray-500 hover:plm-text-gray-800 plm-underline plm-min-h-[32px]"
              >
                Shuffle
              </button>
            </div>
            <div className="plm-grid plm-grid-cols-6 plm-gap-2">
              {avatarSeeds.map((seed) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setAvatar(seed)}
                  className={`plm-w-full plm-aspect-square plm-flex plm-items-center plm-justify-center plm-rounded-lg plm-border plm-transition-colors plm-overflow-hidden ${
                    avatar === seed
                      ? 'plm-border-gray-900 plm-bg-gray-100 plm-ring-2 plm-ring-gray-400'
                      : 'plm-border-gray-200 hover:plm-border-gray-300 plm-bg-white'
                  }`}
                >
                  <img
                    src={getManagerFaceUri(seed)}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="plm-w-full plm-h-full plm-object-contain"
                  />
                </button>
              ))}
            </div>
            {errors.avatar && <p className={errorClass}>{errors.avatar}</p>}
          </div>

          {/* Name */}
          <div>
            <label className={labelClass} htmlFor="mgr-name">Name</label>
            <input
              id="mgr-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Enter manager name"
              className={inputClass}
            />
            <div className="plm-flex plm-justify-between plm-mt-1">
              {errors.name ? <p className={errorClass}>{errors.name}</p> : <span />}
              <span className="plm-text-xs plm-text-gray-400">{name.length}/40</span>
            </div>
          </div>

          {/* Nationality */}
          <div>
            <label className={labelClass} htmlFor="mgr-nationality">Nationality</label>
            <select
              id="mgr-nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={selectClass}
            >
              <option value="">Select nationality</option>
              {NATIONALITIES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {errors.nationality && <p className={errorClass}>{errors.nationality}</p>}
          </div>

          {/* Age */}
          <div>
            <label className={labelClass} htmlFor="mgr-age">Age</label>
            <input
              id="mgr-age"
              type="number"
              min={28}
              max={70}
              value={age}
              onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="28-70"
              className={inputClass}
            />
            {errors.age && <p className={errorClass}>{errors.age}</p>}
          </div>

          {/* Playing Background */}
          <div>
            <label className={labelClass} htmlFor="mgr-background">Playing Background</label>
            <select
              id="mgr-background"
              value={playingBackground}
              onChange={(e) => setPlayingBackground(e.target.value as PlayingBackground)}
              className={selectClass}
            >
              <option value="">Select background</option>
              {PLAYING_BACKGROUNDS.map((bg) => (
                <option key={bg.value} value={bg.value}>{bg.label}</option>
              ))}
            </select>
            {playingBackground && (
              <p className="plm-text-xs plm-text-gray-400 plm-mt-1">
                {PLAYING_BACKGROUNDS.find((bg) => bg.value === playingBackground)?.bonus}
              </p>
            )}
            {errors.playingBackground && <p className={errorClass}>{errors.playingBackground}</p>}
          </div>

          {/* Preferred Formation */}
          <div>
            <label className={labelClass} htmlFor="mgr-formation">Preferred Formation ★</label>
            <select
              id="mgr-formation"
              value={preferredFormation}
              onChange={(e) => setPreferredFormation(e.target.value)}
              className={selectClass}
            >
              <option value="">Select formation</option>
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <p className="plm-text-xs plm-text-gray-400 plm-mt-1">★ +1 ATK, +1 DEF bonus when using this formation</p>
            {errors.preferredFormation && <p className={errorClass}>{errors.preferredFormation}</p>}
          </div>

          {/* Philosophy */}
          <div>
            <label className={labelClass} htmlFor="mgr-philosophy">Philosophy</label>
            <select
              id="mgr-philosophy"
              value={philosophy}
              onChange={(e) => setPhilosophy(e.target.value as ManagerPhilosophy)}
              className={selectClass}
            >
              <option value="">Select philosophy</option>
              {PHILOSOPHIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {philosophy && (
              <p className="plm-text-xs plm-text-gray-400 plm-mt-1">
                {PHILOSOPHIES.find((p) => p.value === philosophy)?.bonus}
              </p>
            )}
            {errors.philosophy && <p className={errorClass}>{errors.philosophy}</p>}
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass} htmlFor="mgr-bio">Bio <span className="plm-text-gray-400 plm-font-normal">(optional)</span></label>
            <textarea
              id="mgr-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Write a short bio for your manager..."
              className={`${inputClass} plm-resize-none`}
            />
            <div className="plm-flex plm-justify-end plm-mt-1">
              <span className="plm-text-xs plm-text-gray-400">{bio.length}/500</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="plm-w-full plm-bg-gray-900 plm-text-white plm-rounded-lg plm-py-3 plm-text-sm plm-font-semibold hover:plm-bg-gray-800 plm-transition-colors plm-min-h-[44px] plm-mt-6"
          >
            Take Charge
          </button>
        </form>
      </div>
    </div>
  );
}
