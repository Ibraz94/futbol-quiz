// Bingo Game Configuration
export const GAME_CONFIG = {
  MAX_PLAYERS: 42,
  TIMER_DURATION: 10,
  WRONG_ANSWER_PENALTY: 2,
  CORRECT_ANSWER_PENALTY: 1,
  CELL_RESET_DELAY: 1000,
  WILDCARD_DELAY: 500,
  GRID_SIZE: 4,
  MAX_IMAGE_RETRY_ATTEMPTS: 2,
} as const;

// Logo lookup table for optimized path resolution
export const LOGO_LOOKUP: Record<string, string> = {
  // Tottenham variations
  'tottenham hotspur': 'tottenham-hotspur',
  'tottenham-hotspur': 'tottenham-hotspur',
  'tottenham': 'tottenham-hotspur',
  
  // Country variations
  'portekiz': 'portekiz',
  'çekya': 'cekiya',
  'cekiya': 'cekiya',
  'hırvatistan': 'hirvatistan',
  'hirvatistan': 'hirvatistan',
  'croatia': 'hirvatistan',
  
  // League variations
  'i̇talya serie a': 'i̇talya-serie-a',
  'italya-serie-a': 'i̇talya-serie-a',
  'italya serie a': 'i̇talya-serie-a',
  'italy serie a': 'i̇talya-serie-a',
  'italy-serie-a': 'i̇talya-serie-a',
  
  'i̇ngiltere premier league': 'i̇ngiltere-premier-league',
  'ingiltere-premier-league': 'i̇ngiltere-premier-league',
  'ingiltere premier league': 'i̇ngiltere-premier-league',
  'england premier league': 'i̇ngiltere-premier-league',
  'england-premier-league': 'i̇ngiltere-premier-league',
  
  'avrupa şampiyonası': 'avrupa-şampiyonası',
  'avrupa-şampiyonası': 'avrupa-şampiyonası',
  'avrupa-sampiyonasi': 'avrupa-şampiyonası',
  
  'süper lig': 'süper-lig',
  'süper-lig': 'süper-lig',
  'super-lig': 'süper-lig',
  
  'dünya kupası': 'dünya-kupası',
  'dünya-kupası': 'dünya-kupası',
  'dunya-kupasi': 'dünya-kupası',
  
  'afrika kupası': 'afrika-kupası',
  'afrika-kupası': 'afrika-kupası',
  'afrika-kupasi': 'afrika-kupası',
  
  'uefa şampiyonlar ligi': 'laliga',
  'uefa-şampiyonlar-ligi': 'laliga',
  'uefa-sampiyonlar-ligi': 'laliga',
  'champions league': 'laliga',
  'champions-league': 'laliga',
  
  'i̇spanya laliga': 'i̇spanya-laliga',
  'ispanya-laliga': 'i̇spanya-laliga',
  'spain laliga': 'i̇spanya-laliga',
  'spain-laliga': 'i̇spanya-laliga',
  
  'fildişi sahili': 'fildişi-sahili',
  'fildişi-sahili': 'fildişi-sahili',
  'fildisi-sahili': 'fildişi-sahili',
  'ivory coast': 'fildişi-sahili',
  'ivory-coast': 'fildişi-sahili',
  
  'bayer 04 leverkusen': 'bayer-leverkusen',
  'bayer-04-leverkusen': 'bayer-leverkusen',
  
  'edin visca': 'edin-visca',
  'edin-visca': 'edin-visca',
};
