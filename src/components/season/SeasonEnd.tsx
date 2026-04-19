import { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { LeagueTable } from '../shared/LeagueTable';
import { AgingReport } from './AgingReport';
import { Confetti } from '../shared/Confetti';
import type { AgingResult } from '../../engine/aging';
import type { LeagueTableRow, Player, Club } from '../../types/entities';

import { CLUB_MANAGERS, TIER_EXPECTED_POSITION } from '../../data/managers';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

interface Award {
  title: string;
  winner: string;
  club: string;
  clubColor: string;
  stat: string;
}

interface SeasonEndProps {
  onContinue: () => void;
  faCupWinner?: string | null;
  agingResults?: AgingResult[];
}

export function SeasonEnd({ onContinue, faCupWinner, agingResults = [] }: SeasonEndProps) {
  const manager = useGameStore((s) => s.manager);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const [showConfetti, setShowConfetti] = useState(false);
  const clubs = useGameStore((s) => s.clubs);
  const boardExpectation = useGameStore((s) => s.boardExpectation);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const events = useGameStore((s) => s.events);

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const playerClubId = manager?.clubId;
  const playerPosition = sortedTable.findIndex((r) => r.clubId === playerClubId) + 1;
  const wonLeague = playerPosition === 1;

  useEffect(() => {
    if (wonLeague) {
      const t = setTimeout(() => setShowConfetti(true), 400);
      return () => clearTimeout(t);
    }
  }, [wonLeague]);
  const playerRow = sortedTable.find((r) => r.clubId === playerClubId);
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const playerClubData = clubDataMap.get(playerClubId || '');

  // Compute awards from all players across all clubs
  const awards = useMemo(() => {
    const allPlayers: { player: Player; club: Club }[] = [];
    for (const club of clubs) {
      for (const player of club.roster) {
        if (!player.isTemporary) {
          allPlayers.push({ player, club });
        }
      }
    }

    const result: Award[] = [];

    // League Champion
    const championId = sortedTable[0]?.clubId;
    const championClub = clubDataMap.get(championId);
    if (championClub) {
      result.push({
        title: 'League Champion',
        winner: championClub.name,
        club: championClub.name,
        clubColor: championClub.colors.primary,
        stat: `${sortedTable[0].points} pts`,
      });
    }

    // FA Cup Winner
    if (faCupWinner) {
      const cupClub = clubDataMap.get(faCupWinner);
      if (cupClub) {
        result.push({
          title: 'FA Cup Winner',
          winner: cupClub.name,
          club: cupClub.name,
          clubColor: cupClub.colors.primary,
          stat: '',
        });
      }
    }

    // Golden Boot — most goals
    let topScorer = { name: '', goals: 0, clubId: '' };
    for (const { player, club } of allPlayers) {
      if (player.goals > topScorer.goals) {
        topScorer = { name: player.name, goals: player.goals, clubId: club.id };
      }
    }
    if (topScorer.goals > 0) {
      const sc = clubDataMap.get(topScorer.clubId);
      result.push({
        title: 'Golden Boot',
        winner: topScorer.name,
        club: sc?.name || '',
        clubColor: sc?.colors.primary || '#1A1A1A',
        stat: `${topScorer.goals} goals`,
      });
    }

    // Playmaker of the Season — most assists
    let topAssister = { name: '', assists: 0, clubId: '' };
    for (const { player, club } of allPlayers) {
      if (player.assists > topAssister.assists) {
        topAssister = { name: player.name, assists: player.assists, clubId: club.id };
      }
    }
    if (topAssister.assists > 0) {
      const ac = clubDataMap.get(topAssister.clubId);
      result.push({
        title: 'Playmaker of the Season',
        winner: topAssister.name,
        club: ac?.name || '',
        clubColor: ac?.colors.primary || '#1A1A1A',
        stat: `${topAssister.assists} assists`,
      });
    }

    // Player of the Season — highest overall + avg form
    let pots = { name: '', rating: 0, clubId: '' };
    for (const { player, club } of allPlayers) {
      const rating = player.overall + player.form;
      if (rating > pots.rating) {
        pots = { name: player.name, rating, clubId: club.id };
      }
    }
    if (pots.rating > 0) {
      const pc = clubDataMap.get(pots.clubId);
      result.push({
        title: 'Player of the Season',
        winner: pots.name,
        club: pc?.name || '',
        clubColor: pc?.colors.primary || '#1A1A1A',
        stat: `${pots.rating} rating`,
      });
    }

    // Young Player of the Season — age 21 or under
    let ypots = { name: '', rating: 0, clubId: '' };
    for (const { player, club } of allPlayers) {
      if (player.age <= 21) {
        const rating = player.overall + player.form;
        if (rating > ypots.rating) {
          ypots = { name: player.name, rating, clubId: club.id };
        }
      }
    }
    if (ypots.rating > 0) {
      const yc = clubDataMap.get(ypots.clubId);
      result.push({
        title: 'Young Player of the Season',
        winner: ypots.name,
        club: yc?.name || '',
        clubColor: yc?.colors.primary || '#1A1A1A',
        stat: `${ypots.rating} rating`,
      });
    }

    // Golden Glove — most clean sheets (GK only)
    let topGK = { name: '', cs: 0, clubId: '' };
    for (const { player, club } of allPlayers) {
      if (player.position === 'GK' && player.cleanSheets > topGK.cs) {
        topGK = { name: player.name, cs: player.cleanSheets, clubId: club.id };
      }
    }
    if (topGK.cs > 0) {
      const gc = clubDataMap.get(topGK.clubId);
      result.push({
        title: 'Golden Glove',
        winner: topGK.name,
        club: gc?.name || '',
        clubColor: gc?.colors.primary || '#1A1A1A',
        stat: `${topGK.cs} clean sheets`,
      });
    }

    // Manager of the Year — always awarded, based on overperformance vs tier
    {
      let bestOverperf = -Infinity;
      let motyCandidateId = '';

      for (let i = 0; i < sortedTable.length; i++) {
        const row = sortedTable[i];
        const clubData = clubDataMap.get(row.clubId);
        if (!clubData) continue;

        const expected = TIER_EXPECTED_POSITION[clubData.tier] ?? 10;
        const actual = i + 1;
        const overperformance = expected - actual; // positive = overperformed

        if (overperformance > bestOverperf) {
          bestOverperf = overperformance;
          motyCandidateId = row.clubId;
        }
      }

      // Champion always gets consideration — if they overperformed more, they win
      if (championId && motyCandidateId !== championId) {
        const champData = clubDataMap.get(championId);
        const champExpected = TIER_EXPECTED_POSITION[champData?.tier ?? 1] ?? 2.5;
        const champOverperf = champExpected - 1;
        if (champOverperf >= bestOverperf) {
          motyCandidateId = championId;
        }
      }

      if (motyCandidateId) {
        const motyClub = clubDataMap.get(motyCandidateId);
        const motyActual = sortedTable.findIndex((r) => r.clubId === motyCandidateId) + 1;
        // Use user's manager name if it's their club, otherwise real EPL manager name
        const motyName = motyCandidateId === playerClubId
          ? (manager?.name || 'You')
          : (CLUB_MANAGERS[motyCandidateId] || 'Unknown Manager');

        result.push({
          title: 'Manager of the Year',
          winner: motyName,
          club: motyClub?.name || '',
          clubColor: motyClub?.colors.primary || '#1A1A1A',
          stat: `${motyActual}${getOrdinal(motyActual)} place`,
        });
      }
    }

    return result;
  }, [sortedTable, clubs, faCupWinner, manager, playerPosition, playerClubId, playerClubData]);

  // Generate interview
  const interview = useMemo(() => {
    return generateInterview(
      playerClub,
      playerClubData,
      playerPosition,
      playerRow,
      boardExpectation,
      manager,
      seasonNumber,
      events,
      clubs,
    );
  }, [playerClub, playerClubData, playerPosition, playerRow, boardExpectation, manager, seasonNumber, events, clubs]);

  return (
    <div className="plm-space-y-4 plm-w-full">
      {showConfetti && <Confetti count={80} duration={4000} />}
      {/* Final table */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-mb-1">
          Final Standings
        </h2>
        <p className="plm-text-xs plm-text-warm-500 plm-mb-3">
          Season {seasonNumber} complete
        </p>
        <LeagueTable />
      </div>

      {/* Your season stats */}
      {playerRow && (
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
            Your Season
          </h3>
          <div className="plm-grid plm-grid-cols-3 sm:plm-grid-cols-6 plm-gap-2">
            <MiniStat label="Pos" value={`${playerPosition}${getOrdinal(playerPosition)}`} />
            <MiniStat label="Pts" value={playerRow.points} />
            <MiniStat label="W-D-L" value={`${playerRow.won}-${playerRow.drawn}-${playerRow.lost}`} />
            <MiniStat label="GF" value={playerRow.goalsFor} />
            <MiniStat label="GA" value={playerRow.goalsAgainst} />
            <MiniStat label="GD" value={`${playerRow.goalDifference > 0 ? '+' : ''}${playerRow.goalDifference}`} />
          </div>
        </div>
      )}

      {/* Awards */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h3 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-4">
          Awards Ceremony
        </h3>
        <div className="plm-grid plm-grid-cols-1 md:plm-grid-cols-2 lg:plm-grid-cols-3 plm-gap-3">
          {awards.map((award) => (
            <AwardCard key={award.title} award={award} />
          ))}
        </div>
      </div>

      {/* Aging Report */}
      {agingResults.length > 0 && <AgingReport agingResults={agingResults} />}

      {/* The Athletic Interview */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4 md:plm-p-6">
        <div className="plm-max-w-2xl plm-mx-auto">
          <div className="plm-flex plm-items-center plm-gap-2 plm-mb-4">
            <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
            <span className="plm-text-[10px] plm-font-bold plm-text-warm-400 plm-uppercase plm-tracking-[0.2em]">
              The Athletic
            </span>
            <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
          </div>
          <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-text-center plm-mb-1">
            End-of-Season Interview
          </h3>
          <p className="plm-text-xs plm-text-warm-500 plm-text-center plm-mb-6 plm-italic">
            {manager?.name}, {playerClubData?.name}
          </p>
          <div className="plm-space-y-5">
            {interview.map((qa, idx) => (
              <div key={idx}>
                <p className="plm-text-sm plm-font-semibold plm-text-charcoal plm-mb-1.5 plm-font-body">
                  {qa.question}
                </p>
                <p className="plm-text-sm plm-text-warm-600 plm-leading-relaxed plm-font-body plm-italic">
                  &ldquo;{qa.answer}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-bg-charcoal plm-text-white hover:plm-bg-charcoal-light plm-transition-colors plm-min-h-[44px]"
      >
        Continue to Off-Season
      </button>
    </div>
  );
}

function AwardCard({ award }: { award: Award }) {
  return (
    <div className="plm-rounded-lg plm-border plm-border-warm-200 plm-p-3 plm-bg-warm-50">
      <div className="plm-text-[10px] plm-font-bold plm-text-warm-400 plm-uppercase plm-tracking-wider plm-mb-1.5">
        {award.title}
      </div>
      <div className="plm-font-display plm-font-bold plm-text-charcoal plm-text-base plm-mb-0.5">
        {award.winner}
      </div>
      <div className="plm-flex plm-items-center plm-gap-1.5">
        <div
          className="plm-w-2.5 plm-h-2.5 plm-rounded-full"
          style={{ backgroundColor: award.clubColor }}
        />
        <span className="plm-text-xs plm-text-warm-500">{award.club}</span>
        {award.stat && (
          <span className="plm-text-xs plm-text-warm-400">&middot; {award.stat}</span>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="plm-text-center plm-bg-warm-50 plm-rounded plm-py-2 plm-px-1">
      <div className="plm-text-[9px] plm-text-warm-400 plm-uppercase plm-tracking-wider">{label}</div>
      <div className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums">{String(value)}</div>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface InterviewQA {
  question: string;
  answer: string;
}

function generateInterview(
  playerClub: Club | undefined,
  playerClubData: ReturnType<typeof clubDataMap.get>,
  playerPosition: number,
  _playerRow: LeagueTableRow | undefined,
  boardExpectation: { minPosition: number; description: string } | null,
  manager: { name: string; clubId: string; reputation: number } | null,
  _seasonNumber: number,
  events: { description: string; type: string; category: string }[],
  _clubs: Club[],
): InterviewQA[] {
  const interview: InterviewQA[] = [];
  const clubName = playerClubData?.name || 'the club';

  // Q1: Final position vs expectations
  const met = boardExpectation && playerPosition <= boardExpectation.minPosition;
  if (met) {
    interview.push({
      question: `${clubName} finish ${playerPosition}${getOrdinal(playerPosition)} — above the board's target. How do you reflect on the season?`,
      answer: `It's been a tremendous campaign. The target was ${boardExpectation?.description.toLowerCase()}, and we've exceeded that. The players have been exceptional, and I couldn't be prouder of the squad's commitment this season.`,
    });
  } else {
    interview.push({
      question: `A ${playerPosition}${getOrdinal(playerPosition)}-place finish — below where the board expected. What went wrong?`,
      answer: `Look, I won't make excuses. We came up short. There were periods where we lost our way, and at this level, consistency is everything. I take full responsibility and we'll be working hard to put things right.`,
    });
  }

  // Q2: Best performer
  if (playerClub && playerClub.roster.length > 0) {
    const bestPlayer = [...playerClub.roster]
      .filter((p) => !p.isTemporary)
      .sort((a, b) => (b.overall + b.form + b.goals * 0.5) - (a.overall + a.form + a.goals * 0.5))[0];
    if (bestPlayer) {
      interview.push({
        question: `Who stood out for you this season?`,
        answer: `${bestPlayer.name} has been outstanding. ${bestPlayer.goals > 5 ? `${bestPlayer.goals} goals speaks for itself — ` : ''}The consistency and quality week in, week out has been exactly what we needed. A real leader on the pitch.`,
      });
    }
  }

  // Q3: Narrative event reference
  const narrativeEvents = events.filter((e) => e.type === 'narrative' || e.category === 'season_narrative');
  if (narrativeEvents.length > 0) {
    const event = narrativeEvents[narrativeEvents.length - 1];
    interview.push({
      question: `There were some notable moments off the pitch too. Any that stick in your mind?`,
      answer: `Yes — ${event.description.toLowerCase()}. These things are part of football. You have to manage the ups and downs, keep the squad focused on what matters. That's the job.`,
    });
  } else {
    interview.push({
      question: `How would you describe the mood in the dressing room throughout the season?`,
      answer: `Focused. Professional. We had our moments — every team does — but the spirit has been excellent. That togetherness will serve us well going forward.`,
    });
  }

  // Q4: Reputation trajectory
  const rep = manager?.reputation || 50;
  if (rep >= 70) {
    interview.push({
      question: `Your reputation in the game has grown significantly. Are you now one of the elite managers?`,
      answer: `I'll leave that for others to judge. What I know is that we've built something here, and I believe there's more to come. The focus is always on the next challenge.`,
    });
  } else if (rep <= 30) {
    interview.push({
      question: `It's been a difficult period for you personally. How do you respond to the critics?`,
      answer: `I've been in this game long enough to know that results are what matter. I believe in this squad and I believe in the work we're doing. We'll come back stronger.`,
    });
  } else {
    interview.push({
      question: `Where do you see yourself in the managerial landscape right now?`,
      answer: `Building, always building. Each season teaches you something new. I'm confident in the direction we're heading, and the players have bought into what we're trying to do.`,
    });
  }

  // Q5: Looking ahead
  interview.push({
    question: `Finally, what can fans expect next season?`,
    answer: `Ambition. We'll look at the squad, identify where we can strengthen, and come back ready to compete. The transfer window will be important, but the foundation is there. ${
      playerPosition <= 4 ? 'We want to build on this success.' : 'We have a point to prove.'
    }`,
  });

  return interview;
}
