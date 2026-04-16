export interface ReaderSettings {
  wpm: number;
  chunkSize: 1 | 2 | 3;
  orpColor: string;
  prefixColor: string;
  suffixColor: string;
  backgroundColor: string;
  sectionPauseMode: 'timed' | 'manual';
  paragraphPauseMode: 'timed' | 'manual';
  theme: 'light' | 'dark' | 'system';
  punctuationPauseMultiplier: number;
  longWordPauseMultiplier: number;
  font: string;
  fontSize: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  chunkSize: 1,
  orpColor: '#ff2c2c',
  prefixColor: '#333333',
  suffixColor: '#333333',
  backgroundColor: '#fafafa',
  sectionPauseMode: 'manual',
  paragraphPauseMode: 'timed',
  theme: 'system',
  punctuationPauseMultiplier: 1.5,
  longWordPauseMultiplier: 1.2,
  font: "'IBM Plex Mono', 'Roboto Mono', Courier, monospace",
  fontSize: 56,
};
