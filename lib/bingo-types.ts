// Type definitions for Bingo Game
export type CategoryType = 'nationalities' | 'trophies' | 'teams' | 'teammates' | 'leagues' | 'coaches';

export interface Category {
  readonly _id: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly slug: string;
}

export interface Player {
  readonly _id: string;
  readonly name: string;
  readonly image?: string;
  readonly categories: readonly Category[];
}

export interface SelectedPlayer {
  readonly playerId: string;
  readonly playerName: string;
  readonly categoryName: string;
  readonly matchCount: number;
  readonly matchingCategories: string[];
  readonly phase: number;
}

export interface BingoGridResponse {
  readonly grid: readonly (readonly Category[])[];
  readonly players: readonly SelectedPlayer[];
}

export type CellStatus = 'default' | 'correct' | 'wrong';

export interface GameError {
  readonly message: string;
  readonly code?: string;
  readonly timestamp: number;
}
