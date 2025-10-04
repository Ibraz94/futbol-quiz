import { BingoGridResponse } from './bingo-types';

// Simplified global state management
class BingoStateManager {
  private requestInProgress = false;
  private abortController: AbortController | null = null;
  private inFlightPromise: Promise<BingoGridResponse> | null = null;
  private lastResult: BingoGridResponse | null = null;

  // Request management
  startRequest(abortController: AbortController): void {
    this.requestInProgress = true;
    this.abortController = abortController;
  }

  setInFlightPromise(promise: Promise<BingoGridResponse>): void {
    this.inFlightPromise = promise;
  }

  completeRequest(result: BingoGridResponse): void {
    this.requestInProgress = false;
    this.abortController = null;
    this.inFlightPromise = null;
    this.lastResult = result;
  }

  failRequest(): void {
    this.requestInProgress = false;
    this.abortController = null;
    this.inFlightPromise = null;
  }

  // Getters
  get isRequestInProgress(): boolean {
    return this.requestInProgress;
  }

  get hasLastResult(): boolean {
    return this.lastResult !== null;
  }

  get lastSuccessfulResult(): BingoGridResponse | null {
    return this.lastResult;
  }

  get currentInFlightPromise(): Promise<BingoGridResponse> | null {
    return this.inFlightPromise;
  }

  get currentAbortController(): AbortController | null {
    return this.abortController;
  }

  // Cleanup
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.requestInProgress = false;
    this.inFlightPromise = null;
  }

  reset(): void {
    this.abort();
    this.lastResult = null;
  }
}

// Singleton instance
export const bingoState = new BingoStateManager();
