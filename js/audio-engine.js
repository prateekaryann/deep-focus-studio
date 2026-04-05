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
};

const MUSIC_PRESETS = {
  ambient: {
    bpm: 75,
    chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
    oscType: 'sine',
    padAttack: 1.5, padRelease: 3, padDecay: 2,
    arpOsc: 'triangle', arpOctave: 4,
    beatVol: -20,
  },
  lofi: {
    bpm: 80,
    chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'],
    oscType: 'triangle',
    padAttack: 0.8, padRelease: 2, padDecay: 1.5,
    arpOsc: 'sine', arpOctave: 4,
    beatVol: -12,
  },
  deep: {
    bpm: 120,
    chords: ['Am', 'Fm', 'Dm', 'Em'],
    oscType: 'sine',
    padAttack: 0.5, padRelease: 2, padDecay: 1,
    arpOsc: 'triangle', arpOctave: 3,
    beatVol: -8,
  },
  synthwave: {
    bpm: 110,
    chords: ['Em', 'C', 'G', 'D'],
    oscType: 'sawtooth',
    padAttack: 0.3, padRelease: 1.5, padDecay: 1,
    arpOsc: 'sawtooth', arpOctave: 4,
    beatVol: -10,
    filterSweep: true,
  },
  piano: {
    bpm: 70,
    chords: ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7'],
    oscType: 'triangle',
    padAttack: 0.01, padRelease: 0.8, padDecay: 0.1,
    arpOsc: 'triangle', arpOctave: 5,
    beatVol: -30,
  },
  jazz: {
    bpm: 85,
    chords: ['Dm9', 'G13', 'Cmaj9', 'A7b9'],
    oscType: 'sine',
    padAttack: 0.4, padRelease: 2.5, padDecay: 1.5,
    arpOsc: 'sine', arpOctave: 4,
    beatVol: -14,
    walkingBass: true,
  },
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
    this._musicPreset = 'ambient';
    this._arpVolume = 0.3;
    this._padVolume = 0.4;
    this._beatVolume = 0.3;
    this._masterVolume = 0.7;

    // Audio nodes (created in init)
    this._nodes = {};
    this._loops = [];
    this._scheduleIds = [];
  }

  // ───────── INIT ─────────

  /** Initialize the Tone.js audio context and build the signal graph. */
  async init() {
    if (this.initialized) return;
    await Tone.start();

    // Analysers
    this.fft = new Tone.FFT(64);
    this.waveform = new Tone.Waveform(256);

    // Master gain
    this._masterGain = new Tone.Gain(0).toDestination();
    this._masterGain.connect(this.fft);
    this._masterGain.connect(this.waveform);
    this._masterGain.gain.rampTo(this._masterVolume, RAMP);

    this._buildBinaural();
    this._buildNoise();
    this._buildDrone();
    this._buildNature();
    this._buildMusic();

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
    n.binOscL.frequency.value = this._binauralBaseFreq;
    n.binOscR.frequency.value = this._binauralBaseFreq + this._binauralFreq;
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
    this._nodes.droneOscs.forEach(o => o.start());
    this._nodes.droneGain.gain.rampTo(this._droneVolume, RAMP);
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
    this._musicParts = [];
    this._musicSynths = [];
  }

  /** Dispose current music synths and parts, then rebuild for the active preset. */
  _teardownMusic() {
    this._musicParts.forEach(p => { try { p.stop(); p.dispose(); } catch (_) {} });
    this._musicParts = [];
    this._musicSynths.forEach(s => { try { if (s.stop) s.stop(); s.dispose(); } catch (_) {} });
    this._musicSynths = [];
  }

  _startMusic() {
    this._teardownMusic();
    const preset = MUSIC_PRESETS[this._musicPreset];
    if (!preset) return;

    Tone.Transport.bpm.rampTo(preset.bpm, RAMP);

    const n = this._nodes;
    n.arpGain.gain.rampTo(this._arpVolume, RAMP);
    n.padGain.gain.rampTo(this._padVolume, RAMP);
    n.beatGain.gain.rampTo(this._beatVolume, RAMP);
    n.musicGain.gain.rampTo(1, RAMP);

    // --- Pad synth ---
    const padSynth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 4,
      voice: Tone.Synth,
      options: {
        oscillator: { type: preset.oscType },
        envelope: {
          attack: preset.padAttack,
          decay: preset.padDecay,
          sustain: 0.6,
          release: preset.padRelease,
        },
        volume: -6,
      },
    });

    // Optional filter sweep for synthwave
    if (preset.filterSweep) {
      const autoFilter = new Tone.AutoFilter('2m', 200, 4000).connect(n.padGain);
      autoFilter.start();
      padSynth.connect(autoFilter);
      this._musicSynths.push(autoFilter);
    } else {
      padSynth.connect(n.padGain);
    }
    this._musicSynths.push(padSynth);

    // Pad part: plays full chord every bar
    const chordNames = preset.chords;
    const padPart = new Tone.Part((time, chord) => {
      const notes = CHORDS[chord];
      if (!notes) return;
      padSynth.triggerAttackRelease(notes, '1m', time);
    }, chordNames.map((c, i) => [i * Tone.Time('1m').toSeconds(), c]));
    padPart.loop = true;
    padPart.loopEnd = chordNames.length * Tone.Time('1m').toSeconds();
    padPart.start(0);
    this._musicParts.push(padPart);

    // --- Arp synth ---
    const arpSynth = new Tone.Synth({
      oscillator: { type: preset.arpOsc },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -10,
    }).connect(n.arpGain);
    this._musicSynths.push(arpSynth);

    // Arp pattern: arpeggiate each chord's notes across the bar
    const arpEvents = [];
    const barLen = Tone.Time('1m').toSeconds();
    const stepLen = Tone.Time('8n').toSeconds();
    chordNames.forEach((chordName, ci) => {
      const notes = CHORDS[chordName];
      if (!notes) return;
      for (let s = 0; s < 8; s++) {
        const note = notes[s % notes.length];
        // Shift arp to requested octave
        const letter = note.replace(/[0-9]/g, '');
        const arpNote = letter + preset.arpOctave;
        arpEvents.push([ci * barLen + s * stepLen, arpNote]);
      }
    });
    const arpPart = new Tone.Part((time, note) => {
      arpSynth.triggerAttackRelease(note, '16n', time);
    }, arpEvents);
    arpPart.loop = true;
    arpPart.loopEnd = chordNames.length * barLen;
    arpPart.start(0);
    this._musicParts.push(arpPart);

    // --- Beat (kick + hat) ---
    const kick = new Tone.MembraneSynth({ volume: preset.beatVol }).connect(n.beatGain);
    const hat = new Tone.NoiseSynth({
      volume: preset.beatVol - 6,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    }).connect(n.beatGain);
    this._musicSynths.push(kick, hat);

    const beatPart = new Tone.Part((time, type) => {
      if (type === 'k') kick.triggerAttackRelease('C1', '8n', time);
      else hat.triggerAttackRelease('16n', time);
    }, [
      [0, 'k'], ['0:1', 'h'], ['0:2', 'k'], ['0:2:2', 'h'],
      ['0:3', 'h'], ['0:3:2', 'h'],
    ]);
    beatPart.loop = true;
    beatPart.loopEnd = '1m';
    beatPart.start(0);
    this._musicParts.push(beatPart);

    // --- Walking bass for jazz ---
    if (preset.walkingBass) {
      const bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.5 },
        volume: -8,
      }).connect(n.padGain);
      this._musicSynths.push(bassSynth);

      const bassEvents = [];
      chordNames.forEach((chordName, ci) => {
        const notes = CHORDS[chordName];
        if (!notes) return;
        for (let s = 0; s < 4; s++) {
          const note = notes[s % notes.length];
          const letter = note.replace(/[0-9]/g, '');
          bassEvents.push([ci * barLen + s * stepLen * 2, letter + '2']);
        }
      });
      const bassPart = new Tone.Part((time, note) => {
        bassSynth.triggerAttackRelease(note, '4n', time);
      }, bassEvents);
      bassPart.loop = true;
      bassPart.loopEnd = chordNames.length * barLen;
      bassPart.start(0);
      this._musicParts.push(bassPart);
    }
  }

  _stopMusic() {
    this._nodes.musicGain.gain.rampTo(0, RAMP);
    this._teardownMusic();
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

  /** Apply a full audio configuration preset. @param {string} name */
  applyPreset(name) {
    // Disable everything first
    this.setBinauralEnabled(false);
    this.setNoiseEnabled(false);
    this.setDroneEnabled(false);
    this.setNatureEnabled(false);
    this.setMusicEnabled(false);

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
        this.setMusicPreset('ambient');
        this.setPadVolume(0.2);
        this.setArpVolume(0.15);
        this.setBeatVolume(0);
        this.setMusicEnabled(true);
        break;
      case 'study':
        this.setBinauralFrequency(18);
        this.setBinauralVolume(0.3);
        this.setBinauralEnabled(true);
        this.setNatureType('cafe');
        this.setNatureVolume(0.3);
        this.setNatureEnabled(true);
        this.setMusicPreset('lofi');
        this.setPadVolume(0.25);
        this.setArpVolume(0.2);
        this.setBeatVolume(0.15);
        this.setMusicEnabled(true);
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
        this.setMusicPreset('synthwave');
        this.setPadVolume(0.4);
        this.setArpVolume(0.35);
        this.setBeatVolume(0.3);
        this.setMusicEnabled(true);
        break;
    }
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

    // Dispose all nodes
    const dispose = obj => { try { if (obj && obj.dispose) obj.dispose(); } catch (_) {} };
    Object.values(this._nodes).forEach(v => {
      if (Array.isArray(v)) v.forEach(dispose);
      else dispose(v);
    });
    dispose(this.fft);
    dispose(this.waveform);
    dispose(this._masterGain);

    this._nodes = {};
    this.initialized = false;
  }
}

window.AudioEngine = AudioEngine;
