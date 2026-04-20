import type { ChairmanPersonality } from '../data/chairmen';
import type { BoardExpectation } from '../types/entities';

// ─── Standing Classification ───

export type ManagerStanding = 'exceeded' | 'on_track' | 'at_risk' | 'failing';

export function classifyStanding(
  currentPosition: number,
  boardExpectation: BoardExpectation,
): ManagerStanding {
  if (currentPosition <= boardExpectation.minPosition - 3) return 'exceeded';
  if (currentPosition <= boardExpectation.minPosition) return 'on_track';
  if (currentPosition <= boardExpectation.minPosition + 3) return 'at_risk';
  return 'failing';
}

// ─── Greeting Templates ───

interface GreetingTemplate {
  personality: ChairmanPersonality;
  season1: string[];
  returning_exceeded: string[];
  returning_on_track: string[];
  returning_at_risk: string[];
  returning_failing: string[];
}

const GREETING_TEMPLATES: GreetingTemplate[] = [
  {
    personality: 'patient',
    season1: [
      "Welcome aboard, {manager}. We're delighted to have you. There's no rush here — we believe in building something lasting. Take the time to learn the squad and make this club your own.",
      "Glad to have you with us, {manager}. We know Rome wasn't built in a day, and neither will this project be. We trust your vision — now let's get to work.",
      "{manager}, welcome to the family. The board is united behind you. We believe in steady progress, not overnight miracles. Let's lay the foundations for something special.",
    ],
    returning_exceeded: [
      "{manager}, what a season! Finishing {lastFinish} was beyond what any of us expected. The board is genuinely grateful for the work you've done. We're excited to see where you take us next.",
      "Remarkable work, {manager}. A {lastFinish} finish exceeded all our expectations. The board wants you to know how much we appreciate what you've achieved. Keep this going.",
      "{manager}, the board can't thank you enough. A {lastFinish} finish is a testament to your quality. We're behind you completely — let's see if we can go even further.",
    ],
    returning_on_track: [
      "Good to see you again, {manager}. Last season was exactly what we hoped for — a solid {lastFinish} finish. Let's keep building on that momentum, one step at a time.",
      "{manager}, the board is pleased with the direction we're heading. The {lastFinish} finish showed real progress. We'll continue to back you.",
      "Another season, another step forward, {manager}. The board recognises the progress. We're not going to change what's working — stay the course.",
    ],
    returning_at_risk: [
      "{manager}, last season wasn't quite what we expected with a {lastFinish} finish, but the board remains patient. We've seen enough to believe this can be turned around.",
      "We won't pretend the {lastFinish} finish was ideal, {manager}. But we're not a club that panics. Show us improvement this season and the board will stay behind you.",
      "{manager}, the fans are restless after finishing {lastFinish}, and we understand why. But we're giving you the runway to put it right. Don't waste it.",
    ],
    returning_failing: [
      "{manager}, we need to talk honestly. A {lastFinish} finish is well below what this club should accept. The board's patience is not unlimited, even here.",
      "This is a difficult conversation, {manager}. Finishing {lastFinish} has put enormous pressure on this boardroom. We still believe in you — but results must improve immediately.",
      "{manager}, I'll be straight with you. The {lastFinish} finish last season has shareholders asking questions. This season is critical — there won't be another chance like this.",
    ],
  },
  {
    personality: 'demanding',
    season1: [
      "{manager}, welcome. Let me be clear from the start — this club demands results. You were hired because we believe you can deliver. Don't make us regret that decision.",
      "Welcome, {manager}. I don't do long introductions. You know the expectations, you know the standards. Meet them, and we'll get along just fine.",
      "{manager}, the board has put its faith in you. That faith is not unconditional. This club has a proud history and I expect you to add to it. Starting now.",
    ],
    returning_exceeded: [
      "{manager}, a {lastFinish} finish. I'll admit — you've impressed me, and that's not easy. But don't let it go to your head. The target moves up. I expect even more.",
      "Finishing {lastFinish} was a statement, {manager}. The board acknowledges your achievement. But remember — one great season means nothing if you can't follow it up.",
      "{manager}, take a moment to enjoy the {lastFinish} finish. You've earned it. Now — the bar is higher. This club doesn't settle for past glory.",
    ],
    returning_on_track: [
      "{manager}, the {lastFinish} finish last season was acceptable. Acceptable — not exceptional. I expect you to push for more this time around.",
      "Finishing {lastFinish} was a decent start, {manager}. But this club should never be satisfied with decent. Raise the bar.",
      "{manager}, you met expectations last season with a {lastFinish} finish. Good. Now exceed them. That's what the best managers do.",
    ],
    returning_at_risk: [
      "{manager}, a {lastFinish} finish is not what I hired you for. Consider this a warning — the board expects a significant improvement this season.",
      "Finishing {lastFinish} was unacceptable, {manager}. I'm giving you one more chance to prove you're the right person for this job. Don't squander it.",
      "{manager}, the {lastFinish} finish last season was deeply disappointing. The board discussed your position at length. You're still here — barely. Fix this.",
    ],
    returning_failing: [
      "{manager}, I won't mince words. A {lastFinish} finish is a disgrace for this football club. You are on thin ice, and the board is watching every result.",
      "A {lastFinish} finish. {manager}, I have never been more disappointed in my time as chairman. Deliver immediately, or we will find someone who can.",
      "{manager}, the fans are calling for your head after finishing {lastFinish}. Frankly, I understand why. This is your last chance. Make it count.",
    ],
  },
  {
    personality: 'ambitious',
    season1: [
      "{manager}, welcome to the start of something big. This club is going places, and you're the person we've chosen to lead the charge. Dream big — we certainly do.",
      "Welcome aboard, {manager}. We don't do small ambitions here. The board wants to see this club compete at the very highest level, and we believe you're the manager to get us there.",
      "{manager}, the future is bright and it starts today. We've invested in you because we see a vision for greatness. Let's turn that vision into reality.",
    ],
    returning_exceeded: [
      "{manager}, incredible! A {lastFinish} finish is exactly the kind of ambition this club is built on. The board is thrilled — you've shown everyone what's possible. Now let's dream even bigger.",
      "What a season, {manager}! Finishing {lastFinish} blew past every projection. This is the kind of momentum that changes a club's trajectory. The board is fully behind your vision.",
      "{manager}, the {lastFinish} finish has the whole club buzzing. You've turned ambition into results. The board wants to push on — tell us what you need to go further.",
    ],
    returning_on_track: [
      "{manager}, finishing {lastFinish} last season was a strong step forward. But we're not building this project to stand still — let's push for the next level.",
      "Good work last season with a {lastFinish} finish, {manager}. The board sees the trajectory. Now let's accelerate it. This club should be aiming higher every year.",
      "{manager}, the {lastFinish} finish was a platform, not a ceiling. The board wants to see ambition reflected in results this season. Let's go further.",
    ],
    returning_at_risk: [
      "{manager}, finishing {lastFinish} wasn't the progress we expected. This is an ambitious club and we need to see the needle moving in the right direction.",
      "The {lastFinish} finish was a setback, {manager}. The board's ambitions haven't changed — but our patience has shortened. This season needs to be different.",
      "{manager}, we backed you to take this club forward, and a {lastFinish} finish feels like treading water. The board expects a real response this season.",
    ],
    returning_failing: [
      "{manager}, a {lastFinish} finish is going backwards, and this is a club that only moves forward. You need to understand the urgency of what I'm telling you.",
      "Finishing {lastFinish} is the opposite of what this project is about, {manager}. We invested in ambition, not decline. The board demands an immediate turnaround.",
      "{manager}, the grand plan is in jeopardy after finishing {lastFinish}. If the results don't improve dramatically, we'll have no choice but to reconsider.",
    ],
  },
  {
    personality: 'frugal',
    season1: [
      "{manager}, welcome. You'll find we run a tight ship here. Every pound matters, every signing must justify itself. We don't throw money at problems — we solve them with intelligence.",
      "Welcome, {manager}. Before you look at the budget, understand our philosophy: value over vanity. We believe in smart recruitment, not headline transfers. Work within the means.",
      "{manager}, glad to have you. Let me set expectations: we're not going to outspend anyone. What we will do is outsmart them. That's what we hired you for.",
    ],
    returning_exceeded: [
      "{manager}, a {lastFinish} finish — and on our budget? That's extraordinary value. The board is deeply impressed. You've proven that smart management beats big spending every time.",
      "Finishing {lastFinish} while keeping costs down is exactly what this club stands for, {manager}. The board couldn't be happier with the return on investment. Well done.",
      "{manager}, the {lastFinish} finish speaks volumes about your efficiency. The shareholders are delighted — results like these make every penny worthwhile.",
    ],
    returning_on_track: [
      "{manager}, the {lastFinish} finish last season was excellent value for what we spent. That's exactly the kind of efficiency this board appreciates. More of the same, please.",
      "Finishing {lastFinish} on our budget was an achievement, {manager}. The board values fiscal responsibility as much as results — and you delivered on both.",
      "{manager}, strong season, strong balance sheet. A {lastFinish} finish while keeping the books tidy is precisely what we look for. Keep finding those efficiencies.",
    ],
    returning_at_risk: [
      "{manager}, finishing {lastFinish} doesn't justify the outlay from last season. We need to see better returns on the investments we've made.",
      "The {lastFinish} finish was below par, {manager}. We don't have the budget to buy our way out of trouble, so you'll need to be clever with what you've got.",
      "{manager}, the board is concerned that a {lastFinish} finish represents poor value. There won't be a spending spree to fix this — solutions must come from within.",
    ],
    returning_failing: [
      "{manager}, finishing {lastFinish} is a terrible return on investment. The board needs to see immediate improvement, and frankly, you'll need to do it with what you have.",
      "A {lastFinish} finish, {manager}. The shareholders are asking whether their money is being well spent, and I'm struggling to defend you. Results. Now.",
      "{manager}, we can't afford to throw money at this, and we can't afford a repeat of the {lastFinish} finish. The budget is tight and the expectation is clear: do more with less.",
    ],
  },
  {
    personality: 'nostalgic',
    season1: [
      "{manager}, welcome to a club with history in its bones. Generations of supporters have stood on these terraces. You're now part of that story — make it a chapter worth reading.",
      "Welcome, {manager}. If you look around this boardroom, you'll see the photographs on the walls. Every one of them tells a story of glory. It's been too long since we added a new frame.",
      "{manager}, this club was built by legends. The fans remember the great days, and they're waiting for someone to bring them back. We believe you can be that person.",
    ],
    returning_exceeded: [
      "{manager}, finishing {lastFinish}! The old photographs on the wall are smiling. It's been a long time since this club felt like this. The supporters are singing your name.",
      "A {lastFinish} finish, {manager}. I've been at this club a long time, and I haven't felt this pride in years. You're writing a new chapter worthy of the greats.",
      "{manager}, the {lastFinish} finish has reminded everyone what this club can be. The legends of the past would be proud. The board extends its heartfelt thanks.",
    ],
    returning_on_track: [
      "{manager}, the {lastFinish} finish last season reminded us of the good times. The fans are starting to believe again. Keep that spirit alive.",
      "Finishing {lastFinish} brought back echoes of the glory days, {manager}. The old ground is buzzing again. Let's give them more to sing about.",
      "{manager}, the {lastFinish} finish had the supporters dreaming. This club has always been at its best when the fans and the team are united. Don't let that fade.",
    ],
    returning_at_risk: [
      "{manager}, finishing {lastFinish} last season wasn't up to the standards this club has set over decades. The fans deserve better — they always have.",
      "The {lastFinish} finish last season was disappointing, {manager}. I've seen this club at its peak, and this isn't it. We owe it to the history to do better.",
      "{manager}, the old photographs on this wall are watching us. A {lastFinish} finish dishonours their memory. This club is better than that.",
    ],
    returning_failing: [
      "{manager}, a {lastFinish} finish. The supporters who remember the great days are heartbroken. I've been at this club for decades and this is among the lowest points.",
      "Finishing {lastFinish} is unworthy of this football club, {manager}. I've seen everything in my years here, but I never expected to see us fall this far.",
      "{manager}, the legends of this club would be ashamed to see a {lastFinish} finish. I don't say that lightly. Something must change — and quickly.",
    ],
  },
];

// ─── Greeting Selection ───

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function selectGreeting(
  personality: ChairmanPersonality,
  seasonNumber: number,
  managerName: string,
  lastSeasonPosition: number | null,
  standing: ManagerStanding,
): string {
  const template = GREETING_TEMPLATES.find((t) => t.personality === personality);
  if (!template) return `Welcome, ${managerName}. Let's have a good season.`;

  let pool: string[];
  if (seasonNumber === 1) {
    pool = template.season1;
  } else {
    switch (standing) {
      case 'exceeded':
        pool = template.returning_exceeded;
        break;
      case 'on_track':
        pool = template.returning_on_track;
        break;
      case 'at_risk':
        pool = template.returning_at_risk;
        break;
      case 'failing':
        pool = template.returning_failing;
        break;
    }
  }

  // Deterministic pick based on season number
  const idx = (seasonNumber - 1) % pool.length;
  let text = pool[idx];

  text = text.replace(/\{manager\}/g, managerName);
  if (lastSeasonPosition !== null) {
    text = text.replace(/\{lastFinish\}/g, getOrdinalSuffix(lastSeasonPosition));
  }

  return text;
}

// ─── Goal Description ───

export function describeGoal(boardExpectation: BoardExpectation): string {
  const { minPosition, description } = boardExpectation;
  if (minPosition === 1) return 'Win the league.';
  if (minPosition <= 4) return 'Finish in the top four.';
  if (minPosition <= 8) return 'Secure a top-half finish.';
  if (minPosition <= 14) return 'Achieve a comfortable mid-table finish.';
  if (minPosition <= 17) return 'Avoid relegation.';
  return description || 'Survive.';
}

// ─── Budget Dialogue ───

export function describeBudget(
  personality: ChairmanPersonality,
  budget: number,
): string {
  const amount = `\u00A3${budget.toFixed(0)}M`;
  switch (personality) {
    case 'frugal':
      return `You'll have ${amount} to work with this summer. I trust you'll spend it wisely — every penny must count. We're not in the business of wasting money.`;
    case 'ambitious':
      return `We've set aside ${amount} for this window. Use it aggressively — the board wants to see statement signings that match our ambitions.`;
    case 'demanding':
      return `The budget is ${amount}. I expect you to use it effectively. Poor recruitment will be on your head.`;
    case 'patient':
      return `You'll have ${amount} to spend this summer. Take your time finding the right targets — we'd rather get the right players than rush into anything.`;
    case 'nostalgic':
      return `There's ${amount} in the kitty this summer. Find players who'll bleed for this shirt — talent matters, but so does character.`;
  }
}
