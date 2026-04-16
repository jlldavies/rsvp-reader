import type { RsvpDocument, RsvpToken, Section } from '../models/document.js';
import { chunkTokens } from './chunker.js';

export type EngineState = 'idle' | 'playing' | 'paused' | 'section-break' | 'finished';

export type TokenCallback = (token: RsvpToken, progress: number) => void;
export type StateCallback = (state: EngineState, section?: Section) => void;

export class RsvpEngine {
  private document: RsvpDocument | null = null;
  private chunkedSections: Section[] = [];
  private flatTokens: RsvpToken[] = [];
  private currentIndex = 0;
  private state: EngineState = 'idle';
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private wpm = 300;
  private chunkSize: 1 | 2 | 3 = 1;
  private sectionPauseMode: 'timed' | 'manual' = 'manual';
  private paragraphPauseMode: 'timed' | 'manual' = 'timed';

  private tokenCallbacks: TokenCallback[] = [];
  private stateCallbacks: StateCallback[] = [];

  setWpm(wpm: number): void {
    this.wpm = Math.max(50, Math.min(1500, wpm));
  }

  getWpm(): number {
    return this.wpm;
  }

  setChunkSize(size: 1 | 2 | 3): void {
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) this.pause();

    this.chunkSize = size;
    if (this.document) {
      this.rechunk();
    }

    if (wasPlaying) this.play();
  }

  getChunkSize(): 1 | 2 | 3 {
    return this.chunkSize;
  }

  setSectionPauseMode(mode: 'timed' | 'manual'): void {
    this.sectionPauseMode = mode;
  }

  setParagraphPauseMode(mode: 'timed' | 'manual'): void {
    this.paragraphPauseMode = mode;
  }

  loadDocument(doc: RsvpDocument): void {
    this.stop();
    this.document = doc;
    this.rechunk();
    this.currentIndex = 0;
    this.setState('idle');
  }

  getDocument(): RsvpDocument | null {
    return this.document;
  }

  private rechunk(): void {
    if (!this.document) return;
    this.chunkedSections = chunkTokens(this.document.sections, this.chunkSize);
    this.flatTokens = this.chunkedSections.flatMap((s) => s.tokens);
  }

  seekTo(tokenIndex: number): void {
    this.currentIndex = Math.max(0, Math.min(tokenIndex, this.flatTokens.length - 1));
    if (this.flatTokens.length > 0) {
      this.emitToken();
    }
  }

  play(): void {
    if (this.flatTokens.length === 0) return;
    if (this.state === 'finished') {
      this.currentIndex = 0;
    }
    this.setState('playing');
    this.scheduleNext();
  }

  pause(): void {
    this.clearTimer();
    if (this.state === 'playing') {
      this.setState('paused');
    }
  }

  toggle(): void {
    if (this.state === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  continue(): void {
    if (this.state === 'section-break') {
      if (this.currentIndex >= this.flatTokens.length) {
        this.setState('finished');
        return;
      }
      this.setState('playing');
      this.scheduleNext();
    }
  }

  stop(): void {
    this.clearTimer();
    this.currentIndex = 0;
    this.setState('idle');
  }

  getCurrentPosition(): number {
    return this.currentIndex;
  }

  getState(): EngineState {
    return this.state;
  }

  getTotalTokens(): number {
    return this.flatTokens.length;
  }

  onToken(callback: TokenCallback): () => void {
    this.tokenCallbacks.push(callback);
    return () => {
      this.tokenCallbacks = this.tokenCallbacks.filter((cb) => cb !== callback);
    };
  }

  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((cb) => cb !== callback);
    };
  }

  skipForward(count = 10): void {
    const wasPlaying = this.state === 'playing';
    this.clearTimer();
    this.currentIndex = Math.min(this.currentIndex + count, this.flatTokens.length - 1);
    this.emitToken();
    if (wasPlaying) this.scheduleNext();
  }

  skipBackward(count = 10): void {
    const wasPlaying = this.state === 'playing';
    this.clearTimer();
    this.currentIndex = Math.max(this.currentIndex - count, 0);
    this.emitToken();
    if (wasPlaying) this.scheduleNext();
  }

  private scheduleNext(): void {
    this.clearTimer();
    if (this.currentIndex >= this.flatTokens.length) {
      this.setState('finished');
      return;
    }

    const token = this.flatTokens[this.currentIndex];
    this.emitToken();

    // Calculate delay — scale timing relative to current WPM
    const baseMs = 60000 / this.wpm;
    const ratio = token.displayMs / (60000 / 300); // ratio vs 300 WPM base
    const delay = baseMs * ratio;

    this.timerId = setTimeout(() => {
      if (this.state !== 'playing') return;

      // Check if we need to pause after displaying this token
      if (token.isSectionEnd && this.sectionPauseMode === 'manual') {
        this.currentIndex++;
        const nextSection = this.findCurrentSection();
        this.setState('section-break', nextSection);
        return;
      }

      if (token.isParagraphEnd && this.paragraphPauseMode === 'manual') {
        this.currentIndex++;
        this.setState('section-break');
        return;
      }

      this.currentIndex++;
      this.scheduleNext();
    }, delay);
  }

  private findCurrentSection(): Section | undefined {
    let count = 0;
    for (const section of this.chunkedSections) {
      count += section.tokens.length;
      if (this.currentIndex < count) return section;
    }
    return undefined;
  }

  private emitToken(): void {
    if (this.currentIndex >= this.flatTokens.length) return;
    const token = this.flatTokens[this.currentIndex];
    const progress = (this.currentIndex + 1) / this.flatTokens.length;
    for (const cb of this.tokenCallbacks) {
      cb(token, progress);
    }
  }

  private setState(state: EngineState, section?: Section): void {
    this.state = state;
    for (const cb of this.stateCallbacks) {
      cb(state, section);
    }
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  destroy(): void {
    this.clearTimer();
    this.tokenCallbacks = [];
    this.stateCallbacks = [];
  }
}
