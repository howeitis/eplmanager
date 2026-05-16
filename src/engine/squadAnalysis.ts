import type { Club, Player, Position, ManagerPhilosophy } from '@/types/entities';

// ─── Types ───

export type AssessmentCategory =
  | 'position-quality'
  | 'depth'
  | 'age-profile'
  | 'star-player'
  | 'form-carryover'
  | 'shape-imbalance';

export interface AssessmentPoint {
  category: AssessmentCategory;
  position?: Position;
  headline: string;
  detail: string;
  /** Absolute deviation from median — used for prioritization */
  magnitude: number;
}

export interface SquadAssessment {
  strengths: AssessmentPoint[];
  weaknesses: AssessmentPoint[];
}

// ─── Constants ───

/** Number of starters to consider per position group */
const STARTER_COUNT: Record<Position, number> = {
  GK: 1,
  CB: 2,
  FB: 2,
  MF: 2,
  WG: 2,
  ST: 1,
};

/** Tier rating ranges from playerGen — midpoint is our tier median */
const TIER_RATING_RANGES: Record<number, [number, number]> = {
  1: [77, 82],
  2: [72, 77],
  3: [69, 74],
  4: [66, 71],
  5: [63, 68],
};

const POSITIONS: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];

const ATTACKING_POSITIONS: Position[] = ['WG', 'ST'];
const DEFENSIVE_POSITIONS: Position[] = ['CB', 'FB'];

// ─── Helpers ───

/** Get the tier median starter rating (midpoint of the tier range) */
export function getTierMedian(tier: number): number {
  const range = TIER_RATING_RANGES[tier] || TIER_RATING_RANGES[3];
  return (range[0] + range[1]) / 2;
}

/** Get the league-wide median starter rating (average of all tier midpoints) */
export function getLeagueMedian(): number {
  let total = 0;
  for (let t = 1; t <= 5; t++) {
    total += getTierMedian(t);
  }
  return total / 5;
}

/** Get top N players at a position, sorted by overall descending */
function getTopPlayers(roster: Player[], position: Position, count: number): Player[] {
  return roster
    .filter((p) => p.position === position && !p.isTemporary)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, count);
}

/** Average overall of top N starters at a position */
function positionGroupAvg(roster: Player[], position: Position): number {
  const top = getTopPlayers(roster, position, STARTER_COUNT[position]);
  if (top.length === 0) return 0;
  return top.reduce((sum, p) => sum + p.overall, 0) / top.length;
}

/** Compute tier median for a specific position across all same-tier clubs */
export function computeTierPositionMedian(
  allClubs: Club[],
  tier: number,
  position: Position,
): number {
  const tierClubs = allClubs.filter((c) => c.tier === tier);
  if (tierClubs.length === 0) return getTierMedian(tier);
  const avgs = tierClubs.map((c) => positionGroupAvg(c.roster, position));
  const sorted = [...avgs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compute league-wide median for a specific position */
function computeLeaguePositionMedian(allClubs: Club[], position: Position): number {
  const avgs = allClubs.map((c) => positionGroupAvg(c.roster, position));
  const sorted = [...avgs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Position Labels ───

const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre-back',
  FB: 'Full-back',
  MF: 'Midfielder',
  WG: 'Winger',
  ST: 'Striker',
};

const POSITION_LABELS_PLURAL: Record<Position, string> = {
  GK: 'Goalkeepers',
  CB: 'Centre-backs',
  FB: 'Full-backs',
  MF: 'Midfielders',
  WG: 'Wingers',
  ST: 'Strikers',
};

// ─── Core Analysis ───

export function analyzeSquad(
  club: Club,
  allClubs: Club[],
  philosophy: ManagerPhilosophy,
  seasonNumber: number,
): SquadAssessment {
  const roster = club.roster.filter((p) => !p.isTemporary);
  const tier = club.tier;
  const tierMedian = getTierMedian(tier);

  const strengths: AssessmentPoint[] = [];
  const weaknesses: AssessmentPoint[] = [];

  // ─── 1. Position Quality ───
  for (const pos of POSITIONS) {
    const avg = positionGroupAvg(roster, pos);
    const tierPosMedian = computeTierPositionMedian(allClubs, tier, pos);
    const leaguePosMedian = computeLeaguePositionMedian(allClubs, pos);
    const tierDiff = avg - tierPosMedian;
    const leagueDiff = avg - leaguePosMedian;
    const label = POSITION_LABELS[pos];
    const count = STARTER_COUNT[pos];
    const groupLabel = count > 1
      ? `${label} pairing`
      : label;

    // Standout: league median + 6
    if (leagueDiff >= 6) {
      strengths.push({
        category: 'position-quality',
        position: pos,
        headline: `Your ${groupLabel.toLowerCase()} is elite in the division`,
        detail: `With an average rating of ${avg.toFixed(0)}, your ${POSITION_LABELS_PLURAL[pos].toLowerCase()} are among the very best in the entire league, not just at your level.`,
        magnitude: leagueDiff,
      });
    } else if (tierDiff >= 4) {
      strengths.push({
        category: 'position-quality',
        position: pos,
        headline: `Strong ${groupLabel.toLowerCase()}`,
        detail: `Your ${POSITION_LABELS_PLURAL[pos].toLowerCase()} rate at ${avg.toFixed(0)} overall, well above the ${tierMedianLabel(tier)} average of ${tierPosMedian.toFixed(0)}.`,
        magnitude: tierDiff,
      });
    } else if (tierDiff <= -4) {
      weaknesses.push({
        category: 'position-quality',
        position: pos,
        headline: `Weak ${groupLabel.toLowerCase()}`,
        detail: `Your ${POSITION_LABELS_PLURAL[pos].toLowerCase()} rate at just ${avg.toFixed(0)} overall, well below the ${tierMedianLabel(tier)} average of ${tierPosMedian.toFixed(0)}. Reinforcement is needed.`,
        magnitude: Math.abs(tierDiff),
      });
    }
  }

  // ─── 2. Depth ───
  // A position is "deep" when there's a quality player BEYOND the starters —
  // i.e. for 2-starter positions, the 3rd-best player must clear the bar; for
  // 1-starter positions, the 2nd-best. Looking at players[1] for everything
  // misclassified the 2nd starter as a backup at 2-starter positions.
  const tierFloorRating = getTierFloorRating(tier);
  let deepPositions = 0;
  for (const pos of POSITIONS) {
    const players = roster
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall - a.overall);
    const backupIdx = STARTER_COUNT[pos];
    if (players.length > backupIdx && players[backupIdx].overall >= tierFloorRating + 5) {
      deepPositions++;
    }
  }

  if (deepPositions >= 6) {
    strengths.push({
      category: 'depth',
      headline: 'Exceptional squad depth',
      detail: `You have quality backup across ${deepPositions} position groups. Injuries and rotation will be manageable.`,
      magnitude: deepPositions,
    });
  } else if (deepPositions < 3) {
    const isAcute = philosophy === 'rotation-heavy';
    weaknesses.push({
      category: 'depth',
      headline: isAcute ? 'Critically thin squad' : 'Lack of squad depth',
      detail: isAcute
        ? `Only ${deepPositions} position group${deepPositions !== 1 ? 's have' : ' has'} adequate backup. With your rotation-heavy approach, this is a serious concern.`
        : `Only ${deepPositions} position group${deepPositions !== 1 ? 's have' : ' has'} adequate backup. One or two key injuries could derail the season.`,
      magnitude: 6 - deepPositions,
    });
  }

  // ─── 3. Age Profile ───
  const avgAge = roster.length > 0
    ? roster.reduce((sum, p) => sum + p.age, 0) / roster.length
    : 25;

  if (avgAge >= 30) {
    weaknesses.push({
      category: 'age-profile',
      headline: 'Ageing core',
      detail: `The squad average age is ${avgAge.toFixed(1)}. Several key players may decline sharply in the coming seasons. Rejuvenation should be a priority.`,
      magnitude: avgAge - 27,
    });
  } else if (avgAge <= 24) {
    if (philosophy === 'developmental') {
      strengths.push({
        category: 'age-profile',
        headline: 'Young and developing',
        detail: `With an average age of ${avgAge.toFixed(1)}, this squad is perfectly suited to your developmental philosophy. Growth potential is enormous.`,
        magnitude: 27 - avgAge,
      });
    } else if (philosophy === 'pragmatic' || philosophy === 'defensive') {
      weaknesses.push({
        category: 'age-profile',
        headline: 'Young and inexperienced',
        detail: `The squad average age is just ${avgAge.toFixed(1)}. For a ${philosophy} approach, the lack of experience could be a liability in tight matches.`,
        magnitude: 27 - avgAge,
      });
    }
    // Other philosophies: neutral on young squads (not surfaced)
  }

  // ─── 4. Star Player ───
  const starThreshold = tierMedian + 8;
  const stars = roster
    .filter((p) => p.overall >= starThreshold)
    .sort((a, b) => b.overall - a.overall);

  if (stars.length > 0) {
    const star = stars[0];
    strengths.push({
      category: 'star-player',
      headline: `${star.name} remains your talisman`,
      detail: `Rated ${star.overall} overall, ${star.name} is a cut above the rest of the squad. Protect and build around this player.`,
      magnitude: star.overall - tierMedian,
    });
  }

  // ─── 5. Form Carryover (skipped Season 1) ───
  if (seasonNumber > 1) {
    const formStarters = roster
      .filter((p) => p.formHistory.length > 0)
      .sort((a, b) => b.overall - a.overall);
    const highFormCount = formStarters.filter((p) => p.form >= 3).length;
    if (highFormCount >= 3) {
      strengths.push({
        category: 'form-carryover',
        headline: 'Carrying momentum',
        detail: `${highFormCount} players ended last season in outstanding form. That confidence carries forward into the new campaign.`,
        magnitude: highFormCount,
      });
    }
  }

  // ─── 6. Squad Shape Imbalance ───
  const attackingAvgs = ATTACKING_POSITIONS.map((pos) => {
    const top = getTopPlayers(roster, pos, STARTER_COUNT[pos]);
    return top.length > 0 ? top.reduce((s, p) => s + p.overall, 0) / top.length : 0;
  });
  const defensiveAvgs = DEFENSIVE_POSITIONS.map((pos) => {
    const top = getTopPlayers(roster, pos, STARTER_COUNT[pos]);
    return top.length > 0 ? top.reduce((s, p) => s + p.overall, 0) / top.length : 0;
  });

  // Average of the position group averages
  const attackScore = attackingAvgs.reduce((s, v) => s + v, 0) / attackingAvgs.length;
  const defenseScore = defensiveAvgs.reduce((s, v) => s + v, 0) / defensiveAvgs.length;
  const shapeGap = attackScore - defenseScore;

  if (Math.abs(shapeGap) > 5) {
    const isAttackHeavy = shapeGap > 0;
    const imbalanceLabel = isAttackHeavy
      ? 'Attack-heavy squad shape'
      : 'Defence-heavy squad shape';

    let isWeakness = false;
    let detail = '';

    if (isAttackHeavy) {
      if (philosophy === 'attacking') {
        // Attacking-heavy is fine for attacking managers — don't flag
        detail = '';
      } else if (philosophy === 'defensive') {
        isWeakness = true;
        detail = `The squad is heavily weighted towards attack (${attackScore.toFixed(0)} avg) while defence lags behind (${defenseScore.toFixed(0)} avg). For a defensive approach, this is an acute weakness.`;
      } else if (philosophy === 'pragmatic') {
        isWeakness = true;
        detail = `Too much going forward, not enough steel at the back. The attacking depth (${attackScore.toFixed(0)} avg) far outstrips the defence (${defenseScore.toFixed(0)} avg).`;
      } else {
        isWeakness = true;
        detail = `The squad shape is imbalanced — attacking quality (${attackScore.toFixed(0)} avg) significantly outpaces defensive quality (${defenseScore.toFixed(0)} avg).`;
      }
    } else {
      // Defense-heavy
      detail = `The squad shape is imbalanced — defensive quality (${defenseScore.toFixed(0)} avg) significantly outpaces attacking quality (${attackScore.toFixed(0)} avg). Creating goals could be a challenge.`;
      isWeakness = true;
    }

    if (isWeakness && detail) {
      weaknesses.push({
        category: 'shape-imbalance',
        headline: imbalanceLabel,
        detail,
        magnitude: Math.abs(shapeGap),
      });
    }
  }

  // ─── Philosophy-specific midfield depth check ───
  if (philosophy === 'possession') {
    const mfAvg = positionGroupAvg(roster, 'MF');
    const tierMfMedian = computeTierPositionMedian(allClubs, tier, 'MF');
    if (mfAvg < tierMfMedian - 2) {
      // Check if not already flagged as a position-quality weakness
      const alreadyFlagged = weaknesses.some(
        (w) => w.category === 'position-quality' && w.position === 'MF',
      );
      if (!alreadyFlagged) {
        weaknesses.push({
          category: 'position-quality',
          position: 'MF',
          headline: 'Midfield lacks quality for possession play',
          detail: `For a possession-based approach, the midfield (${mfAvg.toFixed(0)} avg) needs to be the engine room. Current quality falls short of expectations.`,
          magnitude: Math.abs(mfAvg - tierMfMedian),
        });
      }
    }
  }

  // ─── Prioritize & Cap ───
  strengths.sort((a, b) => b.magnitude - a.magnitude);
  weaknesses.sort((a, b) => b.magnitude - a.magnitude);

  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
  };
}

// ─── Utility Labels ───

function tierMedianLabel(tier: number): string {
  const labels: Record<number, string> = {
    1: 'elite-tier',
    2: 'contender-tier',
    3: 'established-tier',
    4: 'mid-table-tier',
    5: 'survival-tier',
  };
  return labels[tier] || 'tier';
}

function getTierFloorRating(tier: number): number {
  const floors: Record<number, number> = {
    1: 77,
    2: 72,
    3: 69,
    4: 66,
    5: 63,
  };
  return floors[tier] || 66;
}
