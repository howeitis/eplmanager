import type { Player, PlayerStats, Position, TransferRecord, Trait } from '@/types/entities';

/**
 * Procedural "Scout Summary" generator — a Mad Libs engine that
 * stitches sentence fragments based on player data variables.
 */

// ─── Youth Academy names by nationality ───

const YOUTH_ACADEMIES: Record<string, string[]> = {
  english: ['Lilleshall Academy', 'St George\'s Park', 'Southampton Academy', 'West Ham Academy', 'Cobham Youth Centre'],
  scottish: ['Murray Park', 'Toryglen Centre', 'Heriot-Watt Academy'],
  welsh: ['Dragon Park Academy', 'FAW Trust Centre'],
  irish: ['FAI Academy', 'Cherry Orchard Academy', 'Belvedere FC Youth'],
  french: ['Clairefontaine', 'INF Vichy', 'Lyon Academy', 'AS Monaco Academy'],
  brazilian: ['Flamengo Youth Academy', 'Santos FC Academy', 'São Paulo Academy', 'Grêmio Youth', 'Corinthians Academy'],
  spanish: ['La Masia', 'La Fábrica', 'Cantera de Mareo', 'Athletic Bilbao Academy'],
  portuguese: ['Sporting Academy', 'Benfica Youth', 'Porto Dragon Force', 'Braga Academy'],
  dutch: ['Ajax Academy', 'De Toekomst', 'PSV Academy', 'Feyenoord Academy'],
  german: ['Bayern Campus', 'BVB Academy', 'Schalke Knappenschmiede', 'RB Leipzig Academy'],
  argentinian: ['River Plate Youth', 'Boca Juniors Academy', 'Newell\'s Academy', 'Racing Club Youth'],
  belgian: ['Anderlecht Academy', 'Club Brugge Youth', 'Standard Liège Academy'],
  norwegian: ['Molde Academy', 'Rosenborg Youth', 'Lyn Oslo Academy'],
  danish: ['FC Nordsjælland Academy', 'Midtjylland Youth', 'KB Academy'],
  italian: ['Atalanta Academy', 'Milan Primavera', 'Juventus Next Gen', 'Inter Academy'],
  japanese: ['JFA Academy Fukushima', 'Yokohama F. Marinos Youth', 'Kashima Antlers Youth'],
  korean: ['Gwangju FC Academy', 'Suwon Samsung Youth'],
  'south-korean': ['Gwangju FC Academy', 'Suwon Samsung Youth'],
  nigerian: ['Pepsi Football Academy', 'Kaduna Academy', 'FC Ebedei'],
  ghanaian: ['Right to Dream Academy', 'Feyenoord Ghana Academy'],
  ivorian: ['ASEC Mimosas Academy', 'Sol Beni Academy'],
  senegalese: ['Génération Foot', 'Diambars Academy'],
  cameroonian: ['Kadji Sports Academy', 'APEJES Academy'],
  colombian: ['Envigado Academy', 'América de Cali Youth', 'Atlético Nacional Academy'],
  mexican: ['Club América Youth', 'Pachuca Academy', 'Chivas Cantera'],
  uruguayan: ['Peñarol Youth', 'Nacional Academy', 'Defensor Sporting Youth'],
  swedish: ['Malmö FF Academy', 'AIK Academy', 'Hammarby Youth'],
  swiss: ['Basel Academy', 'Grasshoppers Youth'],
  austrian: ['Red Bull Salzburg Academy', 'Rapid Wien Youth'],
  croatian: ['Dinamo Zagreb Academy', 'Hajduk Split Youth'],
  serbian: ['Red Star Academy', 'Partizan Youth', 'FK Čukarički Youth'],
  polish: ['Legia Warsaw Youth', 'Lech Poznań Academy'],
  turkish: ['Galatasaray Academy', 'Fenerbahçe Youth', 'Altınordu Academy'],
  american: ['FC Dallas Academy', 'Philadelphia Union Academy', 'LA Galaxy Academy'],
  egyptian: ['Al Ahly Youth', 'Zamalek Academy'],
  moroccan: ['Mohammed VI Academy', 'Raja Casablanca Youth'],
  czech: ['Sparta Prague Youth', 'Slavia Prague Academy'],
  hungarian: ['Puskás Akadémia', 'Ferencváros Youth'],
  jamaican: ['Harbour View Academy', 'Cavalier FC Youth'],
  paraguayan: ['Cerro Porteño Youth', 'Olimpia Academy'],
  ecuadorian: ['Independiente del Valle Academy', 'LDU Youth'],
  ukrainian: ['Shakhtar Academy', 'Dynamo Kyiv Youth'],
  malian: ['JMG Academy Bamako'],
  zambian: ['Nchanga Rangers Youth'],
  finnish: ['HJK Helsinki Academy'],
  greek: ['Olympiacos Academy', 'PAOK Youth'],
};

function getYouthAcademy(nationality: string, playerId: string): string {
  const academies = YOUTH_ACADEMIES[nationality.toLowerCase()];
  if (!academies || academies.length === 0) return 'a local youth academy';
  // Deterministic pick based on player ID hash
  let h = 0;
  for (let i = 0; i < playerId.length; i++) {
    h = (Math.imul(h, 31) + playerId.charCodeAt(i)) | 0;
  }
  return academies[Math.abs(h) % academies.length];
}

// ─── Sentence fragments ───

function getAgePreamble(age: number, overall: number): string {
  if (age <= 20 && overall >= 75) return 'A prodigious young talent';
  if (age <= 20) return 'A raw but promising youngster';
  if (age <= 23 && overall >= 80) return 'A rising star entering his prime years';
  if (age <= 23) return 'A developing player with room to grow';
  if (age <= 28 && overall >= 85) return 'An elite performer in the peak of his career';
  if (age <= 28 && overall >= 75) return 'A solid professional in his best years';
  if (age <= 28) return 'A dependable squad player in his prime';
  if (age <= 32 && overall >= 85) return 'An experienced, elite veteran';
  if (age <= 32 && overall >= 75) return 'A seasoned campaigner who knows the game inside out';
  if (age <= 32) return 'An experienced hand approaching the twilight of his career';
  if (overall >= 80) return 'A grand old statesman still performing at the highest level';
  if (overall >= 70) return 'A veteran whose legs may be going but whose brain remains sharp';
  return 'A journeyman in the final chapter of his playing days';
}

function getTraitPhrase(trait: Trait, overall: number): string {
  const phrases: Record<Trait, string[]> = {
    Leader: [
      'who commands respect in the dressing room and leads by example on the pitch.',
      'whose presence alone lifts the performance of those around him.',
    ],
    Ambitious: [
      'driven by an insatiable hunger to reach the very top.',
      'who expects to play every match and won\'t settle for a place on the bench.',
    ],
    Loyal: [
      'known for his unwavering commitment to the shirt.',
      'a one-club man at heart who bleeds the colors of his team.',
    ],
    Clutch: [
      'who thrives under pressure — the bigger the game, the better he plays.',
      'with an uncanny ability to produce moments of magic when it matters most.',
    ],
    Inconsistent: [
      overall >= 80
        ? 'who possesses world-class ability but can vanish from games without warning.'
        : 'whose form is maddeningly unpredictable from one week to the next.',
      'a frustrating enigma — capable of brilliance and anonymity in equal measure.',
    ],
    Fragile: [
      'whose career has been a constant battle against his own body.',
      'with undeniable quality, if only his fitness could be relied upon.',
    ],
    Durable: [
      'built like a tank — rarely misses a match and recovers quickly from knocks.',
      'whose durability is a manager\'s dream; he simply does not break down.',
    ],
    Engine: [
      'who covers every blade of grass and never stops running for 90 minutes.',
      'a relentless ball of energy whose work rate is second to none.',
    ],
    Flair: [
      'blessed with silky technique and the audacity to try the impossible.',
      'a crowd favourite whose tricks and flair bring fans out of their seats.',
    ],
    Prospect: [
      'whose ceiling is sky-high — the raw materials are clearly there.',
      'a diamond in the rough who just needs regular first-team minutes to shine.',
    ],
  };

  const options = phrases[trait];
  // Use trait + overall as a stable selector
  return options[(overall + trait.length) % options.length];
}

function getFormSentence(form: number): string {
  if (form >= 3) return 'He is in blistering form right now — absolutely on fire.';
  if (form >= 2) return 'Currently playing with confidence and rhythm.';
  if (form >= 1) return 'He\'s in decent nick and performing consistently.';
  if (form === 0) return 'He is currently struggling to find his rhythm.';
  if (form >= -1) return 'A slight dip in form recently, but nothing to worry about.';
  if (form >= -2) return 'He\'s been well below par — questions are being asked.';
  return 'Deep in a crisis of confidence. He looks like a shadow of himself.';
}

function getTransferSentence(
  player: Player,
  recentTransfers: TransferRecord[],
): string | null {
  const playerTransfer = recentTransfers.find(
    (t) => t.playerId === player.id && t.toClubId !== undefined,
  );
  if (!playerTransfer) return null;

  if (playerTransfer.fee >= 50) {
    return `He will be looking to prove his massive £${playerTransfer.fee.toFixed(1)}M price tag.`;
  }
  if (playerTransfer.fee >= 25) {
    return `A £${playerTransfer.fee.toFixed(1)}M arrival with a point to prove at his new club.`;
  }
  if (playerTransfer.fee >= 10) {
    return `Signed for £${playerTransfer.fee.toFixed(1)}M — expected to slot straight into the first team.`;
  }
  if (playerTransfer.fee >= 3) {
    return `A shrewd pickup for just £${playerTransfer.fee.toFixed(1)}M.`;
  }
  return `A bargain addition at £${playerTransfer.fee.toFixed(1)}M — low risk, potentially high reward.`;
}

function getHeroStatSentence(stats: PlayerStats, position: Position): string | null {
  const entries: [string, number][] = [
    ['ATK', stats.ATK],
    ['DEF', stats.DEF],
    ['MOV', stats.MOV],
    ['PWR', stats.PWR],
    ['MEN', stats.MEN],
    ['SKL', stats.SKL],
  ];
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (best[1] < 85) return null;

  if (position === 'GK') {
    const gkMap: Record<string, string> = {
      ATK: `Acrobatic when called upon — a ${best[1]} Diving rating means corners and crosses bring out the best in him.`,
      DEF: `Magnificent with the ball in his gloves — a ${best[1]} Handling rating; he claims everything that flies into the box.`,
      MOV: `Distributes like a quarterback — ${best[1]} Kicking puts every clearance and short pass on a sixpence.`,
      PWR: `Cat-like reflexes — a ${best[1]} Reflexes rating means he's saving shots he has no right to reach.`,
      MEN: `Ice in his veins — ${best[1]} Mentality; he's the calmest man on the pitch when the game is on the line.`,
      SKL: `Reads the game superbly — a ${best[1]} Positioning rating; strikers find him in their face before they've taken their shot.`,
    };
    return gkMap[best[0]] || null;
  }

  const heroMap: Record<string, string> = {
    ATK: `His finishing is lethal — a ${best[1]} ATK rating puts him among the deadliest in the league.`,
    DEF: `A defensive colossus with ${best[1]} DEF — strikers fear him.`,
    MOV: `Lightning quick at ${best[1]} MOV, he leaves defenders for dead.`,
    PWR: `A physical beast — ${best[1]} PWR means he wins every battle.`,
    MEN: `Mentally bulletproof with ${best[1]} MEN — ice in his veins.`,
    SKL: `Technically sublime — a ${best[1]} SKL rating that puts the ball on a sixpence.`,
  };

  return heroMap[best[0]] || null;
}

function getYouthAcademySentence(player: Player): string {
  const academy = getYouthAcademy(player.nationality, player.id);
  if (player.age <= 22) {
    return `A product of ${academy}, still honing his craft at the highest level.`;
  }
  return `Came through the ranks at ${academy} before making his name in senior football.`;
}

// ─── Public API ───

export interface ScoutSummaryContext {
  recentTransfers?: TransferRecord[];
}

export interface ScoutSummaryParts {
  form: string;
  bio: string;
}

export function generateScoutSummaryParts(
  player: Player,
  context?: ScoutSummaryContext,
): ScoutSummaryParts {
  const bioParts: string[] = [];

  bioParts.push(getAgePreamble(player.age, player.overall));
  bioParts.push(getTraitPhrase(player.trait, player.overall));

  const heroStat = getHeroStatSentence(player.stats, player.position);
  if (heroStat) bioParts.push(heroStat);

  const transferLine = context?.recentTransfers
    ? getTransferSentence(player, context.recentTransfers)
    : null;
  if (transferLine) {
    bioParts.push(transferLine);
  } else if (player.age <= 22) {
    bioParts.push(getYouthAcademySentence(player));
  }

  return {
    form: getFormSentence(player.form ?? 0),
    bio: bioParts.join(' '),
  };
}

export function generateScoutSummary(
  player: Player,
  context?: ScoutSummaryContext,
): string {
  const { form, bio } = generateScoutSummaryParts(player, context);
  const formValue = player.form ?? 0;
  // Preserve legacy behavior: only include the form sentence when notable.
  return formValue >= 2 || formValue <= -2 ? `${bio} ${form}` : bio;
}
