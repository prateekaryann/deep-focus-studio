/**
 * VisualizerBG - Genre-reactive Three.js particle background for Deep Focus Studio
 */
(function () {
  'use strict';

  const THEMES = {
    theta:   { primary: new Float32Array([0.545, 0.361, 0.965]), secondary: new Float32Array([0.427, 0.157, 0.851]) },
    alpha:   { primary: new Float32Array([0.388, 0.400, 0.945]), secondary: new Float32Array([0.310, 0.275, 0.898]) },
    beta:    { primary: new Float32Array([0.078, 0.722, 0.651]), secondary: new Float32Array([0.051, 0.580, 0.533]) },
    gamma:   { primary: new Float32Array([0.133, 0.773, 0.369]), secondary: new Float32Array([0.086, 0.639, 0.290]) },
  };

  const GENRE_PROFILES = {
    ambienttechno: { speed: 0.3, displacement: 0.3, spread: 18, particleSize: 1.0, lineOpacity: 0.05, pulseStrength: 0.2, chaos: 0,    formation: 'sphere' },
    dubtechno:     { speed: 0.4, displacement: 0.4, spread: 16, particleSize: 1.2, lineOpacity: 0.08, pulseStrength: 0.3, chaos: 0,    formation: 'sphere' },
    minimal:       { speed: 0.5, displacement: 0.5, spread: 14, particleSize: 1.0, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.1,  formation: 'ring' },
    detroit:       { speed: 0.6, displacement: 0.6, spread: 13, particleSize: 1.2, lineOpacity: 0.12, pulseStrength: 0.6, chaos: 0.1,  formation: 'ring' },
    deephouse:     { speed: 0.5, displacement: 0.5, spread: 13, particleSize: 1.1, lineOpacity: 0.1,  pulseStrength: 0.5, chaos: 0.05, formation: 'ring' },
    progressive:   { speed: 0.6, displacement: 0.7, spread: 14, particleSize: 1.3, lineOpacity: 0.12, pulseStrength: 0.7, chaos: 0.15, formation: 'spiral' },
    trance:        { speed: 0.8, displacement: 0.9, spread: 15, particleSize: 1.5, lineOpacity: 0.15, pulseStrength: 0.9, chaos: 0.2,  formation: 'spiral' },
    acid:          { speed: 0.9, displacement: 1.0, spread: 12, particleSize: 1.4, lineOpacity: 0.15, pulseStrength: 1.0, chaos: 0.25, formation: 'ring' },
    dnb:           { speed: 1.0, displacement: 1.2, spread: 14, particleSize: 1.5, lineOpacity: 0.18, pulseStrength: 1.2, chaos: 0.2,  formation: 'sphere' },
    hardtechno:    { speed: 1.2, displacement: 1.5, spread: 11, particleSize: 1.8, lineOpacity: 0.2,  pulseStrength: 1.5, chaos: 0.4,  formation: 'cube' },
  };
  const DEFAULT_PROFILE = { speed: 0.5, displacement: 0.5, spread: 14, particleSize: 1.0, lineOpacity: 0.1, pulseStrength: 0.5, chaos: 0.1, formation: 'sphere' };

  const VERT_SHADER = `
    attribute float aSize;
    attribute float aAlpha;
    attribute float aPhase;
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uSpeed;
    uniform float uDisplacement;
    uniform float uChaos;
    uniform float uPulseStrength;
    varying float vAlpha;
    varying float vDist;

    void main() {
      vAlpha = aAlpha;
      vec3 pos = position;
      vec3 dir = normalize(pos + vec3(0.001));
      float t = uTime * uSpeed;

      // Smooth wave displacement
      float wave = sin(pos.x * 1.5 + t) * cos(pos.y * 1.2 + t * 0.7) * uDisplacement;

      // Bass pulse - push outward on beat
      float pulse = uBass * uPulseStrength * 2.0;
      pos += dir * (wave + pulse);

      // Chaos jitter (aggressive genres)
      if (uChaos > 0.0) {
        pos.x += sin(t * 3.0 + aPhase * 7.0) * uChaos * uBass;
        pos.y += cos(t * 4.0 + aPhase * 5.0) * uChaos * uBass;
        pos.z += sin(t * 2.5 + aPhase * 9.0) * uChaos * uBass;
      }

      // Gentle ambient drift (always present)
      pos.x += sin(t * 0.3 + aPhase) * 0.15;
      pos.y += cos(t * 0.25 + aPhase * 1.3) * 0.15;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float sizeMod = 1.0 + uMids * 0.5;
      gl_PointSize = aSize * sizeMod * (150.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      vDist = length(mvPosition.xyz);
    }
  `;

  const FRAG_SHADER = `
    precision mediump float;
    varying float vAlpha;
    varying float vDist;
    uniform float uHighs;
    uniform vec3 uColor;

    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;

      // Sharp core with subtle soft edge
      float core = smoothstep(0.5, 0.15, dist);
      float glow = smoothstep(0.5, 0.0, dist) * 0.3;
      float alpha = (core + glow) * vAlpha;

      float brightness = 0.7 + uHighs * 0.3;

      // Distance fade
      float distFade = clamp(1.0 - vDist / 60.0, 0.1, 1.0);
      alpha *= distFade;

      gl_FragColor = vec4(uColor * brightness, alpha * 0.8);
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
      this.particleCount = this.isMobile ? 800 : 1500;
      this.maxConnections = this.isMobile ? 150 : 300;
      this.connectionThreshold = 2.8;

      this.bass = 0; this.mids = 0; this.highs = 0;
      this.targetBass = 0; this.targetMids = 0; this.targetHighs = 0;

      this.theme = THEMES.alpha;
      this.profile = Object.assign({}, DEFAULT_PROFILE);
      this.targetProfile = Object.assign({}, DEFAULT_PROFILE);
      this._profileLerpSpeed = 0.02;

      this._initScene();
      this._createParticles();
      this._createCentralGeo();
      this._createLines();

      this._frameInterval = 1000 / 30;
      this._lastFrame = 0;
      this._bound_animate = this._animate.bind(this);
      this._bound_resize = this.resize.bind(this);
      window.addEventListener('resize', this._bound_resize);
      this._rafId = requestAnimationFrame(this._bound_animate);
      this.ready = true;
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x06060b, 0.015);
      this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
      this.camera.position.z = 35;
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
      this._orbitAngle = 0;
    }

    _distributeParticle(i, formation, spread) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rand = (Math.random() - 0.5) * 2;

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
          const t = i / this.particleCount;
          const spiralR = spread * 0.3 + t * spread * 0.7;
          const spiralTheta = t * Math.PI * 6;
          const y = (t - 0.5) * spread * 0.5;
          return [spiralR * Math.cos(spiralTheta) + rand * 2, y + rand * 2, spiralR * Math.sin(spiralTheta) + rand * 2];
        }
        case 'cube': {
          return [(Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread];
        }
        default: {
          const r = spread * 0.5 + Math.random() * spread * 0.5;
          return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
        }
      }
    }

    _createParticles() {
      const count = this.particleCount;
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const phases = new Float32Array(count);

      const formation = this.profile.formation;
      const spread = this.profile.spread;

      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        positions[i * 3] = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
        sizes[i] = 0.8 + Math.random() * 1.2; // 0.8 - 2.0 range
        alphas[i] = 0.4 + Math.random() * 0.6;
        phases[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

      this._basePositions = new Float32Array(positions);
      this._targetPositions = new Float32Array(positions);

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
        opacity: 0.1,
      });
      this.centralMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.centralMesh);
      this._centralBasePos = new Float32Array(geo.attributes.position.array);
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

      const col = this.theme.primary;
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
            const idx = segCount * 6;
            lPos[idx] = ix; lPos[idx + 1] = iy; lPos[idx + 2] = iz;
            lPos[idx + 3] = pArr[j * 3]; lPos[idx + 4] = pArr[j * 3 + 1]; lPos[idx + 5] = pArr[j * 3 + 2];
            lCol[idx] = col[0] * fade; lCol[idx + 1] = col[1] * fade; lCol[idx + 2] = col[2] * fade;
            lCol[idx + 3] = col[0] * fade; lCol[idx + 4] = col[1] * fade; lCol[idx + 5] = col[2] * fade;
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
      let maxDelta = 0;
      for (let i = 0; i < len; i++) {
        const diff = target[i] - base[i];
        base[i] += diff * this._profileLerpSpeed;
        const absDiff = Math.abs(diff);
        if (absDiff > maxDelta) maxDelta = absDiff;
      }
      this.particles.geometry.attributes.position.array.set(base);
      this.particles.geometry.attributes.position.needsUpdate = true;
      return maxDelta < 0.01;
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

    update(frequencyData, waveformData) {
      if (!this.ready) return;

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
          const scale = 1.0 + wVal * this.bass * 0.5;
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
      // Blend for color uniform
      this._particleUniforms.uColor.value.set(
        col[0] * 0.7 + sec[0] * 0.3,
        col[1] * 0.7 + sec[1] * 0.3,
        col[2] * 0.7 + sec[2] * 0.3
      );

      if (this.centralMesh) {
        this.centralMesh.material.color.setRGB(col[0], col[1], col[2]);
      }
    }

    setGenre(genreName) {
      const newProfile = GENRE_PROFILES[genreName] || DEFAULT_PROFILE;
      this.targetProfile = Object.assign({}, newProfile);

      // Compute target positions for smooth formation transition
      const count = this.particleCount;
      const spread = newProfile.spread;
      const formation = newProfile.formation;
      for (let i = 0; i < count; i++) {
        const p = this._distributeParticle(i, formation, spread);
        this._targetPositions[i * 3] = p[0];
        this._targetPositions[i * 3 + 1] = p[1];
        this._targetPositions[i * 3 + 2] = p[2];
      }
    }

    resize() {
      if (!this.ready) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _animate(time) {
      this._rafId = requestAnimationFrame(this._bound_animate);
      if (time - this._lastFrame < this._frameInterval) return;
      this._lastFrame = time;

      const elapsed = this.clock.getElapsedTime();

      // Lerp profile values and positions
      this._lerpProfile();
      this._lerpPositionsToTarget();

      // Update uniforms
      this._particleUniforms.uTime.value = elapsed;
      this._particleUniforms.uBass.value = this.bass;
      this._particleUniforms.uMids.value = this.mids;
      this._particleUniforms.uHighs.value = this.highs;

      // Slow rotation of central geometry
      if (this.centralMesh) {
        this.centralMesh.rotation.x = elapsed * 0.05;
        this.centralMesh.rotation.y = elapsed * 0.08;
        const cScale = 1.0 + this.bass * this.profile.pulseStrength * 0.3;
        this.centralMesh.scale.setScalar(cScale);
      }

      // Subtle particle group rotation
      this.particles.rotation.y = elapsed * 0.02;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

      // Camera orbit
      this._orbitAngle += 0.0003;
      this.camera.position.x = Math.sin(this._orbitAngle) * 2;
      this.camera.position.y = Math.cos(this._orbitAngle * 0.7) * 1;
      this.camera.lookAt(0, 0, 0);

      // Update connections every other frame
      if (Math.floor(time / this._frameInterval) % 2 === 0) {
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

      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.ready = false;
    }
  }

  window.VisualizerBG = VisualizerBG;
})();
