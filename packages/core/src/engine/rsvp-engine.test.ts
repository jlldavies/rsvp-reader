import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RsvpEngine } from './rsvp-engine.js';
import { tokenizePlainText, tokenizeSections } from './tokenizer.js';
import type { RsvpDocument } from '../models/document.js';

function makeDoc(text: string): RsvpDocument {
  const sections = tokenizePlainText(text);
  return {
    id: 'test-doc',
    title: 'Test',
    source: { type: 'text', uri: 'test' },
    sections,
    totalWords: sections.reduce((s, sec) => s + sec.tokens.length, 0),
    createdAt: Date.now(),
  };
}

describe('RsvpEngine — initial state', () => {
  it('starts in idle state', () => {
    const engine = new RsvpEngine();
    expect(engine.getState()).toBe('idle');
  });

  it('has no document initially', () => {
    const engine = new RsvpEngine();
    expect(engine.getDocument()).toBeNull();
  });

  it('reports zero total tokens with no document', () => {
    const engine = new RsvpEngine();
    expect(engine.getTotalTokens()).toBe(0);
  });
});

describe('RsvpEngine — loadDocument', () => {
  it('transitions state to idle after loading', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    expect(engine.getState()).toBe('idle');
  });

  it('reports correct token count after loading', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three'));
    expect(engine.getTotalTokens()).toBe(3);
  });

  it('resets position to 0 when new document loaded', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three'));
    engine.seekTo(2);
    engine.loadDocument(makeDoc('a b c'));
    expect(engine.getCurrentPosition()).toBe(0);
  });
});

describe('RsvpEngine — play/pause/toggle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('transitions to playing state when play() called', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    engine.play();
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });

  it('transitions to paused state when pause() called while playing', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    engine.play();
    engine.pause();
    expect(engine.getState()).toBe('paused');
    engine.destroy();
  });

  it('toggle starts playback from idle', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    engine.toggle();
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });

  it('toggle pauses when playing', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    engine.play();
    engine.toggle();
    expect(engine.getState()).toBe('paused');
    engine.destroy();
  });

  it('toggle resumes from paused', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('hello world'));
    engine.play();
    engine.pause();
    engine.toggle();
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });

  it('emits tokens as words advance', () => {
    const engine = new RsvpEngine();
    engine.setWpm(300); // 200ms base
    engine.loadDocument(makeDoc('one two three'));
    const seen: string[] = [];
    engine.onToken((token) => seen.push(token.text));
    engine.play();
    // Advance past first word delay
    vi.advanceTimersByTime(250);
    expect(seen.length).toBeGreaterThanOrEqual(1);
    engine.destroy();
  });

  it('emits progress between 0 and 1', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three'));
    const progresses: number[] = [];
    engine.onToken((_, progress) => progresses.push(progress));
    engine.play();
    vi.advanceTimersByTime(1000);
    for (const p of progresses) {
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    engine.destroy();
  });
});

describe('RsvpEngine — section-break mode', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('enters section-break state at section boundary in manual mode', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('manual');
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['one'] },
      { heading: null, paragraphs: ['two'] },
    ]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 2, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    engine.play();
    vi.advanceTimersByTime(500);
    expect(engine.getState()).toBe('section-break');
    engine.destroy();
  });

  it('continues playback after continue() called from section-break', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('manual');
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['one'] },
      { heading: null, paragraphs: ['two'] },
    ]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 2, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    engine.play();
    vi.advanceTimersByTime(500);
    engine.continue();
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });
});

describe('RsvpEngine — finished state', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('transitions to finished after all tokens played', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.setWpm(6000); // Very fast — 10ms per word
    engine.loadDocument(makeDoc('a b'));
    engine.play();
    vi.advanceTimersByTime(500);
    expect(engine.getState()).toBe('finished');
    engine.destroy();
  });
});

describe('RsvpEngine — seek and skip', () => {
  it('seekTo sets current position', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three four'));
    engine.seekTo(2);
    expect(engine.getCurrentPosition()).toBe(2);
  });

  it('seekTo clamps to valid range', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two'));
    engine.seekTo(100);
    expect(engine.getCurrentPosition()).toBe(1); // last valid index
  });

  it('seekTo 0 clamps correctly', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two'));
    engine.seekTo(-5);
    expect(engine.getCurrentPosition()).toBe(0);
  });

  it('skipForward advances by 10 tokens', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b c d e f g h i j k l'));
    engine.seekTo(0);
    engine.skipForward(10);
    expect(engine.getCurrentPosition()).toBe(10);
  });

  it('skipBackward moves back by 10 tokens', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b c d e f g h i j k l'));
    engine.seekTo(11);
    engine.skipBackward(10);
    expect(engine.getCurrentPosition()).toBe(1);
  });
});

describe('RsvpEngine — settings', () => {
  it('clamps WPM to minimum of 50', () => {
    const engine = new RsvpEngine();
    engine.setWpm(0);
    expect(engine.getWpm()).toBe(50);
  });

  it('clamps WPM to maximum of 1500', () => {
    const engine = new RsvpEngine();
    engine.setWpm(9999);
    expect(engine.getWpm()).toBe(1500);
  });

  it('getChunkSize returns current chunk size', () => {
    const engine = new RsvpEngine();
    engine.setChunkSize(3);
    expect(engine.getChunkSize()).toBe(3);
  });
});

describe('RsvpEngine — onToken unsubscribe', () => {
  it('stops emitting after callback is unsubscribed', () => {
    vi.useFakeTimers();
    const engine = new RsvpEngine();
    engine.setWpm(6000);
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('a b c'));
    const seen: string[] = [];
    const unsub = engine.onToken((t) => seen.push(t.text));
    engine.play();
    vi.advanceTimersByTime(50);
    unsub();
    const countAfterUnsub = seen.length;
    vi.advanceTimersByTime(500);
    expect(seen.length).toBe(countAfterUnsub);
    engine.destroy();
    vi.useRealTimers();
  });
});

describe('RsvpEngine — onStateChange unsubscribe', () => {
  it('stops receiving state events after unsubscribe', () => {
    vi.useFakeTimers();
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('a b'));
    const states: string[] = [];
    const unsub = engine.onStateChange((s) => states.push(s));
    engine.play();
    unsub();
    const countAfterUnsub = states.length;
    vi.advanceTimersByTime(1000);
    expect(states.length).toBe(countAfterUnsub);
    engine.destroy();
    vi.useRealTimers();
  });

  it('receives section object when entering section-break', () => {
    vi.useFakeTimers();
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('manual');
    const sections = tokenizeSections([
      { heading: 'Intro', paragraphs: ['one'] },
      { heading: 'Body', paragraphs: ['two'] },
    ]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 2, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    let receivedSection: unknown = undefined;
    engine.onStateChange((state, section) => {
      if (state === 'section-break') receivedSection = section;
    });
    engine.play();
    vi.advanceTimersByTime(500);
    expect(receivedSection).toBeDefined();
    engine.destroy();
    vi.useRealTimers();
  });
});

describe('RsvpEngine — paragraph manual pause', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('enters section-break at paragraph boundary in manual paragraph mode', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('manual');
    // One section with two paragraphs
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['hello', 'world'] },
    ]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 2, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    engine.play();
    vi.advanceTimersByTime(500);
    expect(engine.getState()).toBe('section-break');
    engine.destroy();
  });

  it('continues from paragraph-triggered section-break', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('manual');
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['hello', 'world'] },
    ]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 2, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    engine.play();
    vi.advanceTimersByTime(500);
    engine.continue();
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });
});

describe('RsvpEngine — continue() at end of document', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('enters finished when continue() called at last token', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('manual');
    // Single-token document — after playing the only token, section-break fires
    // with currentIndex past the end
    const sections = tokenizeSections([{ heading: null, paragraphs: ['done'] }]);
    const doc: RsvpDocument = {
      id: 'x', title: 'x', source: { type: 'text', uri: 'x' },
      sections, totalWords: 1, createdAt: Date.now(),
    };
    engine.loadDocument(doc);
    engine.play();
    vi.advanceTimersByTime(500);
    // Should have finished (single-token single-section with manual section mode)
    // or be in section-break — either way, continue() should resolve to finished
    if (engine.getState() === 'section-break') {
      engine.continue();
    }
    expect(engine.getState()).toBe('finished');
    engine.destroy();
  });
});

describe('RsvpEngine — play() with no document', () => {
  it('does nothing when play() called without a document', () => {
    const engine = new RsvpEngine();
    engine.play(); // should not throw
    expect(engine.getState()).toBe('idle');
    engine.destroy();
  });
});

describe('RsvpEngine — setChunkSize while playing', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resumes playback after chunk size changed while playing', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('one two three four five six'));
    engine.play();
    expect(engine.getState()).toBe('playing');
    engine.setChunkSize(2);
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });

  it('re-chunks document when chunk size changed', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three four'));
    engine.setChunkSize(2);
    // With chunk size 2, 4 words → 2 tokens
    expect(engine.getTotalTokens()).toBe(2);
    engine.destroy();
  });

  it('does not resume if was paused before chunk size change', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('one two three four'));
    engine.play();
    engine.pause();
    engine.setChunkSize(2);
    expect(engine.getState()).toBe('paused');
    engine.destroy();
  });
});

describe('RsvpEngine — skip while playing', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('skipForward while playing resumes playback after skip', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('a b c d e f g h i j k l'));
    engine.play();
    engine.skipForward(5);
    expect(engine.getState()).toBe('playing');
    expect(engine.getCurrentPosition()).toBe(5);
    engine.destroy();
  });

  it('skipBackward while playing resumes playback after skip', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('a b c d e f g h i j k l'));
    engine.play();
    engine.skipForward(8);
    engine.skipBackward(5);
    expect(engine.getState()).toBe('playing');
    expect(engine.getCurrentPosition()).toBe(3);
    engine.destroy();
  });

  it('skipForward clamps at end of document', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b c'));
    engine.seekTo(0);
    engine.skipForward(100);
    expect(engine.getCurrentPosition()).toBe(2); // last valid index
    engine.destroy();
  });

  it('skipBackward clamps at start of document', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b c'));
    engine.seekTo(1);
    engine.skipBackward(100);
    expect(engine.getCurrentPosition()).toBe(0);
    engine.destroy();
  });
});

describe('RsvpEngine — play from finished restarts', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('play() after finished restarts from beginning', () => {
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.setWpm(6000);
    engine.loadDocument(makeDoc('a b'));
    engine.play();
    vi.advanceTimersByTime(500);
    expect(engine.getState()).toBe('finished');
    engine.play();
    expect(engine.getCurrentPosition()).toBe(0);
    expect(engine.getState()).toBe('playing');
    engine.destroy();
  });
});

describe('RsvpEngine — guard clauses', () => {
  it('pause() while already paused does not change state', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b'));
    engine.play();
    engine.pause();
    engine.pause(); // second pause — should be no-op
    expect(engine.getState()).toBe('paused');
    engine.destroy();
  });

  it('pause() while idle does not change state', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b'));
    engine.pause(); // never started
    expect(engine.getState()).toBe('idle');
    engine.destroy();
  });

  it('continue() while playing does nothing', () => {
    vi.useFakeTimers();
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.loadDocument(makeDoc('a b c'));
    engine.play();
    engine.continue(); // not in section-break
    expect(engine.getState()).toBe('playing');
    engine.destroy();
    vi.useRealTimers();
  });

  it('continue() while idle does nothing', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('a b'));
    engine.continue(); // idle state
    expect(engine.getState()).toBe('idle');
    engine.destroy();
  });

  it('stop() resets to idle from any state', () => {
    vi.useFakeTimers();
    const engine = new RsvpEngine();
    engine.setSectionPauseMode('timed');
    engine.setParagraphPauseMode('timed');
    engine.loadDocument(makeDoc('a b c'));
    engine.play();
    engine.stop();
    expect(engine.getState()).toBe('idle');
    expect(engine.getCurrentPosition()).toBe(0);
    engine.destroy();
    vi.useRealTimers();
  });

  it('setChunkSize without a loaded document does not throw', () => {
    const engine = new RsvpEngine();
    expect(() => engine.setChunkSize(2)).not.toThrow();
    engine.destroy();
  });
});

describe('RsvpEngine — seekTo emits token immediately', () => {
  it('emits the token at the seeked position immediately', () => {
    const engine = new RsvpEngine();
    engine.loadDocument(makeDoc('alpha beta gamma delta'));
    const seen: string[] = [];
    engine.onToken((t) => seen.push(t.text));
    engine.seekTo(2);
    expect(seen).toContain('gamma');
    engine.destroy();
  });

  it('seekTo on empty document does not throw', () => {
    const engine = new RsvpEngine();
    expect(() => engine.seekTo(5)).not.toThrow();
    engine.destroy();
  });
});
