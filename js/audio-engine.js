/**
 * Deep Focus Studio - Audio Engine
 * Synthesized focus audio using Tone.js 14.8.49
 * All gain changes use ramps to prevent crackling.
 * @module AudioEngine
 */

const RAMP = 0.05;
const STOP_RAMP = 0.1;

/** Chord definitions as MIDI note arrays */
const CHORDS = {
  Cmaj7: ['C3', 'E3', 'G3', 'B3'],
  Am7: ['A2', 'C3', 'E3', 'G3'],
  Fmaj7: ['F2', 'A2', 'C3', 'E3'],
  G7: ['G2', 'B2', 'D3', 'F3'],
  Dm7: ['D3', 'F3', 'A3', 'C4'],
  Em7: ['E3', 'G3', 'B3', 'D4'],
  Am: ['A2', 'C3', 'E3'],
  Fm: ['F2', 'Ab2', 'C3'],
  Dm: ['D3', 'F3', 'A3'],
  Em: ['E3', 'G3', 'B3'],
  C: ['C3', 'E3', 'G3'],
  G: ['G2', 'B2', 'D3'],
  D: ['D3', 'F#3', 'A3'],
  Dm9: ['D3', 'F3', 'A3', 'C4', 'E4'],
  G13: ['G2', 'B2', 'D3', 'F3', 'E3'],
  Cmaj9: ['C3', 'E3', 'G3', 'B3', 'D4'],
  A7b9: ['A2', 'C#3', 'E3', 'G3', 'Bb3'],
  Cm: ['C3', 'Eb3', 'G3'],
  Gm: ['G2', 'Bb2', 'D3'],
  Bb: ['Bb2', 'D3', 'F3'],
  Fm7: ['F2', 'Ab2', 'C3', 'Eb3'],
  Bbmaj7: ['Bb2', 'D3', 'F3', 'A3'],
  Ebmaj7: ['Eb3', 'G3', 'Bb3', 'D4'],
  Cm9: ['C3', 'Eb3', 'G3', 'Bb3', 'D4'],
  Fsus4: ['F2', 'Bb2', 'C3'],
  Gsus2: ['G2', 'A2', 'D3'],
};

const MUSIC_PRESETS = {
  minimal: {
    name: 'Minimal Techno',
    bpm: 128,
    chords: ['Am', 'Am', 'Em', 'Em'],
    padOsc: 'sine', padAttack: 2, padDecay: 2, padSustain: 0.3, padRelease: 3,
    arpOsc: 'sine', arpOctave: 5, arpPattern: 'up',
    bassOsc: 'sine', bassFilterFreq: 400, bassFilterQ: 1,
    kickDecay: 0.3, kickOctaves: 6, kickPitchDecay: 0.05,
    hatStyle: '16ths', hatDecay: 0.04,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    effects: { padReverb: 3, padDelay: '8n.', padDelayFeedback: 0.4, arpDelay: '16n', arpDelayFeedback: 0.3 },
    bassPattern: [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
  },
  detroit: {
    name: 'Detroit Techno',
    bpm: 132,
    chords: ['Am7', 'Dm7', 'Fmaj7', 'Em7'],
    padOsc: 'sawtooth', padAttack: 0.8, padDecay: 1.5, padSustain: 0.6, padRelease: 2,
    arpOsc: 'sawtooth', arpOctave: 4, arpPattern: 'up-down',
    bassOsc: 'sawtooth', bassFilterFreq: 800, bassFilterQ: 2,
    kickDecay: 0.4, kickOctaves: 6, kickPitchDecay: 0.05,
    hatStyle: 'offbeat-8ths', hatDecay: 0.06,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    effects: { padReverb: 4, padDelay: '4n', padDelayFeedback: 0.3, arpDelay: '8n', arpDelayFeedback: 0.25 },
    bassPattern: [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0],
  },
  acid: {
    name: 'Acid Techno',
    bpm: 136,
    chords: ['Am', 'Am', 'Am', 'Am'],
    padOsc: 'sawtooth', padAttack: 0.01, padDecay: 0.3, padSustain: 0.1, padRelease: 0.5,
    arpOsc: 'sawtooth', arpOctave: 3, arpPattern: 'random',
    bassOsc: 'sawtooth', bassFilterFreq: 300, bassFilterQ: 12,
    kickDecay: 0.3, kickOctaves: 6, kickPitchDecay: 0.04,
    hatStyle: '16ths', hatDecay: 0.03,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    acid303: true,
    effects: { padReverb: 1, padDelay: '16n', padDelayFeedback: 0.2, arpDelay: '8n', arpDelayFeedback: 0.15 },
    bassPattern: [1,0,1,1, 0,1,1,0, 1,1,0,1, 0,1,0,1],
  },
  dubtechno: {
    name: 'Dub Techno',
    bpm: 124,
    chords: ['Cm', 'Gm', 'Cm', 'Gm'],
    padOsc: 'sawtooth', padAttack: 1.5, padDecay: 2, padSustain: 0.5, padRelease: 4,
    arpOsc: 'triangle', arpOctave: 4, arpPattern: 'up',
    bassOsc: 'sine', bassFilterFreq: 300, bassFilterQ: 1,
    kickDecay: 0.6, kickOctaves: 4, kickPitchDecay: 0.08,
    hatStyle: 'sparse', hatDecay: 0.08,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    effects: { padReverb: 8, padDelay: '4n.', padDelayFeedback: 0.65, arpDelay: '8n.', arpDelayFeedback: 0.5 },
    bassPattern: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
  trance: {
    name: 'Trance',
    bpm: 140,
    chords: ['Am', 'Fmaj7', 'C', 'G'],
    padOsc: 'sawtooth', padAttack: 0.5, padDecay: 1, padSustain: 0.8, padRelease: 2,
    arpOsc: 'sawtooth', arpOctave: 5, arpPattern: 'up',
    bassOsc: 'sawtooth', bassFilterFreq: 600, bassFilterQ: 3,
    kickDecay: 0.35, kickOctaves: 5, kickPitchDecay: 0.04,
    hatStyle: 'offbeat-8ths', hatDecay: 0.05,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    supersaw: true,
    effects: { padReverb: 5, padDelay: '8n', padDelayFeedback: 0.3, arpDelay: '16n', arpDelayFeedback: 0.35 },
    bassPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  dnb: {
    name: 'Drum & Bass',
    bpm: 174,
    chords: ['Cm9', 'Fm7', 'Bbmaj7', 'Ebmaj7'],
    padOsc: 'triangle', padAttack: 1, padDecay: 2, padSustain: 0.6, padRelease: 3,
    arpOsc: 'triangle', arpOctave: 5, arpPattern: 'up-down',
    bassOsc: 'sine', bassFilterFreq: 500, bassFilterQ: 2,
    kickDecay: 0.15, kickOctaves: 8, kickPitchDecay: 0.03,
    hatStyle: 'breakbeat', hatDecay: 0.04,
    beatPattern: 'breakbeat',
    snareOn: [4, 12],
    swing: 0.1,
    effects: { padReverb: 4, padDelay: '4n', padDelayFeedback: 0.3, arpDelay: '8n', arpDelayFeedback: 0.2 },
    bassPattern: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
  },
  deephouse: {
    name: 'Deep House',
    bpm: 122,
    chords: ['Dm9', 'G13', 'Cmaj9', 'Am7'],
    padOsc: 'triangle', padAttack: 0.5, padDecay: 1, padSustain: 0.7, padRelease: 2,
    arpOsc: 'sine', arpOctave: 4, arpPattern: 'up',
    bassOsc: 'sine', bassFilterFreq: 600, bassFilterQ: 1,
    kickDecay: 0.6, kickOctaves: 4, kickPitchDecay: 0.08,
    hatStyle: 'offbeat-8ths', hatDecay: 0.06,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0.15,
    effects: { padReverb: 3, padDelay: '8n.', padDelayFeedback: 0.25, arpDelay: '16n', arpDelayFeedback: 0.2 },
    bassPattern: [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,1,0],
    walkingBass: true,
  },
  progressive: {
    name: 'Progressive House',
    bpm: 128,
    chords: ['Em7', 'Cmaj7', 'G', 'D'],
    padOsc: 'sawtooth', padAttack: 2, padDecay: 3, padSustain: 0.4, padRelease: 4,
    arpOsc: 'sawtooth', arpOctave: 4, arpPattern: 'up',
    bassOsc: 'sawtooth', bassFilterFreq: 500, bassFilterQ: 3,
    kickDecay: 0.4, kickOctaves: 5, kickPitchDecay: 0.05,
    hatStyle: '16ths', hatDecay: 0.04,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    effects: { padReverb: 5, padDelay: '4n', padDelayFeedback: 0.35, arpDelay: '8n.', arpDelayFeedback: 0.3 },
    bassPattern: [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,1,0,0],
  },
  ambienttechno: {
    name: 'Ambient Techno',
    bpm: 110,
    chords: ['Fsus4', 'Gsus2', 'Am7', 'Fsus4'],
    padOsc: 'sine', padAttack: 3, padDecay: 4, padSustain: 0.5, padRelease: 5,
    arpOsc: 'sine', arpOctave: 5, arpPattern: 'random',
    bassOsc: 'sine', bassFilterFreq: 300, bassFilterQ: 1,
    kickDecay: 0.5, kickOctaves: 3, kickPitchDecay: 0.1,
    hatStyle: 'sparse', hatDecay: 0.1,
    beatPattern: 'half-time',
    snareOn: [8],
    swing: 0,
    effects: { padReverb: 10, padDelay: '4n.', padDelayFeedback: 0.6, arpDelay: '4n', arpDelayFeedback: 0.5 },
    bassPattern: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  hardtechno: {
    name: 'Hard Techno',
    bpm: 145,
    chords: ['Am', 'Am', 'Em', 'Em'],
    padOsc: 'square', padAttack: 0.01, padDecay: 0.2, padSustain: 0.3, padRelease: 0.3,
    arpOsc: 'square', arpOctave: 4, arpPattern: 'down',
    bassOsc: 'square', bassFilterFreq: 1200, bassFilterQ: 4,
    kickDecay: 0.2, kickOctaves: 8, kickPitchDecay: 0.03,
    hatStyle: '16ths', hatDecay: 0.02,
    beatPattern: 'four-on-floor',
    snareOn: [4, 12],
    swing: 0,
    distorted: true,
    effects: { padReverb: 2, padDelay: '16n', padDelayFeedback: 0.15, arpDelay: '8n', arpDelayFeedback: 0.2 },
    bassPattern: [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1],
  },
};

/** All note names for transposition */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONIC = { 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' };

/** Transpose a single note string like "C#3" by semitones */
function transposeNote(note, semitones) {
  if (!semitones) return note;
  const match = note.match(/^([A-G][b#]?)(\d+)$/);
  if (!match) return note;
  let noteName = match[1];
  let octave = parseInt(match[2]);
  if (ENHARMONIC[noteName]) noteName = ENHARMONIC[noteName];
  let idx = NOTE_NAMES.indexOf(noteName);
  if (idx === -1) return note;
  idx += semitones;
  while (idx < 0) { idx += 12; octave--; }
  while (idx >= 12) { idx -= 12; octave++; }
  return NOTE_NAMES[idx] + octave;
}

/** Transpose an array of note strings */
function transposeNotes(notes, semitones) {
  if (!semitones || !notes) return notes;
  return notes.map(n => transposeNote(n, semitones));
}

/** Chord progression templates (relative to key) — returns chord names */
const PROGRESSION_TEMPLATES = {
  'i-iv-v-i':       ['Am', 'Dm', 'Em', 'Am'],       // dark minor
  'I-V-vi-IV':      ['C', 'G', 'Am', 'Fmaj7'],      // pop
  'ii-V-I':         ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], // jazz
  'i-VI-III-VII':   ['Am', 'Fmaj7', 'C', 'G'],       // euphoric
  'i-i-i-i':        ['Am', 'Am', 'Am', 'Am'],         // hypnotic
};

class AudioEngine {
  constructor() {
    /** @type {boolean} */
    this.initialized = false;
    /** @type {boolean} */
    this.playing = false;
    this.analyser = null;

    // Section enabled flags
    this._binauralEnabled = false;
    this._noiseEnabled = false;
    this._droneEnabled = false;
    this._natureEnabled = false;
    this._musicEnabled = false;

    // Parameters
    this._binauralFreq = 10;
    this._binauralBaseFreq = 200;
    this._binauralVolume = 0.5;
    this._brownVol = 0;
    this._pinkVol = 0;
    this._whiteVol = 0;
    this._droneVolume = 0.3;
    this._natureType = 'rain';
    this._natureVolume = 0.5;
    this._musicPreset = 'minimal';
    this._arpVolume = 0.3;
    this._padVolume = 0.4;
    this._beatVolume = 0.3;
    this._masterVolume = 0.7;
    this._swing = 0;
    this._bassFilterCutoff = 400;
    this._bassFilterQ = 1;

    // Sound design parameters
    this._reverbMix = 0.5;       // 0-1, reverb wet amount
    this._delayMix = 0.4;        // 0-1, delay feedback amount
    this._density = 0.7;         // 0-1, note trigger probability multiplier
    this._padAttack = 0.5;       // 0-1, pad envelope attack (maps to 0.01-5s)
    this._arpPattern = 'up';     // up, down, up-down, random

    // Key & progression
    this._keyTranspose = 0;       // semitones from C (0-11)
    this._progressionType = 'default'; // which chord progression to use

    // Melody
    this._melodyEnabled = false;
    this._melodyVolume = 0.4;
    this._melodyStyle = 'generative'; // generative, call-response, ambient

    // Audio nodes (created in init)
    this._nodes = {};
    this._loops = [];
    this._scheduleIds = [];
  }

  // ───────── INIT ─────────

  /** Initialize the Tone.js audio context and build the signal graph. */
  async init() {
    if (this.initialized) return;

    // Use larger audio buffers for stable playback (ambient music doesn't need low latency)
    if (Tone.context.state !== 'running') {
      const ctx = new Tone.Context({ latencyHint: 'playback' });
      Tone.setContext(ctx);
    }
    await Tone.start();

    // Analysers
    this.fft = new Tone.FFT(64);
    this.waveform = new Tone.Waveform(256);

    // Limiter on master to prevent clipping
    this._limiter = new Tone.Limiter(-3).toDestination();

    // Master gain
    this._masterGain = new Tone.Gain(0).connect(this._limiter);
    this._masterGain.connect(this.fft);
    this._masterGain.connect(this.waveform);
    this._masterGain.gain.rampTo(this._masterVolume, RAMP);

    this._buildBinaural();
    this._buildNoise();
    this._buildDrone();
    this._buildNature();
    this._buildMusic();
    this._buildTrackPlayer();

    this.initialized = true;
  }

  // ───────── START / STOP ─────────

  /** Start all enabled audio sections. */
  start() {
    if (!this.initialized || this.playing) return;
    this.playing = true;
    Tone.Transport.start();
    if (this._binauralEnabled) this._startBinaural();
    if (this._noiseEnabled) this._startNoise();
    if (this._droneEnabled) this._startDrone();
    if (this._natureEnabled) this._startNature();
    if (this._musicEnabled) this._startMusic();
    this._masterGain.gain.rampTo(this._masterVolume, RAMP);
  }

  /** Ramp down then stop all audio sources. */
  async stop() {
    if (!this.initialized || !this.playing) return;
    this._masterGain.gain.rampTo(0, STOP_RAMP);
    await new Promise(r => setTimeout(r, 150));
    this.playing = false;
    Tone.Transport.stop();
    this._stopBinaural();
    this._stopNoise();
    this._stopDrone();
    this._stopNature();
    this._stopMusic();
  }

  // ───────── BINAURAL ─────────

  _buildBinaural() {
    const n = this._nodes;
    n.binGainL = new Tone.Gain(0).connect(this._masterGain);
    n.binGainR = new Tone.Gain(0).connect(this._masterGain);
    n.binPanL = new Tone.Panner(-1).connect(n.binGainL);
    n.binPanR = new Tone.Panner(1).connect(n.binGainR);
    n.binOscL = new Tone.Oscillator(this._binauralBaseFreq, 'sine').connect(n.binPanL);
    n.binOscR = new Tone.Oscillator(this._binauralBaseFreq + this._binauralFreq, 'sine').connect(n.binPanR);
  }

  _startBinaural() {
    const n = this._nodes;
    // Dispose and recreate oscillators so they can be toggled on/off repeatedly
    try { n.binOscL.stop(); n.binOscL.dispose(); } catch (_) {}
    try { n.binOscR.stop(); n.binOscR.dispose(); } catch (_) {}
    n.binOscL = new Tone.Oscillator(this._binauralBaseFreq, 'sine').connect(n.binPanL);
    n.binOscR = new Tone.Oscillator(this._binauralBaseFreq + this._binauralFreq, 'sine').connect(n.binPanR);
    n.binOscL.start();
    n.binOscR.start();
    n.binGainL.gain.rampTo(this._binauralVolume, RAMP);
    n.binGainR.gain.rampTo(this._binauralVolume, RAMP);
  }

  _stopBinaural() {
    const n = this._nodes;
    n.binGainL.gain.rampTo(0, RAMP);
    n.binGainR.gain.rampTo(0, RAMP);
    try { n.binOscL.stop(); } catch (_) {}
    try { n.binOscR.stop(); } catch (_) {}
  }

  /** @param {boolean} enabled */
  setBinauralEnabled(enabled) {
    this._binauralEnabled = enabled;
    if (!this.playing) return;
    enabled ? this._startBinaural() : this._stopBinaural();
  }

  /** @param {number} hz Beat frequency in Hz */
  setBinauralFrequency(hz) {
    this._binauralFreq = hz;
    if (this._nodes.binOscR) {
      this._nodes.binOscR.frequency.rampTo(this._binauralBaseFreq + hz, RAMP);
    }
  }

  /** @param {number} v 0-1 */
  setBinauralVolume(v) {
    this._binauralVolume = v;
    if (this._binauralEnabled && this.playing) {
      this._nodes.binGainL.gain.rampTo(v, RAMP);
      this._nodes.binGainR.gain.rampTo(v, RAMP);
    }
  }

  // ───────── NOISE TEXTURES ─────────

  _buildNoise() {
    const n = this._nodes;
    n.brownGain = new Tone.Gain(0).connect(this._masterGain);
    n.pinkGain = new Tone.Gain(0).connect(this._masterGain);
    n.whiteGain = new Tone.Gain(0).connect(this._masterGain);
    n.brownNoise = new Tone.Noise('brown').connect(n.brownGain);
    n.pinkNoise = new Tone.Noise('pink').connect(n.pinkGain);
    n.whiteNoise = new Tone.Noise('white').connect(n.whiteGain);
  }

  _startNoise() {
    const n = this._nodes;
    // Dispose and recreate noise sources so they can be toggled on/off repeatedly
    try { n.brownNoise.stop(); n.brownNoise.dispose(); } catch (_) {}
    try { n.pinkNoise.stop(); n.pinkNoise.dispose(); } catch (_) {}
    try { n.whiteNoise.stop(); n.whiteNoise.dispose(); } catch (_) {}
    n.brownNoise = new Tone.Noise('brown').connect(n.brownGain);
    n.pinkNoise  = new Tone.Noise('pink').connect(n.pinkGain);
    n.whiteNoise = new Tone.Noise('white').connect(n.whiteGain);
    n.brownNoise.start();
    n.pinkNoise.start();
    n.whiteNoise.start();
    n.brownGain.gain.rampTo(this._brownVol, RAMP);
    n.pinkGain.gain.rampTo(this._pinkVol, RAMP);
    n.whiteGain.gain.rampTo(this._whiteVol, RAMP);
  }

  _stopNoise() {
    const n = this._nodes;
    n.brownGain.gain.rampTo(0, RAMP);
    n.pinkGain.gain.rampTo(0, RAMP);
    n.whiteGain.gain.rampTo(0, RAMP);
    try { n.brownNoise.stop(); } catch (_) {}
    try { n.pinkNoise.stop(); } catch (_) {}
    try { n.whiteNoise.stop(); } catch (_) {}
  }

  /** @param {boolean} enabled */
  setNoiseEnabled(enabled) {
    this._noiseEnabled = enabled;
    if (!this.playing) return;
    enabled ? this._startNoise() : this._stopNoise();
  }

  /** @param {number} v 0-1 */
  setBrownVolume(v) {
    this._brownVol = v;
    if (this._noiseEnabled && this.playing) this._nodes.brownGain.gain.rampTo(v, RAMP);
  }

  /** @param {number} v 0-1 */
  setPinkVolume(v) {
    this._pinkVol = v;
    if (this._noiseEnabled && this.playing) this._nodes.pinkGain.gain.rampTo(v, RAMP);
  }

  /** @param {number} v 0-1 */
  setWhiteVolume(v) {
    this._whiteVol = v;
    if (this._noiseEnabled && this.playing) this._nodes.whiteGain.gain.rampTo(v, RAMP);
  }

  // ───────── AMBIENT DRONE ─────────

  _buildDrone() {
    const n = this._nodes;
    n.droneGain = new Tone.Gain(0).connect(this._masterGain);
    n.droneFilter = new Tone.Filter(300, 'lowpass').connect(n.droneGain);
    n.droneOscs = [55, 82.5, 110, 165].map(f => {
      const osc = new Tone.Oscillator(f, 'sine').connect(n.droneFilter);
      return osc;
    });
  }

  _startDrone() {
    const n = this._nodes;
    // Dispose and recreate drone oscillators so they can be toggled on/off repeatedly
    if (n.droneOscs) {
      n.droneOscs.forEach(o => { try { o.stop(); o.dispose(); } catch (_) {} });
    }
    n.droneOscs = [55, 82.5, 110, 165].map(f => new Tone.Oscillator(f, 'sine').connect(n.droneFilter));
    n.droneOscs.forEach(o => o.start());
    n.droneGain.gain.rampTo(this._droneVolume, RAMP);
  }

  _stopDrone() {
    this._nodes.droneGain.gain.rampTo(0, RAMP);
    this._nodes.droneOscs.forEach(o => { try { o.stop(); } catch (_) {} });
  }

  /** @param {boolean} enabled */
  setDroneEnabled(enabled) {
    this._droneEnabled = enabled;
    if (!this.playing) return;
    enabled ? this._startDrone() : this._stopDrone();
  }

  /** @param {number} v 0-1 */
  setDroneVolume(v) {
    this._droneVolume = v;
    if (this._droneEnabled && this.playing) this._nodes.droneGain.gain.rampTo(v, RAMP);
  }

  // ───────── NATURE SOUNDS ─────────

  _buildNature() {
    this._nodes.natureGain = new Tone.Gain(0).connect(this._masterGain);
    this._natureNodes = null;
  }

  _teardownNatureType() {
    if (!this._natureNodes) return;
    this._natureNodes.forEach(node => {
      try { if (node.stop) node.stop(); } catch (_) {}
      try { if (node.dispose) node.dispose(); } catch (_) {}
    });
    this._natureNodes = null;
    // Clear nature scheduled events
    this._scheduleIds.forEach(id => Tone.Transport.clear(id));
    this._scheduleIds = [];
    this._loops.forEach(l => { try { l.stop(); l.dispose(); } catch (_) {} });
    this._loops = [];
  }

  _startNature() {
    this._teardownNatureType();
    this._nodes.natureGain.gain.rampTo(this._natureVolume, RAMP);
    const dest = this._nodes.natureGain;
    const nodes = [];

    switch (this._natureType) {
      case 'rain': {
        const bp = new Tone.Filter(1000, 'bandpass');
        bp.Q.value = 0.5;
        const noise = new Tone.Noise('white').connect(bp);
        const lfoGain = new Tone.Gain(0.7).connect(dest);
        bp.connect(lfoGain);
        const lfo = new Tone.LFO(0.3, 0.4, 1).connect(lfoGain.gain);
        lfo.start();
        noise.start();
        nodes.push(noise, bp, lfoGain, lfo);
        // Thunder rumble every 15-30s
        const thunderGain = new Tone.Gain(0).connect(dest);
        const thunderNoise = new Tone.Noise('brown').connect(thunderGain);
        thunderNoise.start();
        nodes.push(thunderGain, thunderNoise);
        const loop = new Tone.Loop(() => {
          thunderGain.gain.rampTo(0.3, 0.5);
          setTimeout(() => thunderGain.gain.rampTo(0, 2), 1000);
        }, 20);
        loop.probability = 0.5;
        loop.start(0);
        this._loops.push(loop);
        break;
      }
      case 'ocean': {
        const lp = new Tone.Filter(400, 'lowpass');
        const brownN = new Tone.Noise('brown').connect(lp);
        const waveGain = new Tone.Gain(0.6).connect(dest);
        lp.connect(waveGain);
        const lfo = new Tone.LFO(0.08, 0.2, 0.8).connect(waveGain.gain);
        lfo.start();
        brownN.start();
        nodes.push(brownN, lp, waveGain, lfo);
        // Foam layer
        const hp = new Tone.Filter(2000, 'highpass');
        const foamN = new Tone.Noise('white').connect(hp);
        const foamGain = new Tone.Gain(0.15).connect(dest);
        hp.connect(foamGain);
        const lfo2 = new Tone.LFO(0.08, 0.0, 0.2);
        lfo2.phase = 180; // inverted relative to wave
        lfo2.connect(foamGain.gain);
        lfo2.start();
        foamN.start();
        nodes.push(foamN, hp, foamGain, lfo2);
        break;
      }
      case 'forest': {
        // Quiet pink ambience
        const ambGain = new Tone.Gain(0.08).connect(dest);
        const pn = new Tone.Noise('pink').connect(ambGain);
        pn.start();
        nodes.push(pn, ambGain);
        // Bird sounds via random scheduling
        const birdGain = new Tone.Gain(0.2).connect(dest);
        nodes.push(birdGain);
        const birdLoop = new Tone.Loop(() => {
          const freq = 1500 + Math.random() * 2500;
          const dur = 0.05 + Math.random() * 0.15;
          const osc = new Tone.Oscillator(freq, 'sine');
          const env = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: dur, sustain: 0, release: 0.01 });
          osc.connect(env);
          env.connect(birdGain);
          osc.start();
          env.triggerAttackRelease(dur);
          setTimeout(() => { try { osc.stop(); osc.dispose(); env.dispose(); } catch (_) {} }, (dur + 0.1) * 1000);
        }, 3);
        birdLoop.probability = 0.6;
        birdLoop.humanize = '2s';
        birdLoop.start(0);
        this._loops.push(birdLoop);
        break;
      }
      case 'fireplace': {
        const lp = new Tone.Filter(500, 'lowpass');
        const bn = new Tone.Noise('brown').connect(lp);
        const baseGain = new Tone.Gain(0.5).connect(dest);
        lp.connect(baseGain);
        bn.start();
        nodes.push(bn, lp, baseGain);
        // Crackle
        const crackleGain = new Tone.Gain(0).connect(dest);
        const crackleNoise = new Tone.Noise('white').connect(crackleGain);
        crackleNoise.start();
        nodes.push(crackleGain, crackleNoise);
        const crackleLoop = new Tone.Loop(() => {
          const dur = 0.02 + Math.random() * 0.06;
          crackleGain.gain.rampTo(0.3 + Math.random() * 0.3, 0.005);
          setTimeout(() => crackleGain.gain.rampTo(0, dur), dur * 1000);
        }, 1);
        crackleLoop.probability = 0.7;
        crackleLoop.humanize = '0.4s';
        crackleLoop.start(0);
        this._loops.push(crackleLoop);
        // Occasional pop
        const memSynth = new Tone.MembraneSynth({ volume: -30 }).connect(dest);
        nodes.push(memSynth);
        const popLoop = new Tone.Loop(() => {
          memSynth.triggerAttackRelease('C1', 0.05);
        }, 5);
        popLoop.probability = 0.3;
        popLoop.start(0);
        this._loops.push(popLoop);
        break;
      }
      case 'cafe': {
        const bp = new Tone.Filter(800, 'bandpass');
        bp.Q.value = 1;
        const pn = new Tone.Noise('pink').connect(bp);
        const cafeGain = new Tone.Gain(0.2).connect(dest);
        bp.connect(cafeGain);
        pn.start();
        nodes.push(pn, bp, cafeGain);
        // Murmur bursts
        const murmurBP = new Tone.Filter(1000, 'bandpass');
        murmurBP.Q.value = 2;
        const murmurNoise = new Tone.Noise('pink').connect(murmurBP);
        const murmurGain = new Tone.Gain(0).connect(dest);
        murmurBP.connect(murmurGain);
        murmurNoise.start();
        nodes.push(murmurNoise, murmurBP, murmurGain);
        const murmurLoop = new Tone.Loop(() => {
          const dur = 1 + Math.random() * 3;
          murmurBP.frequency.rampTo(300 + Math.random() * 1700, 0.1);
          murmurGain.gain.rampTo(0.05 + Math.random() * 0.1, 0.3);
          setTimeout(() => murmurGain.gain.rampTo(0, 0.5), dur * 1000);
        }, 4);
        murmurLoop.probability = 0.6;
        murmurLoop.humanize = '1.5s';
        murmurLoop.start(0);
        this._loops.push(murmurLoop);
        break;
      }
    }

    this._natureNodes = nodes;
  }

  _stopNature() {
    this._nodes.natureGain.gain.rampTo(0, RAMP);
    this._teardownNatureType();
  }

  /** @param {boolean} enabled */
  setNatureEnabled(enabled) {
    this._natureEnabled = enabled;
    if (!this.playing) return;
    enabled ? this._startNature() : this._stopNature();
  }

  /** @param {'rain'|'ocean'|'forest'|'fireplace'|'cafe'} type */
  setNatureType(type) {
    this._natureType = type;
    if (this._natureEnabled && this.playing) this._startNature();
  }

  /** @param {number} v 0-1 */
  setNatureVolume(v) {
    this._natureVolume = v;
    if (this._natureEnabled && this.playing) this._nodes.natureGain.gain.rampTo(v, RAMP);
  }

  // ───────── MUSIC ─────────

  _buildMusic() {
    const n = this._nodes;
    n.musicGain = new Tone.Gain(0).connect(this._masterGain);
    n.arpGain = new Tone.Gain(0).connect(n.musicGain);
    n.padGain = new Tone.Gain(0).connect(n.musicGain);
    n.beatGain = new Tone.Gain(0).connect(n.musicGain);
    n.bassGain = new Tone.Gain(0).connect(n.musicGain);
    n.melodyGain = new Tone.Gain(0).connect(n.musicGain);

    // Shared effects pool (reused across genre switches to avoid node creation)
    n.sharedReverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).connect(n.padGain);
    n.sharedDelay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0.2 }).connect(n.sharedReverb);
    n.sharedChorus = new Tone.Chorus({ frequency: 1.5, depth: 0.5, wet: 0.3 }).connect(n.padGain);
    n.sharedChorus.start();

    // Arp effects
    n.sharedArpDelay = new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.25, wet: 0.2 }).connect(n.arpGain);

    // Bass filter
    n.bassFilter = new Tone.Filter(400, 'lowpass').connect(n.bassGain);

    this._musicParts = [];
    this._musicSynths = [];
  }

  /** Post-process all music synths to apply sound design params (reverb, delay). */
  _postProcessMusic() {
    this._musicSynths.forEach(s => {
      try {
        // Reverb nodes have 'wet' and 'decay' properties
        if (s instanceof Tone.Reverb) {
          s.wet.rampTo(this._reverbMix, RAMP);
          if (this._liveReverbs && !this._liveReverbs.includes(s)) this._liveReverbs.push(s);
        }
        // Delay nodes have 'feedback' and 'wet'
        if (s instanceof Tone.FeedbackDelay || s instanceof Tone.PingPongDelay) {
          const fb = Math.min(0.9, s.feedback.value * (this._delayMix / 0.4));
          s.feedback.rampTo(fb, RAMP);
          if (this._liveDelays && !this._liveDelays.includes(s)) this._liveDelays.push(s);
        }
      } catch (_) {}
    });
  }

  /** Dispose current music synths and parts, then rebuild for the active preset. */
  _teardownMusic() {
    // Fade out music gain to avoid clicks
    const n = this._nodes;
    if (n.musicGain) n.musicGain.gain.rampTo(0, 0.15);

    // Delay actual disposal to let fade complete
    const partsToDispose = [...this._musicParts];
    const synthsToDispose = [...this._musicSynths];
    this._musicParts = [];
    this._musicSynths = [];

    setTimeout(() => {
      partsToDispose.forEach(p => { try { p.stop(); p.dispose(); } catch (_) {} });
      synthsToDispose.forEach(s => { try { if (s.stop) s.stop(); s.dispose(); } catch (_) {} });
    }, 200);
  }

  // ── Shared helpers for pattern variation ──

  /** Probabilistic note trigger - scales by density parameter */
  _prob(probability) {
    return Math.random() < (probability * this._density / 0.7);
  }

  /** Random velocity variation */
  _randVel(base, range) {
    return Math.max(0.1, Math.min(1, base + (Math.random() - 0.5) * range));
  }

  /** Humanize timing (slight random offset in seconds) */
  _humanize(ms) {
    return (Math.random() - 0.5) * ms / 1000;
  }

  /** Compute pad attack time from _padAttack (0-1) and preset default */
  _getPadAttack(presetDefault) {
    return presetDefault * (0.1 + this._padAttack * 1.8);
  }

  /** Get reverb wet amount */
  _getReverbWet() { return this._reverbMix; }

  /** Get delay feedback scaled by preset default */
  _getDelayFeedback(presetDefault) {
    return presetDefault * (this._delayMix / 0.4);
  }

  /** Get chord notes with key transposition applied */
  _getChordNotes(chordName) {
    const notes = CHORDS[chordName];
    if (!notes) return null;
    return transposeNotes(notes, this._keyTranspose);
  }

  /** Get the effective chord progression (override or preset default) */
  _getChords(preset) {
    if (this._progressionType !== 'default' && PROGRESSION_TEMPLATES[this._progressionType]) {
      return PROGRESSION_TEMPLATES[this._progressionType];
    }
    return preset.chords;
  }

  /** Get arp notes from chord in the selected pattern */
  _getArpNotes(chordNotes, octave) {
    if (!chordNotes) return [];
    const notes = chordNotes.map(n => {
      const letter = n.replace(/[0-9]/g, '');
      return letter + octave;
    });
    const pattern = this._arpPattern;
    if (pattern === 'down') return notes.slice().reverse();
    if (pattern === 'up-down') return [...notes, ...notes.slice(1, -1).reverse()];
    if (pattern === 'random') return notes.sort(() => Math.random() - 0.5);
    return notes; // 'up'
  }

  /** Register a reverb for live control */
  _trackReverb(reverb) {
    reverb.wet.value = this._reverbMix;
    if (this._liveReverbs) this._liveReverbs.push(reverb);
  }

  /** Register a delay for live control */
  _trackDelay(delay) {
    if (delay.feedback) delay.feedback.value = Math.min(0.9, this._delayMix * 0.8);
    if (this._liveDelays) this._liveDelays.push(delay);
  }

  /** Shared swing-time calculator */
  _getSwungTime(step, swingAmt) {
    const stepLen16 = Tone.Time('16n').toSeconds();
    const pos = step % 16;
    const baseTime = stepLen16 * pos;
    if (pos % 2 === 1) {
      return baseTime + swingAmt * stepLen16;
    }
    return baseTime;
  }

  /** Re-randomize all probabilistic elements without changing genre */
  regenerate() {
    if (this._musicEnabled && this.playing) {
      this._startMusic();
    }
  }

  _startMusic() {
    this._teardownMusic();
    this._liveReverbs = [];
    this._liveDelays = [];
    const presetName = this._musicPreset;
    const preset = MUSIC_PRESETS[presetName];
    if (!preset) return;

    Tone.Transport.bpm.rampTo(preset.bpm, 0.5);

    const n = this._nodes;
    n.arpGain.gain.rampTo(this._arpVolume, RAMP);
    n.padGain.gain.rampTo(this._padVolume, RAMP);
    n.beatGain.gain.rampTo(this._beatVolume, RAMP);
    n.bassGain.gain.rampTo(this._padVolume * 0.8, RAMP);
    n.melodyGain.gain.rampTo(this._melodyEnabled ? this._melodyVolume : 0, RAMP);
    n.musicGain.gain.rampTo(1, RAMP);

    // Reconnect shared bass filter to bassGain (may have been rerouted by previous genre)
    try { n.bassFilter.disconnect(); } catch (_) {}
    n.bassFilter.connect(n.bassGain);

    // Each genre has its own builder for distinct sound
    switch (presetName) {
      case 'minimal': this._buildMinimal(preset); break;
      case 'detroit': this._buildDetroit(preset); break;
      case 'acid': this._buildAcid(preset); break;
      case 'dubtechno': this._buildDubTechno(preset); break;
      case 'trance': this._buildTrance(preset); break;
      case 'dnb': this._buildDnB(preset); break;
      case 'deephouse': this._buildDeepHouse(preset); break;
      case 'progressive': this._buildProgressive(preset); break;
      case 'ambienttechno': this._buildAmbientTechno(preset); break;
      case 'hardtechno': this._buildHardTechno(preset); break;
      default: this._buildGeneric(preset); break;
    }

    // Build melody layer if enabled
    if (this._melodyEnabled) {
      this._buildMelody(preset);
    }

    this._postProcessMusic();
  }

  /** Build a melody layer over the current chord progression */
  _buildMelody(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    try {
      const melodySynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.5 },
        volume: -6,
      }).connect(n.melodyGain);
      this._musicSynths.push(melodySynth);

      const style = this._melodyStyle;
      const melodyEvents = [];

      chordNames.forEach((chordName, ci) => {
        const chordNotes = this._getChordNotes(chordName);
        if (!chordNotes) return;
        // Build scale from chord tones + passing tones in octave 5
        const scaleNotes = chordNotes.map(note => {
          const letter = note.replace(/[0-9]/g, '');
          return letter + '5';
        });
        // Add a passing tone between chord tones
        const extendedScale = [...scaleNotes];
        if (chordNotes.length >= 2) {
          const letter = chordNotes[1].replace(/[0-9]/g, '');
          extendedScale.push(transposeNote(letter + '5', 2)); // whole step above 2nd
        }

        if (style === 'generative') {
          // Probabilistic melody: 8th note grid, ~50% density
          for (let s = 0; s < 8; s++) {
            const time = ci * barLen + s * Tone.Time('8n').toSeconds();
            const note = extendedScale[Math.floor(Math.random() * extendedScale.length)];
            melodyEvents.push([time, { note, prob: 0.5, dur: '8n' }]);
          }
        } else if (style === 'call-response') {
          // First half: short phrase, second half: response
          const callLen = 3;
          for (let s = 0; s < callLen; s++) {
            const time = ci * barLen + s * Tone.Time('8n').toSeconds();
            const note = extendedScale[s % extendedScale.length];
            melodyEvents.push([time, { note, prob: 0.8, dur: '8n' }]);
          }
          // Response after a rest
          for (let s = 0; s < 2; s++) {
            const time = ci * barLen + (5 + s) * Tone.Time('8n').toSeconds();
            const note = extendedScale[(callLen - 1 - s) % extendedScale.length];
            melodyEvents.push([time, { note, prob: 0.7, dur: '4n' }]);
          }
        } else {
          // Ambient: very sparse, long notes
          const note = extendedScale[Math.floor(Math.random() * extendedScale.length)];
          melodyEvents.push([ci * barLen, { note, prob: 0.4, dur: '2n' }]);
        }
      });

      const melodyPart = new Tone.Part((time, ev) => {
        if (this._prob(ev.prob)) {
          melodySynth.triggerAttackRelease(ev.note, ev.dur, time, this._randVel(0.5, 0.15));
        }
      }, melodyEvents);
      melodyPart.loop = true;
      melodyPart.loopEnd = chordNames.length * barLen;
      melodyPart.start(0);
      this._musicParts.push(melodyPart);
    } catch (_) {}
  }

  // ── Genre-specific builders ──

  _buildMinimal(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: FMSynth - metallic/bell tones
    try {
      // Configure shared reverb for this genre
      n.sharedReverb.decay = 6;
      n.sharedReverb.wet.rampTo(this._getReverbWet(), 0.1);
      this._trackReverb(n.sharedReverb);

      const padSynth = new Tone.PolySynth(Tone.FMSynth, {
        maxPolyphony: 4,
        voice: Tone.FMSynth,
        options: {
          harmonicity: 1.414,
          modulationIndex: 8,
          envelope: { attack: this._getPadAttack(3), decay: 2, sustain: 0.3, release: 3 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 2, decay: 1, sustain: 0.5, release: 3 },
          volume: -8,
        },
      }).connect(n.sharedReverb);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes || !this._prob(0.7)) return;
        padSynth.triggerAttackRelease(notes, '1m', time, this._randVel(0.4, 0.15));
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: PluckSynth - plucked string through shared arp delay
    try {
      // Configure shared arp delay for this genre
      n.sharedArpDelay.delayTime.rampTo(Tone.Time('8n.').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(this._getDelayFeedback(0.4), 0.1);
      n.sharedArpDelay.wet.rampTo(0.35, 0.1);
      this._trackDelay(n.sharedArpDelay);

      const arpSynth = new Tone.PluckSynth({
        attackNoise: 1, resonance: 0.95, release: 1.2, volume: -10,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      // Sparse: only 4 notes per bar
      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const arpNotes = this._getArpNotes(notes, 5);
        for (let s = 0; s < 4; s++) {
          arpEvents.push([ci * barLen + s * Tone.Time('4n').toSeconds(), arpNotes[s % arpNotes.length]]);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        if (this._prob(0.75)) arpSynth.triggerAttack(note, time);
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 6,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -4,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const hat = new Tone.NoiseSynth({
        volume: -12,
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      // Minimal: sparse kick pattern with random skips, only occasional hats
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') {
          if (this._prob(0.85)) kick.triggerAttackRelease('C1', '8n', time);
        } else {
          if (this._prob(0.6)) hat.triggerAttackRelease('32n', time, this._randVel(0.3, 0.2));
        }
      }, [
        { time: 0, type: 'k' },
        { time: this._getSwungTime(4, 0), type: 'k' },
        { time: this._getSwungTime(8, 0), type: 'k' },
        { time: this._getSwungTime(12, 0), type: 'k' },
        { time: this._getSwungTime(6, 0), type: 'h' },
        { time: this._getSwungTime(14, 0), type: 'h' },
      ]);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // No bass for minimal

    // Evolution: every 4 bars shift a chord note
    try {
      let evoCount = 0;
      const evoLoop = new Tone.Loop(() => { evoCount++; }, '4m');
      evoLoop.start(0);
      this._musicParts.push(evoLoop);
    } catch (_) {}
  }

  _buildDetroit(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();
    const swing = this._swing || preset.swing || 0;

    // Pad: Sawtooth PolySynth → Chorus → Reverb (classic Detroit string pad)
    try {
      // Configure shared effects for Detroit
      n.sharedReverb.decay = 4;
      n.sharedReverb.wet.rampTo(0.35, 0.1);
      n.sharedChorus.frequency.rampTo(2, 0.1);
      n.sharedChorus.depth = 0.6;
      n.sharedChorus.wet.rampTo(0.5, 0.1);

      const padSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.8, decay: 1.5, sustain: 0.6, release: 2 },
          volume: -8,
        },
      }).connect(n.sharedChorus);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '1m', time, this._randVel(0.5, 0.1));
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: Sawtooth → AutoFilter for sweeping movement
    try {
      const autoFilter = new Tone.AutoFilter({ frequency: 0.5, depth: 0.7, wet: 0.6 }).connect(n.arpGain);
      autoFilter.start();
      this._musicSynths.push(autoFilter);

      const arpSynth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.2 },
        volume: -12,
      }).connect(autoFilter);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const up = [...notes];
        const down = [...notes].reverse().slice(1, -1);
        const ordered = up.concat(down);
        for (let s = 0; s < 8; s++) {
          const note = ordered[s % ordered.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s * 2, swing), letter + '4']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        arpSynth.triggerAttackRelease(note, '16n', time, this._randVel(0.6, 0.2));
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: longer decay
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
        volume: -4,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -8, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [
        { time: 0, type: 'k' },
        { time: this._getSwungTime(4, swing), type: 'k' },
        { time: this._getSwungTime(8, swing), type: 'k' },
        { time: this._getSwungTime(12, swing), type: 'k' },
        { time: this._getSwungTime(4, swing), type: 's' },
        { time: this._getSwungTime(12, swing), type: 's' },
        // Offbeat hats
        { time: this._getSwungTime(2, swing), type: 'h' },
        { time: this._getSwungTime(6, swing), type: 'h' },
        { time: this._getSwungTime(10, swing), type: 'h' },
        { time: this._getSwungTime(14, swing), type: 'h' },
      ];
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('16n', time);
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Sawtooth MonoSynth, melodic 8th-note pattern
    try {
      // Configure shared bass filter for Detroit
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 800, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 2, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { type: 'lowpass', frequency: 800, Q: 2 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
        volume: -8,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const bassPattern = preset.bassPattern || [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0];
        for (let s = 0; s < 16; s++) {
          if (bassPattern[s]) {
            const root = notes[0].replace(/[0-9]/g, '');
            bassEvents.push([ci * barLen + this._getSwungTime(s, swing), root + '2']);
          }
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '16n', time, this._randVel(0.7, 0.15));
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _buildAcid(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // No pad for acid - it's all about the bass

    // No arp either

    // Kick: Hard, short pitch decay
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.04, octaves: 6,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -2,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      // Hat: Harsh 16ths, very short
      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -8, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [];
      [0, 4, 8, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 'k' }));
      [4, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 's' }));
      for (let i = 0; i < 16; i++) {
        beatEvents.push({ time: this._getSwungTime(i, 0), type: 'h', vel: (i % 4 === 0) ? 0.9 : 0.45 });
      }
      const beatPart = new Tone.Part((time, type, vel) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('32n', time);
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: THE STAR - acid 303 style
    try {
      // Configure shared bass filter for acid
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 300, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 12, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { type: 'lowpass', rolloff: -24, Q: 18 },
        filterEnvelope: {
          attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.2,
          baseFrequency: 150, octaves: 4,
        },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.15, release: 0.2 },
        volume: -4,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      // Generate 16-step pattern with random accents and slides
      const accentPattern = Array.from({ length: 16 }, () => this._prob(0.3));
      const slidePattern = Array.from({ length: 16 }, () => this._prob(0.25));
      const notePattern = preset.bassPattern || [1,0,1,1, 0,1,1,0, 1,1,0,1, 0,1,0,1];

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        for (let s = 0; s < 16; s++) {
          if (notePattern[s]) {
            const octave = Math.random() < 0.3 ? '3' : (Math.random() < 0.15 ? '1' : '2');
            bassEvents.push({
              time: ci * barLen + this._getSwungTime(s, 0),
              note: root + octave,
              accent: accentPattern[s],
              slide: slidePattern[s],
            });
          }
        }
      });

      const bassPart = new Tone.Part((time, note, accent, slide) => {
        if (accent) {
          bassSynth.filterEnvelope.octaves = 6;
        } else {
          bassSynth.filterEnvelope.octaves = 4;
        }
        if (slide) {
          bassSynth.portamento = 0.1;
        } else {
          bassSynth.portamento = 0;
        }
        bassSynth.triggerAttackRelease(note, '16n', time, accent ? 0.95 : 0.65);
      }, bassEvents.map(e => ({ time: e.time, note: e.note, accent: e.accent, slide: e.slide })));
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);

      // Evolution: re-randomize accents every 4 bars, sweep baseFrequency
      let evoCount = 0;
      const evoLoop = new Tone.Loop(() => {
        evoCount++;
        // Slowly sweep base frequency over 16 bars
        const sweepPos = (evoCount % 16) / 16;
        const baseFreq = 150 + Math.sin(sweepPos * Math.PI * 2) * 100;
        try { bassSynth.filterEnvelope.baseFrequency = baseFreq; } catch (_) {}
      }, '4m');
      evoLoop.start(0);
      this._musicParts.push(evoLoop);
    } catch (_) {}
  }

  _buildDubTechno(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: Sawtooth → MASSIVE Reverb(10s) → FeedbackDelay
    try {
      // Configure shared effects for dub techno (massive reverb + delay)
      n.sharedDelay.delayTime.rampTo(Tone.Time('4n.').toSeconds(), 0.1);
      n.sharedDelay.feedback.rampTo(0.7, 0.1);
      n.sharedDelay.wet.rampTo(0.5, 0.1);
      n.sharedReverb.decay = 10;
      n.sharedReverb.wet.rampTo(0.7, 0.1);

      const padSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 1.5, decay: 2, sustain: 0.5, release: 4 },
          volume: -10,
        },
      }).connect(n.sharedDelay);
      this._musicSynths.push(padSynth);

      // Sparse: chord stab every 2 bars
      const padEvents = chordNames.filter((_, i) => i % 2 === 0).map((c, i) => [i * 2 * barLen, c]);
      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '2m', time, this._randVel(0.35, 0.1));
      }, padEvents);
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: PluckSynth through shared arp delay, sparse
    try {
      // Configure shared arp delay for dub techno
      n.sharedArpDelay.delayTime.rampTo(Tone.Time('4n.').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(0.65, 0.1);
      n.sharedArpDelay.wet.rampTo(0.6, 0.1);

      const arpSynth = new Tone.PluckSynth({
        attackNoise: 0.8, resonance: 0.9, release: 1, volume: -14,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        // Very sparse: 2 notes per bar
        for (let s = 0; s < 2; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + s * Tone.Time('2n').toSeconds(), letter + '4']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        if (this._prob(0.6)) arpSynth.triggerAttack(note, time);
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: Deep, long decay, low octaves
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 3,
        envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.2 },
        volume: -4,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      // Hat: Very sparse
      const hat = new Tone.NoiseSynth({
        volume: -14,
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (this._prob(0.5)) hat.triggerAttackRelease('16n', time);
      }, [
        { time: 0, type: 'k' },
        { time: this._getSwungTime(4, 0), type: 'k' },
        { time: this._getSwungTime(8, 0), type: 'k' },
        { time: this._getSwungTime(12, 0), type: 'k' },
        { time: this._getSwungTime(4, 0), type: 'h' },
        { time: this._getSwungTime(12, 0), type: 'h' },
      ]);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Sine sub, just root notes
    try {
      // Configure shared bass filter for dub techno
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 300, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 1, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.5, sustain: 0.6, release: 0.8 },
        volume: -6,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        bassEvents.push([ci * barLen, root + '2']);
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '2n', time, 0.6);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _buildTrance(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: SUPERSAW - 3 detuned sawtooths → shared Chorus → shared Reverb
    try {
      // Configure shared effects for trance
      n.sharedReverb.decay = 5;
      n.sharedReverb.wet.rampTo(0.3, 0.1);
      n.sharedChorus.frequency.rampTo(1.5, 0.1);
      n.sharedChorus.depth = 0.5;
      n.sharedChorus.wet.rampTo(0.4, 0.1);

      const detunes = [-15, 0, 15];
      detunes.forEach(detune => {
        const synth = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 4,
          voice: Tone.Synth,
          options: {
            oscillator: { type: 'sawtooth', detune: detune },
            envelope: { attack: 0.5, decay: 1, sustain: 0.8, release: 2 },
            volume: -14,
          },
        }).connect(n.sharedChorus);
        this._musicSynths.push(synth);

        const padPart = new Tone.Part((time, chord) => {
          const notes = this._getChordNotes(chord);
          if (!notes) return;
          synth.triggerAttackRelease(notes, '1m', time);
        }, chordNames.map((c, i) => [i * barLen, c]));
        padPart.loop = true;
        padPart.loopEnd = chordNames.length * barLen;
        padPart.start(0);
        this._musicParts.push(padPart);
      });
    } catch (_) {}

    // Arp: Sawtooth gated 16ths → AutoFilter for trance gate
    try {
      const autoFilter = new Tone.AutoFilter({ frequency: '4n', depth: 0.8, wet: 0.5 }).connect(n.arpGain);
      autoFilter.start();
      this._musicSynths.push(autoFilter);

      const arpSynth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.08, sustain: 0.3, release: 0.1 },
        volume: -12,
      }).connect(autoFilter);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        for (let s = 0; s < 16; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s, 0), letter + '5']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        arpSynth.triggerAttackRelease(note, '32n', time, this._randVel(0.7, 0.2));
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: Punchy, mid decay
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.04, octaves: 5,
        envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
        volume: -3,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -8, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [];
      [0, 4, 8, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 'k' }));
      [4, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 's' }));
      // Offbeat 8ths hats
      [2, 6, 10, 14].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 'h' }));
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('16n', time);
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Sawtooth pumping 8ths
    try {
      // Configure shared bass filter for trance
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 600, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 3, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { type: 'lowpass', frequency: 600, Q: 3 },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.2 },
        volume: -8,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        for (let s = 0; s < 8; s++) {
          bassEvents.push([ci * barLen + s * Tone.Time('8n').toSeconds(), root + '2']);
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '16n', time, 0.75);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}

    // Evolution: filter sweep on pad every 8 bars
    try {
      let evoCount = 0;
      const evoLoop = new Tone.Loop(() => {
        evoCount++;
      }, '8m');
      evoLoop.start(0);
      this._musicParts.push(evoLoop);
    } catch (_) {}
  }

  _buildDnB(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();
    const swing = this._swing || preset.swing || 0.1;

    // Pad: FMSynth Rhodes-like → shared Reverb
    try {
      // Configure shared reverb for DnB
      n.sharedReverb.decay = 4;
      n.sharedReverb.wet.rampTo(0.35, 0.1);

      const padSynth = new Tone.PolySynth(Tone.FMSynth, {
        maxPolyphony: 4,
        voice: Tone.FMSynth,
        options: {
          harmonicity: 3.5,
          modulationIndex: 2,
          envelope: { attack: 0.8, decay: 1.5, sustain: 0.5, release: 2 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.5, decay: 1, sustain: 0.3, release: 2 },
          volume: -10,
        },
      }).connect(n.sharedReverb);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '1m', time, this._randVel(0.4, 0.1));
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: PluckSynth fast arps
    try {
      // Configure shared arp delay for DnB
      n.sharedArpDelay.delayTime.rampTo(Tone.Time('8n').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(0.2, 0.1);
      n.sharedArpDelay.wet.rampTo(0.2, 0.1);

      const arpSynth = new Tone.PluckSynth({
        attackNoise: 0.8, resonance: 0.9, release: 0.8, volume: -12,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const up = [...notes];
        const down = [...notes].reverse().slice(1, -1);
        const ordered = up.concat(down);
        for (let s = 0; s < 16; s++) {
          const note = ordered[s % ordered.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s, swing), letter + '5']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        if (this._prob(0.8)) arpSynth.triggerAttack(note, time);
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: SHORT punchy, high octaves, fast pitch decay
    // Snare: HARD on 2 and 4 (essential for DnB)
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.03, octaves: 8,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
        volume: -3,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const snare = new Tone.NoiseSynth({
        volume: -5, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      // Breakbeat pattern: kick on 1 and the "and" of 3
      const beatEvents = [
        { time: this._getSwungTime(0, swing), type: 'k' },
        { time: this._getSwungTime(7, swing), type: 'k' },
        // Hard snare on 2 and 4
        { time: this._getSwungTime(4, swing), type: 's' },
        { time: this._getSwungTime(12, swing), type: 's' },
      ];
      // Syncopated hats with humanization and probability
      for (let i = 0; i < 16; i++) {
        beatEvents.push({ time: this._getSwungTime(i, swing), type: 'h', vel: (i % 2 === 0) ? 0.8 : 0.4 });
      }
      const beatPart = new Tone.Part((time, type, vel) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time + this._humanize(10));
        else if (type === 's') snare.triggerAttackRelease('16n', time + this._humanize(5));
        else if (this._prob(0.85)) hat.triggerAttackRelease('32n', time + this._humanize(15));
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: REESE - two detuned sawtooths through lowpass, with portamento
    try {
      // Configure shared bass filter for DnB
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 500, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 2, 0.1);

      const reese1 = new Tone.Synth({
        oscillator: { type: 'sawtooth', detune: 5 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.4 },
        volume: -8,
      }).connect(n.bassFilter);
      reese1.portamento = 0.05;
      this._musicSynths.push(reese1);

      const reese2 = new Tone.Synth({
        oscillator: { type: 'sawtooth', detune: -5 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.4 },
        volume: -8,
      }).connect(n.bassFilter);
      reese2.portamento = 0.05;
      this._musicSynths.push(reese2);

      const bassEvents = [];
      const bassPattern = preset.bassPattern || [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        for (let s = 0; s < 16; s++) {
          if (bassPattern[s]) {
            bassEvents.push([ci * barLen + this._getSwungTime(s, swing), root + '1']);
          }
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        reese1.triggerAttackRelease(note, '8n', time, this._randVel(0.7, 0.15));
        reese2.triggerAttackRelease(note, '8n', time, this._randVel(0.7, 0.15));
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _buildDeepHouse(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();
    const swing = this._swing || preset.swing || 0.15;

    // Pad: FMSynth electric piano / Rhodes → shared Chorus → shared Reverb
    try {
      // Configure shared effects for deep house
      n.sharedChorus.frequency.rampTo(1.5, 0.1);
      n.sharedChorus.depth = 0.4;
      n.sharedChorus.wet.rampTo(0.4, 0.1);
      n.sharedReverb.decay = 3;
      n.sharedReverb.wet.rampTo(0.25, 0.1);

      const padSynth = new Tone.PolySynth(Tone.FMSynth, {
        maxPolyphony: 4,
        voice: Tone.FMSynth,
        options: {
          harmonicity: 2,
          modulationIndex: 3,
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.4 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
          volume: -8,
        },
      }).connect(n.sharedChorus);
      this._musicSynths.push(padSynth);

      // Offbeat chord stabs, not sustained pads
      const padEvents = [];
      chordNames.forEach((chordName, ci) => {
        [2, 6, 10, 14].forEach(pos => {
          padEvents.push([ci * barLen + this._getSwungTime(pos, swing), chordName]);
        });
      });
      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        if (this._prob(0.85)) {
          padSynth.triggerAttackRelease(notes, '8n', time, this._randVel(0.45, 0.15));
        }
      }, padEvents);
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: Simple synth stab on offbeats (reuse arp gain, no extra PolySynth)
    try {
      const arpSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.2 },
        volume: -14,
      }).connect(n.arpGain);
      this._musicSynths.push(arpSynth);

      const stabEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        // Offbeat stabs - play root note only
        [2, 6, 10, 14].forEach(pos => {
          const letter = notes[0].replace(/[0-9]/g, '');
          stabEvents.push([ci * barLen + this._getSwungTime(pos, swing), letter + '4']);
        });
      });
      const stabPart = new Tone.Part((time, note) => {
        if (this._prob(0.8)) {
          arpSynth.triggerAttackRelease(note, '32n', time, this._randVel(0.5, 0.2));
        }
      }, stabEvents);
      stabPart.loop = true;
      stabPart.loopEnd = chordNames.length * barLen;
      stabPart.start(0);
      this._musicParts.push(stabPart);
    } catch (_) {}

    // Kick: Deep, long decay, classic deep kick
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 3,
        envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.15 },
        volume: -3,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      // Hat: Offbeat 8ths with SWING
      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -9, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [];
      [0, 4, 8, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, swing), type: 'k' }));
      [4, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, swing), type: 's' }));
      // Offbeat 8ths with swing
      [2, 6, 10, 14].forEach(p => beatEvents.push({ time: this._getSwungTime(p, swing), type: 'h' }));
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('16n', time + this._humanize(8));
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Walking bass, sine+triangle feel, portamento
    try {
      // Configure shared bass filter for deep house
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 600, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 1, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.5, release: 0.4 },
        volume: -6,
        portamento: 0.08,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      // Walking bass: step through chord tones
      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        for (let s = 0; s < 4; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          bassEvents.push([ci * barLen + this._getSwungTime(s * 4, swing), letter + '2']);
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '8n', time, this._randVel(0.65, 0.15));
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _buildProgressive(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: Sawtooth → shared Reverb
    try {
      // Configure shared reverb for progressive
      n.sharedReverb.decay = 5;
      n.sharedReverb.wet.rampTo(0.35, 0.1);

      const padSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 2, decay: 3, sustain: 0.4, release: 4 },
          volume: -8,
        },
      }).connect(n.sharedReverb);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '1m', time, this._randVel(0.4, 0.1));
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: Sawtooth plucky
    try {
      // Configure shared arp delay for progressive
      n.sharedArpDelay.delayTime.rampTo(Tone.Time('8n.').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(0.3, 0.1);
      n.sharedArpDelay.wet.rampTo(0.25, 0.1);

      const arpSynth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.05, release: 0.2 },
        volume: -12,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        for (let s = 0; s < 8; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s * 2, 0), letter + '4']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        arpSynth.triggerAttackRelease(note, '16n', time, this._randVel(0.6, 0.2));
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: Standard four-on-floor
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 5,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
        volume: -4,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      // Hat: 16ths building in volume
      const hat = new Tone.NoiseSynth({
        volume: -12,
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -8, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [];
      [0, 4, 8, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 'k' }));
      [4, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 's' }));
      for (let i = 0; i < 16; i++) {
        beatEvents.push({ time: this._getSwungTime(i, 0), type: 'h', vel: (i % 4 === 0) ? 0.8 : 0.4 });
      }
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('32n', time);
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Sawtooth through sweeping filter
    try {
      // Configure shared bass filter for progressive
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 500, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 3, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { type: 'lowpass', frequency: 500, Q: 3 },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.3 },
        volume: -8,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      const bassPattern = preset.bassPattern || [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,1,0,0];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        for (let s = 0; s < 16; s++) {
          if (bassPattern[s]) {
            bassEvents.push([ci * barLen + this._getSwungTime(s, 0), root + '2']);
          }
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '16n', time, 0.7);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}

    // Evolution: gradually open filter over 32 bars
    try {
      let evoCount = 0;
      const evoLoop = new Tone.Loop(() => {
        evoCount++;
        const pos = (evoCount % 32) / 32;
        const freq = 200 + Math.sin(pos * Math.PI) * 4800;
        if (n.bassFilter) n.bassFilter.frequency.rampTo(freq, 2);
      }, '1m');
      evoLoop.start(0);
      this._musicParts.push(evoLoop);
    } catch (_) {}
  }

  _buildAmbientTechno(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: AMSynth with slow modulation → shared reverb → shared delay. Almost no dry signal.
    try {
      // Configure shared effects for ambient techno (massive reverb + delay)
      n.sharedDelay.delayTime.rampTo(Tone.Time('4n.').toSeconds(), 0.1);
      n.sharedDelay.feedback.rampTo(0.7, 0.1);
      n.sharedDelay.wet.rampTo(0.5, 0.1);
      n.sharedReverb.decay = 12;
      n.sharedReverb.wet.rampTo(0.9, 0.1);

      const padSynth = new Tone.PolySynth(Tone.AMSynth, {
        maxPolyphony: 4,
        voice: Tone.AMSynth,
        options: {
          harmonicity: 1.5,
          envelope: { attack: 3, decay: 4, sustain: 0.5, release: 5 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 2, decay: 3, sustain: 0.4, release: 4 },
          volume: -10,
        },
      }).connect(n.sharedDelay);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '2m', time, this._randVel(0.3, 0.1));
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: FMSynth bell-like tones, sparse and random
    try {
      // Configure shared arp delay for ambient techno
      n.sharedArpDelay.delayTime.rampTo(Tone.Time('4n').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(0.5, 0.1);
      n.sharedArpDelay.wet.rampTo(0.5, 0.1);

      const arpSynth = new Tone.FMSynth({
        harmonicity: 3.14,
        modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 2 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1 },
        volume: -16,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      // Very sparse: random bell tones every 3-8 seconds
      const arpLoop = new Tone.Loop((time) => {
        const chordName = chordNames[Math.floor(Math.random() * chordNames.length)];
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const note = notes[Math.floor(Math.random() * notes.length)];
        const letter = note.replace(/[0-9]/g, '');
        const octave = Math.random() < 0.5 ? '5' : '6';
        arpSynth.triggerAttackRelease(letter + octave, '2n', time, this._randVel(0.2, 0.15));
      }, '1m');
      arpLoop.probability = 0.35;
      arpLoop.humanize = '3s';
      arpLoop.start(0);
      this._musicParts.push(arpLoop);
    } catch (_) {}

    // Kick: VERY soft or absent
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.1, octaves: 3,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 },
        volume: -14,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const beatPart = new Tone.Part((time, type) => {
        if (this._prob(0.5)) kick.triggerAttackRelease('C1', '8n', time);
      }, [
        { time: 0, type: 'k' },
        { time: this._getSwungTime(8, 0), type: 'k' },
      ]);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Drone-like sine sub
    try {
      // Configure shared bass filter for ambient techno
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 300, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 1, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 1, decay: 2, sustain: 0.8, release: 3 },
        volume: -8,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        bassEvents.push([ci * barLen, root + '2']);
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '1m', time, 0.4);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _buildHardTechno(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();

    // Pad: Square wave → Distortion → Chebyshev for harsh metallic grit
    try {
      const padChebyshev = new Tone.Chebyshev({ order: 20 }).connect(n.padGain);
      this._musicSynths.push(padChebyshev);

      const padDist = new Tone.Distortion({ distortion: 0.7 }).connect(padChebyshev);
      this._musicSynths.push(padDist);

      const padSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
          volume: -14,
        },
      }).connect(padDist);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '1m', time, 0.5);
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Arp: Square wave → BitCrusher for lo-fi digital crunch
    try {
      const bitCrusher = new Tone.BitCrusher({ bits: 6 }).connect(n.arpGain);
      this._musicSynths.push(bitCrusher);

      const arpSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.15, release: 0.15 },
        volume: -12,
      }).connect(bitCrusher);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        for (let s = 0; s < 16; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s, 0), letter + '4']);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        arpSynth.triggerAttackRelease(note, '32n', time, 0.7);
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Kick: Distorted MembraneSynth
    try {
      const kickDist = new Tone.Distortion({ distortion: 0.5 }).connect(n.beatGain);
      this._musicSynths.push(kickDist);

      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.03, octaves: 8,
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
        volume: -2,
      }).connect(kickDist);
      this._musicSynths.push(kick);

      // Hat: Harsh 16ths, mechanical (no swing, no velocity variation)
      const hat = new Tone.NoiseSynth({
        volume: -8,
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const snare = new Tone.NoiseSynth({
        volume: -6, noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
      }).connect(n.beatGain);
      this._musicSynths.push(snare);

      const beatEvents = [];
      [0, 4, 8, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 'k' }));
      [4, 12].forEach(p => beatEvents.push({ time: this._getSwungTime(p, 0), type: 's' }));
      for (let i = 0; i < 16; i++) {
        beatEvents.push({ time: this._getSwungTime(i, 0), type: 'h' });
      }
      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else if (type === 's') snare.triggerAttackRelease('16n', time);
        else hat.triggerAttackRelease('32n', time);
      }, beatEvents);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Bass: Square MonoSynth → Distortion, aggressive patterns
    try {
      const bassDist = new Tone.Distortion({ distortion: 0.6 }).connect(n.bassGain);
      this._musicSynths.push(bassDist);

      // Configure shared bass filter for hard techno
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 1200, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 4, 0.1);
      // Reconnect shared bass filter to distortion for this genre
      n.bassFilter.disconnect();
      n.bassFilter.connect(bassDist);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        filter: { type: 'lowpass', frequency: 1200, Q: 4 },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.2, release: 0.15 },
        volume: -6,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      const bassPattern = preset.bassPattern || [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        for (let s = 0; s < 16; s++) {
          if (bassPattern[s]) {
            bassEvents.push([ci * barLen + this._getSwungTime(s, 0), root + '2']);
          }
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '16n', time, 0.8);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  /** Fallback generic builder for unknown presets */
  _buildGeneric(preset) {
    const n = this._nodes;
    const chordNames = this._getChords(preset);
    const barLen = Tone.Time('1m').toSeconds();
    const swing = this._swing || preset.swing || 0;

    // Basic pad
    try {
      // Configure shared reverb for generic
      n.sharedReverb.decay = preset.effects.padReverb || 3;
      n.sharedReverb.wet.rampTo(0.3, 0.1);

      const padSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: preset.padOsc || 'sine' },
          envelope: {
            attack: preset.padAttack, decay: preset.padDecay,
            sustain: preset.padSustain || 0.6, release: preset.padRelease,
          },
          volume: -6,
        },
      }).connect(n.sharedReverb);
      this._musicSynths.push(padSynth);

      const padPart = new Tone.Part((time, chord) => {
        const notes = this._getChordNotes(chord);
        if (!notes) return;
        padSynth.triggerAttackRelease(notes, '1m', time);
      }, chordNames.map((c, i) => [i * barLen, c]));
      padPart.loop = true;
      padPart.loopEnd = chordNames.length * barLen;
      padPart.start(0);
      this._musicParts.push(padPart);
    } catch (_) {}

    // Basic arp
    try {
      // Configure shared arp delay for generic
      n.sharedArpDelay.delayTime.rampTo(Tone.Time(preset.effects.arpDelay || '16n').toSeconds(), 0.1);
      n.sharedArpDelay.feedback.rampTo(preset.effects.arpDelayFeedback || 0.3, 0.1);
      n.sharedArpDelay.wet.rampTo(0.25, 0.1);

      const arpSynth = new Tone.Synth({
        oscillator: { type: preset.arpOsc || 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        volume: -10,
      }).connect(n.sharedArpDelay);
      this._musicSynths.push(arpSynth);

      const arpEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        for (let s = 0; s < 8; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          arpEvents.push([ci * barLen + this._getSwungTime(s * 2, swing), letter + (preset.arpOctave || 5)]);
        }
      });
      const arpPart = new Tone.Part((time, note) => {
        arpSynth.triggerAttackRelease(note, '16n', time);
      }, arpEvents);
      arpPart.loop = true;
      arpPart.loopEnd = chordNames.length * barLen;
      arpPart.start(0);
      this._musicParts.push(arpPart);
    } catch (_) {}

    // Basic beat
    try {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 6,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -4,
      }).connect(n.beatGain);
      this._musicSynths.push(kick);

      const hat = new Tone.NoiseSynth({
        volume: -10,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      }).connect(n.beatGain);
      this._musicSynths.push(hat);

      const beatPart = new Tone.Part((time, type) => {
        if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
        else hat.triggerAttackRelease('16n', time);
      }, [
        { time: 0, type: 'k' },
        { time: this._getSwungTime(4, swing), type: 'k' },
        { time: this._getSwungTime(8, swing), type: 'k' },
        { time: this._getSwungTime(12, swing), type: 'k' },
        { time: this._getSwungTime(2, swing), type: 'h' },
        { time: this._getSwungTime(6, swing), type: 'h' },
        { time: this._getSwungTime(10, swing), type: 'h' },
        { time: this._getSwungTime(14, swing), type: 'h' },
      ]);
      beatPart.loop = true;
      beatPart.loopEnd = Tone.Time('1m').toSeconds();
      beatPart.start(0);
      this._musicParts.push(beatPart);
    } catch (_) {}

    // Basic bass
    try {
      // Configure shared bass filter for generic
      n.bassFilter.frequency.rampTo(this._bassFilterCutoff || 400, 0.1);
      n.bassFilter.Q.rampTo(this._bassFilterQ || 1, 0.1);

      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: preset.bassOsc || 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.5 },
        volume: -6,
      }).connect(n.bassFilter);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = this._getChordNotes(chordName);
        if (!notes) return;
        const root = notes[0].replace(/[0-9]/g, '');
        bassEvents.push([ci * barLen, root + '2']);
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '4n', time);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    } catch (_) {}
  }

  _stopMusic() {
    const n = this._nodes;
    n.musicGain.gain.rampTo(0, 0.1);
    n.arpGain.gain.rampTo(0, 0.05);
    n.padGain.gain.rampTo(0, 0.05);
    n.beatGain.gain.rampTo(0, 0.05);
    n.bassGain.gain.rampTo(0, 0.05);
    // Don't teardown immediately - let fade happen
    setTimeout(() => this._teardownMusic(), 200);
  }

  /** @param {boolean} enabled */
  setMusicEnabled(enabled) {
    this._musicEnabled = enabled;
    if (!this.playing) return;
    enabled ? this._startMusic() : this._stopMusic();
  }

  /** @param {string} preset */
  setMusicPreset(preset) {
    if (!MUSIC_PRESETS[preset]) return;
    this._musicPreset = preset;
    const p = MUSIC_PRESETS[preset];
    if (this.initialized) Tone.Transport.bpm.rampTo(p.bpm, 0.5);
    this._swing = p.swing || 0;
    this._bassFilterCutoff = p.bassFilterFreq || 400;
    this._bassFilterQ = p.bassFilterQ || 1;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** @param {number} v 0-1 */
  setArpVolume(v) {
    this._arpVolume = v;
    if (this.playing) this._nodes.arpGain.gain.rampTo(v, RAMP);
  }

  /** @param {number} v 0-1 */
  setPadVolume(v) {
    this._padVolume = v;
    if (this.playing) this._nodes.padGain.gain.rampTo(v, RAMP);
  }

  /** @param {number} v 0-1 */
  setBeatVolume(v) {
    this._beatVolume = v;
    if (this.playing) this._nodes.beatGain.gain.rampTo(v, RAMP);
  }

  /** Set BPM directly (user control). @param {number} bpm */
  setBPM(bpm) {
    if (this.initialized) Tone.Transport.bpm.rampTo(bpm, 0.5);
  }

  /** @returns {number} Current BPM */
  getBPM() {
    return this.initialized ? Tone.Transport.bpm.value : 128;
  }

  /** Set swing amount (0-0.3). @param {number} amount */
  setSwing(amount) {
    this._swing = amount;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** Set bass filter cutoff (200-5000 Hz). @param {number} freq */
  setBassFilterCutoff(freq) {
    this._bassFilterCutoff = freq;
    if (this._nodes.bassFilter) {
      this._nodes.bassFilter.frequency.rampTo(freq, RAMP);
    }
  }

  /** Set bass filter resonance (0-20). @param {number} q */
  setBassFilterResonance(q) {
    this._bassFilterQ = q;
    if (this._nodes.bassFilter) {
      this._nodes.bassFilter.Q.rampTo(q, RAMP);
    }
  }

  // ───────── SOUND DESIGN ─────────

  /** Set reverb wet amount (0-1). @param {number} v */
  setReverbMix(v) {
    this._reverbMix = v;
    if (this._liveReverbs) {
      this._liveReverbs.forEach(r => { try { r.wet.rampTo(v, RAMP); } catch (_) {} });
    }
  }

  /** Set delay feedback amount (0-1). @param {number} v */
  setDelayMix(v) {
    this._delayMix = v;
    if (this._liveDelays) {
      this._liveDelays.forEach(d => { try { d.feedback.rampTo(v * 0.8, RAMP); } catch (_) {} });
    }
  }

  /** Set note density / probability multiplier (0-1). @param {number} v */
  setDensity(v) {
    this._density = v;
  }

  /** Set pad attack time (0-1, maps to 0.01-5s). @param {number} v */
  setPadAttack(v) {
    this._padAttack = v;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** Set arp pattern. @param {string} pattern - up, down, up-down, random */
  setArpPattern(pattern) {
    this._arpPattern = pattern;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** @param {number} semitones 0-11 */
  setKeyTranspose(semitones) {
    this._keyTranspose = semitones;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** @param {string} type progression template name or 'default' */
  setProgression(type) {
    this._progressionType = type;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** @param {boolean} enabled */
  setMelodyEnabled(enabled) {
    this._melodyEnabled = enabled;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  /** @param {number} v 0-1 */
  setMelodyVolume(v) {
    this._melodyVolume = v;
    if (this._nodes.melodyGain) this._nodes.melodyGain.gain.rampTo(v, RAMP);
  }

  /** @param {string} style generative, call-response, ambient */
  setMelodyStyle(style) {
    this._melodyStyle = style;
    if (this._musicEnabled && this.playing) this._startMusic();
  }

  // ───────── MASTER ─────────

  /** @param {number} v 0-1 */
  setMasterVolume(v) {
    this._masterVolume = v;
    if (this.initialized) this._masterGain.gain.rampTo(v, RAMP);
  }

  // ───────── VISUALIZER ─────────

  /** @returns {Float32Array} FFT frequency data */
  getFrequencyData() {
    return this.fft ? this.fft.getValue() : new Float32Array(64);
  }

  /** @returns {Float32Array} Waveform data */
  getWaveformData() {
    return this.waveform ? this.waveform.getValue() : new Float32Array(256);
  }

  // ───────── PRESETS ─────────

  /** @returns {Array<{name:string, label:string, description:string}>} */
  getPresets() {
    return [
      { name: 'deep-work', label: 'Deep Work', description: 'Beta binaural beats with brown noise for intense focus' },
      { name: 'creative', label: 'Creative Flow', description: 'Alpha beats with rain and soft ambient music' },
      { name: 'study', label: 'Study Session', description: 'Beta beats with cafe ambience and lofi music' },
      { name: 'meditation', label: 'Meditation', description: 'Theta beats with ocean waves and drone' },
      { name: 'energy', label: 'Energy Boost', description: 'Gamma beats with synthwave music' },
    ];
  }

  /** Apply a focus mode preset — sets neural & soundscape only; music is user's choice. */
  applyPreset(name) {
    // Reset neural & soundscape layers only — leave music untouched
    this.setBinauralEnabled(false);
    this.setNoiseEnabled(false);
    this.setDroneEnabled(false);
    this.setNatureEnabled(false);

    switch (name) {
      case 'deep-work':
        this.setBinauralFrequency(18);
        this.setBinauralVolume(0.5);
        this.setBinauralEnabled(true);
        this.setBrownVolume(0.4);
        this.setNoiseEnabled(true);
        break;
      case 'creative':
        this.setBinauralFrequency(10);
        this.setBinauralVolume(0.4);
        this.setBinauralEnabled(true);
        this.setNatureType('rain');
        this.setNatureVolume(0.4);
        this.setNatureEnabled(true);
        break;
      case 'study':
        this.setBinauralFrequency(18);
        this.setBinauralVolume(0.3);
        this.setBinauralEnabled(true);
        this.setNatureType('cafe');
        this.setNatureVolume(0.3);
        this.setNatureEnabled(true);
        break;
      case 'meditation':
        this.setBinauralFrequency(6);
        this.setBinauralVolume(0.5);
        this.setBinauralEnabled(true);
        this.setNatureType('ocean');
        this.setNatureVolume(0.5);
        this.setNatureEnabled(true);
        this.setDroneVolume(0.3);
        this.setDroneEnabled(true);
        break;
      case 'energy':
        this.setBinauralFrequency(40);
        this.setBinauralVolume(0.4);
        this.setBinauralEnabled(true);
        break;
    }
  }

  /** Neuroscience-backed music suggestions per focus mode */
  static MUSIC_SUGGESTIONS = {
    'deep-work': {
      tip: 'Research shows repetitive, low-complexity music at 50-80 BPM supports sustained attention (Gonzalez & Aiello, 2019).',
      synth: ['minimal', 'dubtechno', 'ambienttechno'],
      trackGenres: ['ambient', 'lofi']
    },
    'creative': {
      tip: 'Moderate ambient noise (~70dB) boosts abstract thinking. Alpha-range music with moderate novelty works best (Mehta et al., 2012).',
      synth: ['ambienttechno', 'progressive', 'dubtechno'],
      trackGenres: ['ambient', 'lofi']
    },
    'study': {
      tip: 'Familiar, lyric-free music reduces cognitive load during learning. Lo-fi and cafe sounds are backed by research (Perham & Currie, 2014).',
      synth: ['deephouse', 'minimal'],
      trackGenres: ['lofi', 'ambient']
    },
    'meditation': {
      tip: 'Slow tempo (40-60 BPM) with minimal harmonic movement activates the parasympathetic nervous system.',
      synth: ['ambienttechno', 'dubtechno'],
      trackGenres: ['ambient']
    },
    'energy': {
      tip: 'Fast-tempo music (120-150 BPM) increases arousal, heart rate, and dopamine for high-intensity tasks (Karageorghis et al., 2009).',
      synth: ['hardtechno', 'detroit', 'trance', 'dnb'],
      trackGenres: ['techno', 'edm']
    }
  };

  // ───────── TRACK PLAYER (Pre-recorded music) ─────────

  /** Available pre-recorded tracks */
  static TRACKS = [
    { id: 'techno-deep-ambience',   name: 'Deep Techno Ambience',  genre: 'techno',  file: 'audio/tracks/techno-deep-ambience.mp3' },
    { id: 'techno-minimal-01',      name: 'Minimal Techno',        genre: 'techno',  file: 'audio/tracks/techno-minimal-01.mp3' },
    { id: 'techno-minimal-emotion', name: 'Minimal Emotion',       genre: 'techno',  file: 'audio/tracks/techno-minimal-emotion.mp3' },
    { id: 'techno-dub-groove',      name: 'Dub Techno Groove',     genre: 'techno',  file: 'audio/tracks/techno-dub-groove.mp3' },
    { id: 'techno-machine-drum',    name: 'Machine Drum Vibes',    genre: 'techno',  file: 'audio/tracks/techno-machine-drum.mp3' },
    { id: 'lofi-sweet-september',   name: 'Sweet September',       genre: 'lofi',    file: 'audio/tracks/lofi-sweet-september.mp3' },
    { id: 'lofi-sleepy-cat',        name: 'Sleepy Cat',            genre: 'lofi',    file: 'audio/tracks/lofi-sleepy-cat.mp3' },
    { id: 'ambient-rest-now',       name: 'Rest Now',              genre: 'ambient',  file: 'audio/tracks/ambient-rest-now.mp3' },
    { id: 'ambient-voxscape',       name: 'Voxscape',              genre: 'ambient',  file: 'audio/tracks/ambient-voxscape.mp3' },
    { id: 'ambient-opalescent',     name: 'Opalescent',            genre: 'ambient',  file: 'audio/tracks/ambient-opalescent.mp3' },
    { id: 'edm-atoms-in-peace',     name: 'Atoms in Peace',        genre: 'edm',     file: 'audio/tracks/edm-atoms-in-peace.mp3' },
    { id: 'edm-kodama-night',       name: 'Kodama Night Town',     genre: 'edm',     file: 'audio/tracks/edm-kodama-night.mp3' },
  ];

  _buildTrackPlayer() {
    this._trackPlayerGain = new Tone.Gain(0).connect(this._masterGain);
    this._trackPlayer = null;
    this._trackEnabled = false;
    this._trackVolume = 0.6;
    this._currentTrackId = null;
    // Playlist state
    this._playlist = [...AudioEngine.TRACKS]; // working playlist (can include custom tracks)
    this._playlistOrder = this._playlist.map((_, i) => i); // index order (shuffled or sequential)
    this._playlistPos = -1; // current position in _playlistOrder
    this._loopMode = 'none'; // 'none' | 'all' | 'one'
    this._shuffled = false;
    this._customTracks = []; // user-added tracks via file input
  }

  /** Load and play a track by id. Advances to next track on end (unless looping). */
  async playTrack(trackId) {
    if (!this.initialized) return;
    const track = this._playlist.find(t => t.id === trackId);
    if (!track) return;

    // Stop current track if any
    this._stopTrack();

    this._currentTrackId = trackId;
    this._trackEnabled = true;

    // Update playlist position
    const idx = this._playlist.indexOf(track);
    this._playlistPos = this._playlistOrder.indexOf(idx);
    if (this._playlistPos === -1) this._playlistPos = 0;

    const shouldLoop = (this._loopMode === 'one');

    try {
      this._trackPlayer = new Tone.Player({
        url: track.file,
        loop: shouldLoop,
        fadeIn: 0.5,
        fadeOut: 0.5,
        onload: () => {
          if (this._currentTrackId === trackId && this._trackEnabled) {
            this._trackPlayerGain.gain.rampTo(this._trackVolume, 0.3);
            this._trackPlayer.start();
            if (window._renderTrackList) window._renderTrackList();
            // Auto-advance when track ends (if not looping single)
            if (!shouldLoop && this._trackPlayer.buffer && this._trackPlayer.buffer.duration) {
              const dur = this._trackPlayer.buffer.duration;
              this._trackEndTimer = setTimeout(() => {
                if (this._currentTrackId === trackId) this.playNext();
              }, dur * 1000 + 200);
            }
          }
        },
        onerror: () => {
          console.warn('Failed to load track:', track.file);
        }
      }).connect(this._trackPlayerGain);
    } catch (e) {
      console.warn('Track player error:', e);
    }
  }

  _stopTrack() {
    if (this._trackEndTimer) { clearTimeout(this._trackEndTimer); this._trackEndTimer = null; }
    if (this._trackPlayer) {
      this._trackPlayerGain.gain.rampTo(0, 0.3);
      const player = this._trackPlayer;
      setTimeout(() => {
        try { player.stop(); player.dispose(); } catch (_) {}
      }, 350);
      this._trackPlayer = null;
    }
    this._trackEnabled = false;
    this._currentTrackId = null;
  }

  /** Stop the track player */
  stopTrack() {
    this._stopTrack();
  }

  /** Set track player volume (0-1) */
  setTrackVolume(v) {
    this._trackVolume = v;
    if (this._trackEnabled && this.initialized) {
      this._trackPlayerGain.gain.rampTo(v, RAMP);
    }
  }

  /** @returns {string|null} Currently playing track id */
  getCurrentTrackId() {
    return this._currentTrackId;
  }

  /** @returns {boolean} Whether a track is currently playing */
  isTrackPlaying() {
    return this._trackEnabled && this._trackPlayer !== null;
  }

  // ───────── PLAYLIST MANAGEMENT ─────────

  /** Get the full playlist (built-in + custom) */
  getPlaylist() { return this._playlist; }

  /** Get current loop mode */
  getLoopMode() { return this._loopMode; }

  /** Cycle loop mode: none → all → one → none */
  cycleLoopMode() {
    const modes = ['none', 'all', 'one'];
    this._loopMode = modes[(modes.indexOf(this._loopMode) + 1) % 3];
    // Update current player loop behavior
    if (this._trackPlayer) {
      this._trackPlayer.loop = (this._loopMode === 'one');
    }
    return this._loopMode;
  }

  /** @returns {boolean} shuffle state */
  isShuffled() { return this._shuffled; }

  /** Toggle shuffle on/off */
  toggleShuffle() {
    this._shuffled = !this._shuffled;
    this._rebuildPlaylistOrder();
    return this._shuffled;
  }

  _rebuildPlaylistOrder() {
    const currentId = this._currentTrackId;
    if (this._shuffled) {
      // Fisher-Yates shuffle
      this._playlistOrder = this._playlist.map((_, i) => i);
      for (let i = this._playlistOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._playlistOrder[i], this._playlistOrder[j]] = [this._playlistOrder[j], this._playlistOrder[i]];
      }
    } else {
      this._playlistOrder = this._playlist.map((_, i) => i);
    }
    // Restore position to current track
    if (currentId) {
      const idx = this._playlist.findIndex(t => t.id === currentId);
      this._playlistPos = this._playlistOrder.indexOf(idx);
    }
  }

  /** Play next track in playlist */
  playNext() {
    if (this._playlist.length === 0) return;
    if (this._loopMode === 'one' && this._currentTrackId) {
      // Restart same track
      this.playTrack(this._currentTrackId);
      return;
    }
    this._playlistPos++;
    if (this._playlistPos >= this._playlistOrder.length) {
      if (this._loopMode === 'all') {
        this._playlistPos = 0;
      } else {
        this._stopTrack();
        if (window._renderTrackList) window._renderTrackList();
        return;
      }
    }
    const track = this._playlist[this._playlistOrder[this._playlistPos]];
    if (track) this.playTrack(track.id);
  }

  /** Play previous track in playlist */
  playPrev() {
    if (this._playlist.length === 0) return;
    this._playlistPos--;
    if (this._playlistPos < 0) {
      this._playlistPos = this._loopMode === 'all' ? this._playlistOrder.length - 1 : 0;
    }
    const track = this._playlist[this._playlistOrder[this._playlistPos]];
    if (track) this.playTrack(track.id);
  }

  /** Add a custom track from a File object (user upload). Returns the track metadata. */
  addCustomTrack(file, genre) {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const track = { id, name, genre: genre || 'custom', file: url, isCustom: true };
    this._customTracks.push(track);
    this._playlist.push(track);
    this._rebuildPlaylistOrder();
    return track;
  }

  /** Restore a custom track from a pre-built blob URL (e.g. from IndexedDB). */
  restoreCustomTrack(id, name, genre, url) {
    const track = { id, name, genre: genre || 'custom', file: url, isCustom: true };
    this._customTracks.push(track);
    this._playlist.push(track);
    this._rebuildPlaylistOrder();
    return track;
  }

  /** Remove a custom track by id */
  removeCustomTrack(trackId) {
    if (this._currentTrackId === trackId) this._stopTrack();
    this._customTracks = this._customTracks.filter(t => t.id !== trackId);
    this._playlist = this._playlist.filter(t => t.id !== trackId);
    this._rebuildPlaylistOrder();
  }

  /** Move a track in the playlist */
  moveTrack(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [item] = this._playlist.splice(fromIndex, 1);
    this._playlist.splice(toIndex, 0, item);
    this._rebuildPlaylistOrder();
  }

  // ───────── DISPOSE ─────────

  /** Clean up all audio nodes and release resources. */
  dispose() {
    if (!this.initialized) return;
    this.playing = false;
    Tone.Transport.stop();
    Tone.Transport.cancel();

    this._teardownNatureType();
    this._teardownMusic();
    this._stopTrack();

    // Dispose all nodes
    const dispose = obj => { try { if (obj && obj.dispose) obj.dispose(); } catch (_) {} };
    Object.values(this._nodes).forEach(v => {
      if (Array.isArray(v)) v.forEach(dispose);
      else dispose(v);
    });
    dispose(this.fft);
    dispose(this.waveform);
    dispose(this._masterGain);
    dispose(this._limiter);

    this._nodes = {};
    this.initialized = false;
  }
}

window.AudioEngine = AudioEngine;
