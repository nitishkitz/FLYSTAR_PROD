import { describe, expect, it } from 'vitest';
import { footerLinks, navigationLinks, SECTION_IDS, sectionHref } from './navigation';

describe('navigation configuration', () => {
  it('uses unique, stable section ids', () => {
    const ids = navigationLinks.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      SECTION_IDS.story,
      SECTION_IDS.services,
      SECTION_IDS.journey,
      SECTION_IDS.quote,
      SECTION_IDS.tracking,
      SECTION_IDS.contact,
    ]);
  });

  it('includes the rate calculator in footer navigation', () => {
    expect(footerLinks.some((link) => link.id === SECTION_IDS.rates)).toBe(true);
    expect(sectionHref(SECTION_IDS.quote)).toBe('#quote');
  });
});
