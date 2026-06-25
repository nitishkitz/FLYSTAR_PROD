export const SECTION_IDS = {
  story: 'story',
  services: 'services',
  journey: 'journey',
  quote: 'quote',
  tracking: 'tracking',
  rates: 'rates',
  contact: 'contact',
};

export const navigationLinks = [
  { label: 'Story', id: SECTION_IDS.story },
  { label: 'Services', id: SECTION_IDS.services },
  { label: 'Journey', id: SECTION_IDS.journey },
  { label: 'Quote', id: SECTION_IDS.quote },
  { label: 'Track', id: SECTION_IDS.tracking },
  { label: 'Contact', id: SECTION_IDS.contact },
];

export const footerLinks = [
  ...navigationLinks,
  { label: 'Rate calculator', id: SECTION_IDS.rates },
];

export const sectionHref = (id) => `#${id}`;
