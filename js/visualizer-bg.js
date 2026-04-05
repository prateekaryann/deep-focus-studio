/**
 * VisualizerBG - Enhanced audio-reactive Three.js particle visualizer
 * Features: beat-reactive colors, morphing formations, random animations,
 * central geometry shape-shifting, particle streaks, and color cycling.
 */
(function () {
  'use strict';

  const THEMES = {
    theta:   { primary: new Float32Array([0.545, 0.361, 0.965]), secondary: new Float32Array([0.427, 0.157, 0.851]) },
    alpha:   { primary: new Float32Array([0.388, 0.400, 0.945]), secondary: new Float32Array([0.310, 0.275, 0.898]) },
    beta:    { primary: new Float32Array([0.078, 0.722, 0.651]), secondary: new Float32Array([0.051, 0.580, 0.533]) },
    gamma:   { primary: new Float32Array([0.133, 0.773, 0.369]), secondary: new Float32Array([0.086, 0.639, 0.290]) },
  };

  // Color palettes that cycle on beat - each genre gets reactive accent colors
  const BEAT_COLORS = {
    warm:    [[1.0, 0.4, 0.1], [1.0, 0.2, 0.5], [0.9, 0.6, 0.0]],
    cool:    [[0.2, 0.5, 1.0], [0.4, 0.2, 0.9], [0.1, 0.8, 0.9]],
    neon:    [[0.0, 1.0, 0.5], [1.0, 0.0, 0.8], [0.3, 0.0, 1.0]],
    fire:    [[1.0, 0.1, 0.0], [1.0, 0.5, 0.0], [1.0, 0.8, 0.1]],
    ice:     [[0.3, 0.7, 1.0], [0.6, 0.3, 1.0], [0.1, 0.9, 0.8]],
    psyche:  [[0.9, 0.1, 0.9], [0.1, 0.9, 0.3], [0.9, 0.9, 0.1]],
  };

  const GENRE_PROFILES = {
    ambienttechno: { speed: 0.3, displacement: 0.3, spread: 18, particleSize: 1.0, lineOpacity: 0.05, pulseStrength: 0.2, chaos: 0,    formation: 'sphere',  colorPalette: 'cool',  morphSpeed: 0.3,  shapeShift: false },
    dubtechno:     { speed: 0.4, displacement: 0.4, spread: 16, particleSize: 1.2, lineOpacity: 0.08, pulseStrength: 0.3, chaos: 0,    formation: 'sphere',  colorPalette: 'cool',  morphSpeed: 0.4,  shapeShift: false },
    minimal:       { speed: 0.5, displacement: 0.5, spread: 14, particleSize: 1.0, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.1,  formation: 'ring',    colorPalette: 'ice',   morphSpeed: 0.5,  shapeShift: true },
    detroit:       { speed: 0.6, displacement: 0.6, spread: 13, particleSize: 1.2, lineOpacity: 0.12, pulseStrength: 0.6, chaos: 0.1,  formation: 'ring',    colorPalette: 'warm',  morphSpeed: 0.6,  shapeShift: true },
    deephouse:     { speed: 0.5, displacement: 0.5, spread: 13, particleSize: 1.1, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.05, formation: 'ring',    colorPalette: 'warm',  morphSpeed: 0.5,  shapeShift: false },
    progressive:   { speed: 0.6, displacement: 0.7, spread: 14, particleSize: 1.3, lineOpacity: 0.12, pulseStrength: 0.7, chaos: 0.15, formation: 'spiral',  colorPalette: 'neon',  morphSpeed: 0.7,  shapeShift: true },
    trance:        { speed: 0.8, displacement: 0.9, spread: 15, particleSize: 1.5, lineOpacity: 0.15, pulseStrength: 0.9, chaos: 0.2,  formation: 'helix',   colorPalette: 'psyche',morphSpeed: 0.9,  shapeShift: true },
    acid:          { speed: 0.9, displacement: 1.0, spread: 12, particleSize: 1.4, lineOpacity: 0.15, pulseStrength: 1.0, chaos: 0.25, formation: 'galaxy',  colorPalette: 'neon',  morphSpeed: 1.0,  shapeShift: true },
    dnb:           { speed: 1.0, displacement: 1.2, spread: 14, particleSize: 1.5, lineOpacity: 0.18, pulseStrength: 1.2, chaos: 0.2,  formation: 'sphere',  colorPalette: 'fire',  morphSpeed: 1.1,  shapeShift: true },
    hardtechno:    { speed: 1.2, displacement: 1.5, spread: 11, particleSize: 1.8, lineOpacity: 0.2,  pulseStrength: 1.5, chaos: 0.4,  formation: 'cube',    colorPalette: 'fire',  morphSpeed: 1.3,  shapeShift: true },
  };
  const DEFAULT_PROFILE = { speed: 0.5, displacement: 0.5, spread: 14, particleSize: 1.0, lineOpacity: 0.1, pulseStrength: 0.5, chaos: 0.1, formation: 'sphere', colorPalette: 'cool', morphSpeed: 0.5, shapeShift: false };

  // All available formations for random cycling
  const ALL_FORMATIONS = ['sphere', 'ring', 'spiral', 'cube', 'helix', 'galaxy', 'torus', 'dna', 'explosion', 'vortex'];

  const VERT_SHADER = `
    attribute float aSize;
    attribute float aPhase;
    attribute float aActive;
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uSpeed;
    uniform float uDisplacement;
    uniform float uChaos;
    uniform float uPulseStrength;
    uniform float uBeatFlash;
    uniform float uMorphProgress;
    varying float vAlpha;
    varying float vActive;
    varying float vBeatFlash;
    varying float vDist;

    void main() {
      vec3 pos = position;
      vec3 dir = normalize(pos + vec3(0.0001));
      float t = uTime * uSpeed;

      // Displacement waves
      float wave = sin(pos.x * 1.5 + t) * cos(pos.y * 1.2 + t * 0.7);
      float wave2 = cos(pos.z * 0.8 + t * 1.3) * sin(pos.x * 0.6 - t * 0.5);
      float pulse = uBass * uPulseStrength;
      pos += dir * (wave * uDisplacement + pulse) * 1.5;

      // Secondary wave layer for more organic motion
      pos += dir * wave2 * uDisplacement * 0.4;

      // Chaos with more variation
      float chaosScale = uChaos * (0.5 + uBass);
      pos.x += sin(t * 3.0 + aPhase * 7.0) * chaosScale;
      pos.y += cos(t * 4.0 + aPhase * 5.0) * chaosScale;
      pos.z += sin(t * 2.5 + aPhase * 9.0) * chaosScale;

      // Beat-reactive explosion push
      pos += dir * uBeatFlash * 2.0 * aActive;

      // Ambient drift
      pos.x += sin(t * 0.2 + aPhase) * 0.3;
      pos.y += cos(t * 0.15 + aPhase * 1.3) * 0.3;
      pos.z += sin(t * 0.1 + aPhase * 0.7) * 0.15;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      // Size: bigger on beats
      float baseSize = aSize;
      float activeBoost = 1.0 + aActive * 2.5;
      float midsBoost = 1.0 + uMids * 0.4;
      float beatSizeBoost = 1.0 + uBeatFlash * 1.5;
      gl_PointSize = baseSize * activeBoost * midsBoost * beatSizeBoost * (80.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 16.0);

      gl_Position = projectionMatrix * mvPosition;

      float distFade = clamp(1.0 - length(mvPosition.xyz) / 70.0, 0.05, 1.0);
      vAlpha = (0.5 + aActive * 0.5) * distFade;
      vActive = aActive;
      vBeatFlash = uBeatFlash;
      vDist = length(pos) / 20.0;
    }
  `;

  const FRAG_SHADER = `
    precision highp float;
    varying float vAlpha;
    varying float vActive;
    varying float vBeatFlash;
    varying float vDist;
    uniform vec3 uColor;
    uniform vec3 uBeatColor;
    uniform float uHighs;
    uniform float uBeatFlash;
    uniform float uColorCycle;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);

      if (dist > 0.5) discard;

      // Sharp core with glow halo
      float core = 1.0 - smoothstep(0.0, 0.12, dist);
      float ring = smoothstep(0.5, 0.15, dist) * 0.5;
      float outerGlow = smoothstep(0.5, 0.3, dist) * 0.15 * vBeatFlash;
      float alpha = core + ring + outerGlow;

      float brightness = 0.6 + uHighs * 0.25 + vActive * 0.5;

      // Color mixing: base -> beat color on beats, with distance-based variation
      vec3 baseCol = uColor * brightness;
      vec3 beatCol = uBeatColor * (brightness + 0.3);

      // Blend toward beat color based on flash intensity and particle activity
      float beatMix = vBeatFlash * vActive * 0.8;
      vec3 col = mix(baseCol, beatCol, beatMix);

      // Add subtle rainbow shift based on distance from center
      float hueShift = vDist * uColorCycle * 0.3;
      col.r += sin(hueShift) * 0.08 * vActive;
      col.g += sin(hueShift + 2.094) * 0.08 * vActive;
      col.b += sin(hueShift + 4.189) * 0.08 * vActive;

      // Hot white core on strong beats
      col = mix(col, vec3(1.0), core * vBeatFlash * 0.4);

      gl_FragColor = vec4(col, alpha * vAlpha);
    }
  `;

  class VisualizerBG {
    constructor(containerEl) {
      if (typeof THREE === 'undefined') return;
      try {
        const c = document.createElement('canvas');
        if (!c.getContext('webgl') && !c.getContext('experimental-webgl')) return;
      } catch (e) { return; }

      this.container = containerEl;
      this.clock = new THREE.Clock();
      this.isMobile = window.innerWidth < 768;
      this.particleCount = this.isMobile ? 1000 : 2000;
      this.maxConnections = this.isMobile ? 150 : 300;
      this.connectionThreshold = 2.8;

      this.bass = 0; this.mids = 0; this.highs = 0;

      this.theme = THEMES.alpha;
      this.profile = Object.assign({}, DEFAULT_PROFILE);
      this.targetProfile = Object.assign({}, DEFAULT_PROFILE);
      this._profileLerpSpeed = 0.02;

      this._lastFreqData = null;
      this._lastWaveformData = null;

      // Beat detection
      this._prevBass = 0;
      this._beatFlash = 0;
      this._beatThreshold = 0.15;
      this._beatCooldown = 0;
      this._beatCount = 0;

      // Color cycling
      this._colorCycleTime = 0;
      this._currentBeatColorIdx = 0;
      this._beatColor = new Float32Array([1, 0.4, 0.1]);
      this._targetBeatColor = new Float32Array([1, 0.4, 0.1]);

      // Formation morphing
      this._formationTimer = 0;
      this._formationInterval = 25; // seconds between random formation changes
      this._currentFormationIdx = 0;

      // Central geometry morphing
      this._centralGeoTypes = ['icosahedron', 'octahedron', 'dodecahedron', 'torus'];
      this._centralGeoIdx = 0;
      this._centralMorphTimer = 0;
      this._centralMorphInterval = 35;

      // Camera dynamics
      this._cameraShake = 0;

      this._initScene();
      this._createParticles();
      this._createCentralGeo();
      this._createLines();
      this._createAuraRing();

      this._bound_animate = this._animate.bind(this);
      this._bound_resize = this.resize.bind(this);
      window.addEventListener('resize', this._bound_resize);
      this._rafId = requestAnimationFrame(this._bound_animate);
      this.ready = true;
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x06060b, 0.013);
      this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
      this.camera.position.z = 35;
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
      this._orbitAngle = 0;
    }

    _distributeParticle(i, formation, spread) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rand = (Math.random() - 0.5) * 2;
      const t = i / this.particleCount;

      switch (formation) {
        case 'sphere': {
          const r = spread * 0.5 + Math.random() * spread * 0.5;
          return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
        }
        case 'ring': {
          const r = spread * 0.7 + Math.random() * spread * 0.3;
          const y = (Math.random() - 0.5) * spread * 0.3;
          return [r * Math.cos(theta), y, r * Math.sin(theta)];
        }
        case 'spiral': {
          const spiralR = spread * 0.3 + t * spread * 0.7;
          const spiralTheta = t * Math.PI * 6;
          const y = (t - 0.5) * spread * 0.5;
          return [spiralR * Math.cos(spiralTheta) + rand * 2, y + rand * 2, spiralR * Math.sin(spiralTheta) + rand * 2];
        }
        case 'cube': {
          return [(Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread];
        }
        case 'helix': {
          const helixR = spread * 0.5;
          const helixTheta = t * Math.PI * 8;
          const y = (t - 0.5) * spread * 1.2;
          const strand = i % 2 === 0 ? 1 : -1;
          return [
            helixR * Math.cos(helixTheta) * strand + rand * 1.5,
            y + rand * 1.5,
            helixR * Math.sin(helixTheta) * strand + rand * 1.5
          ];
        }
        case 'galaxy': {
          const arm = Math.floor(Math.random() * 3);
          const armAngle = (arm / 3) * Math.PI * 2;
          const dist = Math.pow(Math.random(), 0.5) * spread;
          const spiralAngle = dist * 0.3 + armAngle;
          const y = (Math.random() - 0.5) * spread * 0.15 * (1 + dist / spread);
          return [
            dist * Math.cos(spiralAngle) + rand * 1.5,
            y,
            dist * Math.sin(spiralAngle) + rand * 1.5
          ];
        }
        case 'torus': {
          const R = spread * 0.6;
          const r = spread * 0.25;
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          return [
            (R + r * Math.cos(v)) * Math.cos(u) + rand * 0.8,
            r * Math.sin(v) + rand * 0.8,
            (R + r * Math.cos(v)) * Math.sin(u) + rand * 0.8
          ];
        }
        case 'dna': {
          const dnaR = spread * 0.35;
          const dnaTheta2 = t * Math.PI * 10;
          const y2 = (t - 0.5) * spread * 1.5;
          const strand2 = i % 3;
          if (strand2 < 2) {
            const s = strand2 === 0 ? 1 : -1;
            return [dnaR * Math.cos(dnaTheta2) * s, y2 + rand * 0.5, dnaR * Math.sin(dnaTheta2) * s];
          }
          // Cross bars
          const crossPhase = Math.floor(t * 20) / 20;
          const crossAngle = crossPhase * Math.PI * 10;
          const crossT = (t * 20) % 1;
          const cx = dnaR * Math.cos(crossAngle) * (1 - 2 * crossT);
          const cz = dnaR * Math.sin(crossAngle) * (1 - 2 * crossT);
          return [cx, (crossPhase - 0.5) * spread * 1.5, cz];
        }
        case 'explosion': {
          const r2 = spread * 0.3 + Math.pow(Math.random(), 0.3) * spread * 0.9;
          return [r2 * Math.sin(phi) * Math.cos(theta), r2 * Math.sin(phi) * Math.sin(theta), r2 * Math.cos(phi)];
        }
        case 'vortex': {
          const vR = spread * 0.2 + t * spread * 0.8;
          const vTheta = t * Math.PI * 12;
          const vy = (Math.random() - 0.5) * spread * 0.4 * (1 - t);
          return [vR * Math.cos(vTheta) + rand, vy, vR * Math.sin(vTheta) + rand];
        }
        default: {
          const r3 = spread * 0.5 + Math.random() * spread * 0.5;
          return [r3 * Math.sin(phi) * Math.cos(theta), r3 * Math.sin(phi) * Math.sin(theta), r3 * Math.cos(phi)];
        }
      }
    }

    _createParticles() {
      const count = this.particleCount;
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      const active = new Float32Array(count);

      const formation = this.profile.formation;
      const spread = this.profile.spread;

      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
        sizes[i] = 1.0 + Math.random() * 1.5;
        phases[i] = Math.random() * Math.PI * 2;
        active[i] = 0;
      }

      const freqBins = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
      }
      this._freqBins = freqBins;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geo.setAttribute('aActive', new THREE.BufferAttribute(active, 1));

      this._basePositions = new Float32Array(positions);
      this._targetPositions = new Float32Array(positions);
      this._activeAttr = geo.attributes.aActive;

      const col = this.theme.primary;
      this._particleUniforms = {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uHighs: { value: 0 },
        uSpeed: { value: this.profile.speed },
        uDisplacement: { value: this.profile.displacement },
        uChaos: { value: this.profile.chaos },
        uPulseStrength: { value: this.profile.pulseStrength },
        uColor: { value: new THREE.Vector3(col[0], col[1], col[2]) },
        uBeatColor: { value: new THREE.Vector3(1, 0.4, 0.1) },
        uBeatFlash: { value: 0 },
        uColorCycle: { value: 0 },
        uMorphProgress: { value: 0 },
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        uniforms: this._particleUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.particles = new THREE.Points(geo, mat);
      this.scene.add(this.particles);
    }

    _createCentralGeo() {
      const geo = new THREE.IcosahedronGeometry(3.0, 2);
      const col = this.theme.primary;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col[0], col[1], col[2]),
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      this.centralMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.centralMesh);
      this._centralBasePos = new Float32Array(geo.attributes.position.array);
    }

    _createAuraRing() {
      // Glowing ring around the central geometry that reacts to bass
      const ringGeo = new THREE.RingGeometry(4.5, 5.0, 64);
      const col = this.theme.primary;
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col[0], col[1], col[2]),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.auraRing = new THREE.Mesh(ringGeo, ringMat);
      this.scene.add(this.auraRing);
    }

    _morphCentralGeo() {
      this._centralGeoIdx = (this._centralGeoIdx + 1) % this._centralGeoTypes.length;
      const type = this._centralGeoTypes[this._centralGeoIdx];
      let newGeo;
      switch (type) {
        case 'octahedron': newGeo = new THREE.OctahedronGeometry(3.5, 2); break;
        case 'dodecahedron': newGeo = new THREE.DodecahedronGeometry(3.0, 1); break;
        case 'torus': newGeo = new THREE.TorusGeometry(3.0, 1.0, 8, 16); break;
        default: newGeo = new THREE.IcosahedronGeometry(3.0, 2); break;
      }

      this.centralMesh.geometry.dispose();
      this.centralMesh.geometry = newGeo;
      this._centralBasePos = new Float32Array(newGeo.attributes.position.array);
    }

    _createLines() {
      const maxSegs = this.maxConnections;
      const positions = new Float32Array(maxSegs * 6);
      const colors = new Float32Array(maxSegs * 6);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setDrawRange(0, 0);

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: this.profile.lineOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.lines = new THREE.LineSegments(geo, mat);
      this.scene.add(this.lines);
    }

    _updateConnections() {
      const pArr = this.particles.geometry.attributes.position.array;
      const count = this.particleCount;
      const threshold = this.connectionThreshold;
      const threshSq = threshold * threshold;

      const lPos = this.lines.geometry.attributes.position.array;
      const lCol = this.lines.geometry.attributes.color.array;

      // Mix base color with beat color
      const col = this.theme.primary;
      const bc = this._beatColor;
      const beatMix = this._beatFlash * 0.5;
      const r = col[0] * (1 - beatMix) + bc[0] * beatMix;
      const g = col[1] * (1 - beatMix) + bc[1] * beatMix;
      const b = col[2] * (1 - beatMix) + bc[2] * beatMix;

      let segCount = 0;
      const max = this.maxConnections;
      const step = this.isMobile ? 8 : 4;

      for (let i = 0; i < count && segCount < max; i += step) {
        const ix = pArr[i * 3], iy = pArr[i * 3 + 1], iz = pArr[i * 3 + 2];
        for (let j = i + step; j < count && segCount < max; j += step) {
          const dx = ix - pArr[j * 3];
          const dy = iy - pArr[j * 3 + 1];
          const dz = iz - pArr[j * 3 + 2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < threshSq) {
            const fade = 1.0 - Math.sqrt(dSq) / threshold;
            const opacity = fade * (0.15 + this._beatFlash * 0.2);
            const idx = segCount * 6;
            lPos[idx] = ix; lPos[idx + 1] = iy; lPos[idx + 2] = iz;
            lPos[idx + 3] = pArr[j * 3]; lPos[idx + 4] = pArr[j * 3 + 1]; lPos[idx + 5] = pArr[j * 3 + 2];
            lCol[idx] = r * opacity; lCol[idx + 1] = g * opacity; lCol[idx + 2] = b * opacity;
            lCol[idx + 3] = r * opacity; lCol[idx + 4] = g * opacity; lCol[idx + 5] = b * opacity;
            segCount++;
          }
        }
      }

      this.lines.geometry.setDrawRange(0, segCount * 2);
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.geometry.attributes.color.needsUpdate = true;
    }

    _lerpPositionsToTarget() {
      const base = this._basePositions;
      const target = this._targetPositions;
      const len = base.length;
      for (let i = 0; i < len; i++) {
        base[i] += (target[i] - base[i]) * this._profileLerpSpeed;
      }
      this.particles.geometry.attributes.position.array.set(base);
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    _lerpProfile() {
      const keys = ['speed', 'displacement', 'chaos', 'pulseStrength', 'lineOpacity'];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        this.profile[key] += (this.targetProfile[key] - this.profile[key]) * 0.03;
      }
      this._particleUniforms.uSpeed.value = this.profile.speed;
      this._particleUniforms.uDisplacement.value = this.profile.displacement;
      this._particleUniforms.uChaos.value = this.profile.chaos;
      this._particleUniforms.uPulseStrength.value = this.profile.pulseStrength;
      this.lines.material.opacity = this.profile.lineOpacity;
    }

    _updateParticleActivation() {
      if (!this._lastFreqData) return;
      const active = this._activeAttr.array;
      const freq = this._lastFreqData;
      const bins = this._freqBins;
      const count = this.particleCount;
      for (let i = 0; i < count; i++) {
        const bin = bins[i];
        const rawVal = (freq[bin] + 100) / 70;
        const val = Math.max(0, Math.min(1, rawVal));
        const current = active[i];
        if (val > current) {
          active[i] = current + (val - current) * 0.6;
        } else {
          active[i] = current * 0.92;
        }
      }
      this._activeAttr.needsUpdate = true;
    }

    _detectBeat(dt) {
      // Detect bass transients for flash effects
      const bassJump = this.bass - this._prevBass;
      this._prevBass = this.bass;
      this._beatCooldown = Math.max(0, this._beatCooldown - dt);

      if (bassJump > this._beatThreshold && this._beatCooldown <= 0 && this.bass > 0.3) {
        this._beatFlash = 1.0;
        this._beatCooldown = 0.15;
        this._beatCount++;

        // Cycle beat color every few beats
        if (this._beatCount % 4 === 0) {
          const palette = BEAT_COLORS[this.targetProfile.colorPalette || 'cool'];
          this._currentBeatColorIdx = (this._currentBeatColorIdx + 1) % palette.length;
          const c = palette[this._currentBeatColorIdx];
          this._targetBeatColor[0] = c[0];
          this._targetBeatColor[1] = c[1];
          this._targetBeatColor[2] = c[2];
        }
      }

      // Decay flash
      this._beatFlash *= 0.88;
      if (this._beatFlash < 0.01) this._beatFlash = 0;

      // Lerp beat color
      for (let i = 0; i < 3; i++) {
        this._beatColor[i] += (this._targetBeatColor[i] - this._beatColor[i]) * 0.1;
      }

      // Camera shake on strong beats
      this._cameraShake *= 0.9;
      if (bassJump > 0.25 && this.bass > 0.5) {
        this._cameraShake = Math.min(0.5, bassJump * 2);
      }
    }

    _randomFormationSwitch(dt) {
      if (!this.targetProfile.shapeShift) return;
      this._formationTimer += dt;
      if (this._formationTimer >= this._formationInterval) {
        this._formationTimer = 0;
        // Pick a random formation different from current
        let newFormation;
        do {
          newFormation = ALL_FORMATIONS[Math.floor(Math.random() * ALL_FORMATIONS.length)];
        } while (newFormation === this.profile.formation);

        const spread = this.targetProfile.spread;
        const count = this.particleCount;
        for (let i = 0; i < count; i++) {
          const p = this._distributeParticle(i, newFormation, spread);
          this._targetPositions[i * 3] = p[0];
          this._targetPositions[i * 3 + 1] = p[1];
          this._targetPositions[i * 3 + 2] = p[2];
        }
        this.profile.formation = newFormation;

        // Recompute freq bins
        for (let i = 0; i < count; i++) {
          const x = this._targetPositions[i * 3], y = this._targetPositions[i * 3 + 1], z = this._targetPositions[i * 3 + 2];
          const r = Math.sqrt(x * x + y * y + z * z);
          this._freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
        }
      }
    }

    _updateCentralGeoMorph(dt) {
      if (!this.targetProfile.shapeShift) return;
      this._centralMorphTimer += dt;
      if (this._centralMorphTimer >= this._centralMorphInterval) {
        this._centralMorphTimer = 0;
        this._morphCentralGeo();
      }
    }

    update(frequencyData, waveformData) {
      if (!this.ready) return;

      this._lastFreqData = frequencyData;
      this._lastWaveformData = waveformData;

      if (!frequencyData) {
        this.bass *= 0.95;
        this.mids *= 0.95;
        this.highs *= 0.95;
        return;
      }

      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i < 4; i++) bassSum += frequencyData[i];
      for (let i = 4; i < 16; i++) midsSum += frequencyData[i];
      for (let i = 16; i < frequencyData.length; i++) highsSum += frequencyData[i];

      const bassNorm = Math.max(0, Math.min(1, (bassSum / 4 + 100) / 100));
      const midsNorm = Math.max(0, Math.min(1, (midsSum / 12 + 100) / 100));
      const highsNorm = Math.max(0, Math.min(1, (highsSum / (frequencyData.length - 16) + 100) / 100));

      this.bass += (bassNorm - this.bass) * 0.15;
      this.mids += (midsNorm - this.mids) * 0.15;
      this.highs += (highsNorm - this.highs) * 0.12;

      // Waveform on central geometry
      if (waveformData && this.centralMesh) {
        const posAttr = this.centralMesh.geometry.attributes.position;
        const arr = posAttr.array;
        const base = this._centralBasePos;
        const len = arr.length / 3;
        for (let i = 0; i < len; i++) {
          const wi = Math.floor((i / len) * waveformData.length);
          const wVal = waveformData[wi] || 0;
          const scale = 1.0 + wVal * this.bass * 0.6;
          arr[i * 3] = base[i * 3] * scale;
          arr[i * 3 + 1] = base[i * 3 + 1] * scale;
          arr[i * 3 + 2] = base[i * 3 + 2] * scale;
        }
        posAttr.needsUpdate = true;
      }
    }

    setTheme(themeName) {
      this.theme = THEMES[themeName] || THEMES.alpha;
      if (!this.ready) return;

      const col = this.theme.primary;
      const sec = this.theme.secondary;
      this._particleUniforms.uColor.value.set(
        col[0] * 0.7 + sec[0] * 0.3,
        col[1] * 0.7 + sec[1] * 0.3,
        col[2] * 0.7 + sec[2] * 0.3
      );

      if (this.centralMesh) {
        this.centralMesh.material.color.setRGB(col[0], col[1], col[2]);
      }
      if (this.auraRing) {
        this.auraRing.material.color.setRGB(col[0], col[1], col[2]);
      }
    }

    setGenre(genreName) {
      const newProfile = GENRE_PROFILES[genreName] || DEFAULT_PROFILE;
      this.targetProfile = Object.assign({}, newProfile);

      const count = this.particleCount;
      const spread = newProfile.spread;
      const formation = newProfile.formation;
      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        this._targetPositions[i * 3] = p[0];
        this._targetPositions[i * 3 + 1] = p[1];
        this._targetPositions[i * 3 + 2] = p[2];
      }
      this.profile.formation = formation;

      for (let i = 0; i < count; i++) {
        const x = this._targetPositions[i * 3], y = this._targetPositions[i * 3 + 1], z = this._targetPositions[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        this._freqBins[i] = Math.floor(Math.min(r / spread, 1.0) * 63);
      }

      // Reset formation timer so we get the new genre's formation for a while before morphing
      this._formationTimer = 0;

      // Set initial beat color from palette
      const palette = BEAT_COLORS[newProfile.colorPalette || 'cool'];
      const c = palette[0];
      this._targetBeatColor[0] = c[0];
      this._targetBeatColor[1] = c[1];
      this._targetBeatColor[2] = c[2];
    }

    resize() {
      if (!this.ready) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _animate() {
      this._rafId = requestAnimationFrame(this._bound_animate);

      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Lerp profile values and positions
      this._lerpProfile();
      this._lerpPositionsToTarget();

      // Per-particle audio activation
      this._updateParticleActivation();

      // Beat detection & color cycling
      this._detectBeat(dt);
      this._colorCycleTime += dt * (this.targetProfile.morphSpeed || 0.5);

      // Random formation & geometry morphing
      this._randomFormationSwitch(dt);
      this._updateCentralGeoMorph(dt);

      // Update uniforms
      this._particleUniforms.uTime.value = elapsed;
      this._particleUniforms.uBass.value = this.bass;
      this._particleUniforms.uMids.value = this.mids;
      this._particleUniforms.uHighs.value = this.highs;
      this._particleUniforms.uBeatFlash.value = this._beatFlash;
      this._particleUniforms.uColorCycle.value = this._colorCycleTime;
      this._particleUniforms.uBeatColor.value.set(
        this._beatColor[0], this._beatColor[1], this._beatColor[2]
      );

      // Central geometry - dynamic rotation speed based on energy
      if (this.centralMesh) {
        const energy = this.bass * 0.5 + this.mids * 0.3 + this.highs * 0.2;
        this.centralMesh.rotation.x = elapsed * (0.05 + energy * 0.15);
        this.centralMesh.rotation.y = elapsed * (0.08 + energy * 0.2);
        this.centralMesh.rotation.z = elapsed * 0.03;
        const cScale = 1.0 + this.bass * this.profile.pulseStrength * 0.6;
        this.centralMesh.scale.setScalar(cScale);

        // Beat-reactive color on central mesh
        const col = this.theme.primary;
        const bc = this._beatColor;
        const bm = this._beatFlash * 0.6;
        this.centralMesh.material.color.setRGB(
          col[0] * (1 - bm) + bc[0] * bm,
          col[1] * (1 - bm) + bc[1] * bm,
          col[2] * (1 - bm) + bc[2] * bm
        );
        this.centralMesh.material.opacity = 0.15 + this._beatFlash * 0.25;
      }

      // Aura ring - pulses on bass
      if (this.auraRing) {
        this.auraRing.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.3) * 0.2;
        this.auraRing.rotation.z = elapsed * 0.1;
        const auraScale = 1.0 + this.bass * 0.8 + this._beatFlash * 0.5;
        this.auraRing.scale.setScalar(auraScale);
        this.auraRing.material.opacity = this.bass * 0.12 + this._beatFlash * 0.15;

        const col = this.theme.primary;
        const bc = this._beatColor;
        const bm = this._beatFlash * 0.7;
        this.auraRing.material.color.setRGB(
          col[0] * (1 - bm) + bc[0] * bm,
          col[1] * (1 - bm) + bc[1] * bm,
          col[2] * (1 - bm) + bc[2] * bm
        );
      }

      // Particle group rotation - energy-reactive
      const rotSpeed = 0.02 + this.bass * 0.03;
      this.particles.rotation.y = elapsed * rotSpeed;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

      // Camera orbit with shake
      this._orbitAngle += 0.0003 + this.bass * 0.0005;
      const shakeX = (Math.random() - 0.5) * this._cameraShake;
      const shakeY = (Math.random() - 0.5) * this._cameraShake;
      this.camera.position.x = Math.sin(this._orbitAngle) * 2 + shakeX;
      this.camera.position.y = Math.cos(this._orbitAngle * 0.7) * 1 + shakeY;
      this.camera.lookAt(0, 0, 0);

      // Update connections every 3rd frame
      this._frameCount = (this._frameCount || 0) + 1;
      if (this._frameCount % 3 === 0) {
        this._updateConnections();
      }

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (!this.ready) return;
      cancelAnimationFrame(this._rafId);
      window.removeEventListener('resize', this._bound_resize);

      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.centralMesh.geometry.dispose();
      this.centralMesh.material.dispose();
      this.lines.geometry.dispose();
      this.lines.material.dispose();
      if (this.auraRing) {
        this.auraRing.geometry.dispose();
        this.auraRing.material.dispose();
      }

      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.ready = false;
    }
  }

  window.VisualizerBG = VisualizerBG;
})();
