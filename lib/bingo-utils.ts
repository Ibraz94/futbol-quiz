import { LOGO_LOOKUP } from './bingo-config';
import { CellStatus } from './bingo-types';

// Utility functions for Bingo Game
export const createCellKey = (row: number, col: number): string => `${row}-${col}`;

export const isValidCellPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < 4 && col >= 0 && col < 4;
};

export const getCellClass = (status: CellStatus) => {
  switch (status) {
    case 'correct': return 'bg-green-500 text-white';
    case 'wrong': return 'bg-red-500 text-white';
    default: return 'bg-[#23243a] text-white/90 hover:ring-2 hover:ring-[#ffd60066] cursor-pointer';
  }
};

// Optimized logo path function
export const getLogoPath = (slug: string): string | null => {
  // Fast normalization function
  const normalizeSlug = (input: string): string => {
    return input.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[ığüşöçİĞÜŞÖÇ]/g, (match) => {
        const turkishToLatin: Record<string, string> = {
          'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
          'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
        };
        return turkishToLatin[match] || match;
      })
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Fast lookup in pre-computed table
  const normalizedInput = normalizeSlug(slug);
  const directMatch = LOGO_LOOKUP[normalizedInput];
  if (directMatch) {
    return `/bingo_game_logos/${directMatch}.png`;
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(LOGO_LOOKUP)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return `/bingo_game_logos/${value}.png`;
    }
  }

  // Handle Turkish characters
  const hasTurkishChars = /[ığüşöçİĞÜŞÖÇ]/.test(slug);
  if (hasTurkishChars) {
    return `/bingo_game_logos/${normalizedInput}.png`;
  }

  return normalizedInput ? `/bingo_game_logos/${normalizedInput}.png` : null;
};
