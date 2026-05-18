import { describe, it, expect } from 'vitest';
import { detectSchoolSetBonus, detectSchoolSetBonusFromCards, SET_BONUS_TSS } from '../setBonus';
import { SHAPE_CARDS, TEMPO_CARDS, getShapeCardForFormation, getTempoCardForMentality } from '@/data/tacticCards';
import { getInstructionCard } from '@/data/instructionCards';
import type { TacticCard } from '@/types/tactics';

/**
 * Phase D set-bonus tests. The bonus is one-sided (user only) and worth
 * SET_BONUS_TSS when all three slots share a school.
 */

describe('detectSchoolSetBonusFromCards', () => {
  const mkCard = (overrides: Partial<TacticCard>): TacticCard => ({
    id: 't',
    slot: 'instruction',
    name: 't',
    description: '',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    ...overrides,
  });

  it('returns 0 when any slot is missing', () => {
    const c = mkCard({ schools: ['gegenpress'] });
    expect(detectSchoolSetBonusFromCards(null, c, c).tssDelta).toBe(0);
    expect(detectSchoolSetBonusFromCards(c, null, c).tssDelta).toBe(0);
    expect(detectSchoolSetBonusFromCards(c, c, null).tssDelta).toBe(0);
  });

  it('returns 0 when any slot has no schools tag', () => {
    const tagged = mkCard({ schools: ['gegenpress'] });
    const neutral = mkCard({ schools: [] });
    expect(detectSchoolSetBonusFromCards(tagged, tagged, neutral).tssDelta).toBe(0);
  });

  it('returns SET_BONUS_TSS when all three slots share a school', () => {
    const result = detectSchoolSetBonusFromCards(
      mkCard({ schools: ['gegenpress', 'total-football'] }),
      mkCard({ schools: ['gegenpress'] }),
      mkCard({ schools: ['gegenpress'] }),
    );
    expect(result.tssDelta).toBe(SET_BONUS_TSS);
    expect(result.school).toBe('gegenpress');
  });

  it('returns 0 when only two of three slots share a school', () => {
    const result = detectSchoolSetBonusFromCards(
      mkCard({ schools: ['gegenpress'] }),
      mkCard({ schools: ['gegenpress'] }),
      mkCard({ schools: ['catenaccio'] }),
    );
    expect(result.tssDelta).toBe(0);
  });

  it('reports the first shared school in shape order for stable labels', () => {
    const result = detectSchoolSetBonusFromCards(
      mkCard({ schools: ['catenaccio', 'direct'] }),
      mkCard({ schools: ['catenaccio', 'direct'] }),
      mkCard({ schools: ['catenaccio', 'direct'] }),
    );
    expect(result.school).toBe('catenaccio');
  });
});

describe('detectSchoolSetBonus (formation/mentality wrapper)', () => {
  it('returns 0 when instructionCardId is null', () => {
    expect(detectSchoolSetBonus('4-3-3', 'attacking', null).tssDelta).toBe(0);
    expect(detectSchoolSetBonus('4-3-3', 'attacking', undefined).tssDelta).toBe(0);
  });

  it('produces a set bonus for a thematically aligned loadout', () => {
    // 4-3-3 = gegenpress/total-football, attacking = gegenpress/direct,
    // press-from-front bronze = gegenpress/total-football
    const result = detectSchoolSetBonus('4-3-3', 'attacking', 'instr-press-from-front');
    expect(result.tssDelta).toBe(SET_BONUS_TSS);
    expect(result.school).toBe('gegenpress');
  });

  it('returns 0 for a deliberately mismatched loadout', () => {
    // 5-3-2 = catenaccio only; instruction tagged gegenpress only → no overlap
    const result = detectSchoolSetBonus('5-3-2', 'attacking', 'instr-press-from-front');
    expect(result.tssDelta).toBe(0);
  });

  it('every shape card has at least one school tag (sanity)', () => {
    for (const c of SHAPE_CARDS) {
      expect(c.schools?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('every tempo card has at least one school tag (sanity)', () => {
    for (const c of TEMPO_CARDS) {
      expect(c.schools?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('looks up shape and tempo cards correctly', () => {
    expect(getShapeCardForFormation('4-3-3').schools).toContain('gegenpress');
    expect(getTempoCardForMentality('attacking').schools).toContain('gegenpress');
    expect(getInstructionCard('instr-press-from-front')?.schools).toContain('gegenpress');
  });
});
