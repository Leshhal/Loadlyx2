const RULES = [
  {
    keywords: ['mattress', 'bed', 'queen', 'king'],
    suggestions: ['mattress-cover-kit']
  },
  {
    keywords: ['kitchen', 'plates', 'dishes', 'glassware'],
    suggestions: ['medium-moving-box-10-pack', 'packing-tape-bundle']
  },
  {
    keywords: ['books', 'office', 'files'],
    suggestions: ['small-moving-box-10-pack', 'packing-tape-bundle']
  },
  {
    keywords: ['sofa', 'sectional', 'couch', 'furniture'],
    suggestions: ['packing-tape-bundle']
  }
];

const MOVE_KITS = {
  studio: {
    id: 'studio-kit',
    name: 'Studio Move Kit',
    description: 'Starter packing kit for a studio or very small move.',
    productSlugs: [
      { slug: 'small-moving-box-10-pack', quantity: 1 },
      { slug: 'packing-tape-bundle', quantity: 1 }
    ]
  },
  oneBedroom: {
    id: 'one-bedroom-kit',
    name: '1 Bedroom Move Kit',
    description: 'Balanced box and tape bundle for a typical 1 bedroom move.',
    productSlugs: [
      { slug: 'small-moving-box-10-pack', quantity: 1 },
      { slug: 'medium-moving-box-10-pack', quantity: 1 },
      { slug: 'packing-tape-bundle', quantity: 1 }
    ]
  },
  family: {
    id: 'family-kit',
    name: '2+ Bedroom Move Kit',
    description: 'Recommended for larger family moves with more furniture and kitchen items.',
    productSlugs: [
      { slug: 'small-moving-box-10-pack', quantity: 2 },
      { slug: 'medium-moving-box-10-pack', quantity: 2 },
      { slug: 'packing-tape-bundle', quantity: 2 },
      { slug: 'mattress-cover-kit', quantity: 1 }
    ]
  }
};

export function parseQuoteComment(comment = '') {
  const text = comment.toLowerCase();
  const matchedRules = RULES.filter((rule) => rule.keywords.some((kw) => text.includes(kw)));
  const uniqueSuggestions = [...new Set(matchedRules.flatMap((rule) => rule.suggestions))];

  const rooms = [];
  if (text.includes('kitchen')) rooms.push('kitchen');
  if (text.includes('bedroom')) rooms.push('bedroom');
  if (text.includes('living room')) rooms.push('living_room');
  if (text.includes('office')) rooms.push('office');

  const bedroomMatch = text.match(/(\d+)\s*(bed(room)?|br)/);
  const bedrooms = bedroomMatch ? Number(bedroomMatch[1]) : null;
  let kit = MOVE_KITS.studio;
  if (bedrooms && bedrooms >= 2) kit = MOVE_KITS.family;
  else if (bedrooms === 1) kit = MOVE_KITS.oneBedroom;
  else if (matchedRules.length >= 3) kit = MOVE_KITS.family;
  else if (matchedRules.length >= 1) kit = MOVE_KITS.oneBedroom;

  return {
    rawComment: comment,
    rooms,
    keywordsDetected: matchedRules.flatMap((rule) => rule.keywords.filter((kw) => text.includes(kw))),
    recommendedProductSlugs: uniqueSuggestions,
    suggestedKit: kit,
    aiReady: {
      extractedItemTypes: uniqueSuggestions,
      normalizedText: text,
      bedroomsDetected: bedrooms,
      futureModelSlot: 'phase2_quote_parser_model'
    }
  };
}
