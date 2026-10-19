import { describe, expect, it } from 'vitest';
import { classifyHarmony, colorFamily, hueDistance, isNeutral, outfitColorScore, pairScore } from '../src/engine/color-harmony';

describe('color families', () => {
  it('classifies the basics', () => {
    expect(colorFamily('#111111')).toBe('black');
    expect(colorFamily('#F5F3EE')).toBe('white');
    expect(colorFamily('#8A8D91')).toBe('grey');
    expect(colorFamily('#1F2A44')).toBe('navy');
    expect(colorFamily('#B5864F')).toBe('earth');
    expect(colorFamily('#6B6F3C')).toBe('earth'); // olive
    expect(colorFamily('#B3262E')).toBe('red');
    expect(colorFamily('#2F6B3A')).toBe('green');
    expect(isNeutral('#CDB99A')).toBe(true);
    expect(isNeutral('#B3262E')).toBe(false);
  });
  it('measures hue distance around the wheel', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
  });
});

describe('pair scoring', () => {
  it('lets neutrals carry any colour', () => {
    expect(pairScore('#F5F3EE', '#B3262E')).toBeGreaterThanOrEqual(0.9);
    expect(pairScore('#1F2A44', '#D1A12E')).toBeGreaterThanOrEqual(0.9);
  });
  it('flags the black + navy near-clash', () => {
    expect(pairScore('#111111', '#1F2A44')).toBeLessThan(0.7);
    expect(pairScore('#1F2A44', '#CDB99A')).toBeGreaterThan(0.95);
  });
  it('scores tonal and analogous above clashing hues', () => {
    const tonal = pairScore('#B3262E', '#E08FA3');
    const clash = pairScore('#B3262E', '#2A7F4F');
    expect(tonal).toBeGreaterThan(0.8);
    expect(clash).toBeLessThan(tonal);
  });
});

describe('outfit colour score', () => {
  const c = (hex: string, weight = 1) => ({ hex, weight });
  it('rewards a neutral base with a single accent', () => {
    const accent = outfitColorScore([c('#F5F3EE'), c('#1F2A44'), c('#6F2638'), c('#CDB99A')]);
    const chaos = outfitColorScore([c('#B3262E'), c('#2A7F4F'), c('#D1A12E'), c('#5E3F7E')]);
    expect(accent).toBeGreaterThan(chaos + 0.2);
  });
  it('labels palettes', () => {
    expect(classifyHarmony(['#111111', '#F5F3EE', '#8A8D91'])).toBe('Neutral base');
    expect(classifyHarmony(['#111111', '#F5F3EE', '#B3262E'])).toBe('Neutral with an accent');
  });
});
