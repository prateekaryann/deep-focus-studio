/**
 * VisualizerBG - Audio-reactive Three.js background for Deep Focus Studio
 */
(function () {
  'use strict';

  const THEMES = {
    theta:   { primary: 0x8b5cf6, secondary: 0x6d28d9 },
    alpha:   { primary: 0x6366f1, secondary: 0x4f46e5 },
    beta:    { primary: 0x14b8a6, secondary: 0x0d9488 },
    gamma:   { primary: 0x22c55e, secondary: 0x16a34a },
    default: { primary: 0x6366f1, secondary: 0x4f46e5 }
  };

  const VERT_SHADER = `
    attribute float aSize;
    attribute float aAlpha;
    attribute float aPhase;
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vAlpha = aAlpha;
      vec3 pos = position;

      // Audio-driven displacement along radial direction
      vec3 dir = normalize(pos);
      float wave = sin(pos.x * 2.0 + uTime * 0.8 + aPhase) * 0.5
                 + sin(pos.y * 1.5 + uTime * 0.6 + aPhase) * 0.3;
      pos += dir * wave * uBass * 2.0;

      // Gentle ambient drift
      pos.x += sin(uTime * 0.15 + aPhase) * 0.3;
      pos.y += cos(uTime * 0.12 + aPhase * 1.3) * 0.3;
      pos.z += sin(uTime * 0.1 + aPhase * 0.7) * 0.2;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float sizeMod = 1.0 + uMids * 1.5;
      gl_PointSize = aSize * sizeMod * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      vColor = color;
    }
  `;

  const FRAG_SHADER = `
    varying float vAlpha;
    varying vec3 vColor;
    uniform float uHighs;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float glow = 1.0 - dist * 2.0;
      glow = pow(glow, 1.5);
      float brightness = 1.0 + uHighs * 0.4;
      float alpha = vAlpha * glow * 0.6;
      gl_FragColor = vec4(vColor * brightness, alpha);
    }
  `;

  class VisualizerBG {
    constructor(containerEl) {
      if (typeof THREE === 'undefined') return;

      // WebGL check
      try {
        const c = document.createElement('canvas');
        if (!c.getContext('webgl') && !c.getContext('experimental-webgl')) return;
      } catch (e) { return; }

      this.container = containerEl;
      this.clock = new THREE.Clock();
      this.isMobile = window.innerWidth < 768;
      this.particleCount = this.isMobile ? 1200 : 2500;
      this.maxConnections = this.isMobile ? 250 : 500;
      this.connectionThreshold = 2.8;

      // Smoothed audio values
      this.bass = 0;
      this.mids = 0;
      this.highs = 0;

      this.theme = THEMES.default;

      this._initScene();
      this._createParticles();
      this._createCentralGeometry();
      this._createConnections();

      this._lastFrame = 0;
      this._frameInterval = 1000 / 30; // 30fps cap
      this._bound_animate = this._animate.bind(this);
      this._bound_resize = this.resize.bind(this);
      window.addEventListener('resize', this._bound_resize);
      this._rafId = requestAnimationFrame(this._bound_animate);

      this.ready = true;
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x06060b, 0.02);

      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      this.camera.position.z = 30;

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0);
      this.container.appendChild(this.renderer.domElement);

      // Subtle orbit state
      this._orbitAngle = 0;
    }

    _createParticles() {
      const count = this.particleCount;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const phases = new Float32Array(count);

      const col = new THREE.Color(this.theme.primary);
      const col2 = new THREE.Color(this.theme.secondary);

      for (let i = 0; i < count; i++) {
        // Distribute on a torus-sphere hybrid
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 8 + Math.random() * 7; // radius 8-15

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const t = Math.random();
        const c = col.clone().lerp(col2, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = 1.5 + Math.random() * 3.0;
        alphas[i] = 0.3 + Math.random() * 0.7;
        phases[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

      // Store base positions for reference
      this._basePositions = new Float32Array(positions);

      this._particleUniforms = {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uHighs: { value: 0 }
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        uniforms: this._particleUniforms,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(geo, mat);
      this.scene.add(this.particles);
    }

    _createCentralGeometry() {
      const geo = new THREE.IcosahedronGeometry(3.5, 2);
      const col = new THREE.Color(this.theme.primary);
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        wireframe: true,
        transparent: true,
        opacity: 0.12
      });
      this.centralMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.centralMesh);

      // Store base vertices for waveform displacement
      this._centralBasePos = new Float32Array(geo.attributes.position.array);
    }

    _createConnections() {
      // Pre-allocate max line segments
      const maxSegs = this.maxConnections;
      const positions = new Float32Array(maxSegs * 2 * 3);
      const colors = new Float32Array(maxSegs * 2 * 3);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setDrawRange(0, 0);

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.lines = new THREE.LineSegments(geo, mat);
      this.scene.add(this.lines);
    }

    _updateConnections() {
      const pAttr = this.particles.geometry.attributes.position;
      const pArr = pAttr.array;
      const count = this.particleCount;
      const threshold = this.connectionThreshold;
      const threshSq = threshold * threshold;

      const lPos = this.lines.geometry.attributes.position.array;
      const lCol = this.lines.geometry.attributes.color.array;

      const col = new THREE.Color(this.theme.primary);
      let segCount = 0;
      const max = this.maxConnections;

      // Sample a subset for performance
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
            lCol[idx] = col.r * fade; lCol[idx + 1] = col.g * fade; lCol[idx + 2] = col.b * fade;
            lCol[idx + 3] = col.r * fade; lCol[idx + 4] = col.g * fade; lCol[idx + 5] = col.b * fade;
            segCount++;
          }
        }
      }

      this.lines.geometry.setDrawRange(0, segCount * 2);
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.geometry.attributes.color.needsUpdate = true;
    }

    update(frequencyData, waveformData) {
      if (!this.ready) return;

      if (!frequencyData) {
        // Smooth toward zero (ambient mode)
        this.bass = this.bass * 0.95;
        this.mids = this.mids * 0.95;
        this.highs = this.highs * 0.95;
        return;
      }

      // Compute bands
      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i < 4; i++) bassSum += frequencyData[i];
      for (let i = 4; i < 16; i++) midsSum += frequencyData[i];
      for (let i = 16; i < frequencyData.length; i++) highsSum += frequencyData[i];

      const bassNorm = Math.max(0, Math.min(1, (bassSum / 4 + 100) / 100));
      const midsNorm = Math.max(0, Math.min(1, (midsSum / 12 + 100) / 100));
      const highsNorm = Math.max(0, Math.min(1, (highsSum / (frequencyData.length - 16) + 100) / 100));

      // Smooth with lerp
      this.bass += (bassNorm - this.bass) * 0.15;
      this.mids += (midsNorm - this.mids) * 0.15;
      this.highs += (highsNorm - this.highs) * 0.12;

      // Apply waveform to central geometry
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
      this.theme = THEMES[themeName] || THEMES.default;
      if (!this.ready) return;

      const col = new THREE.Color(this.theme.primary);
      const col2 = new THREE.Color(this.theme.secondary);

      // Update particle colors
      const colors = this.particles.geometry.attributes.color.array;
      const count = this.particleCount;
      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const c = col.clone().lerp(col2, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      this.particles.geometry.attributes.color.needsUpdate = true;

      // Update central mesh
      if (this.centralMesh) {
        this.centralMesh.material.color.set(this.theme.primary);
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

      // Throttle to 30fps
      if (time - this._lastFrame < this._frameInterval) return;
      this._lastFrame = time;

      const elapsed = this.clock.getElapsedTime();

      // Update uniforms
      this._particleUniforms.uTime.value = elapsed;
      this._particleUniforms.uBass.value = this.bass;
      this._particleUniforms.uMids.value = this.mids;
      this._particleUniforms.uHighs.value = this.highs;

      // Slow rotation of central geometry
      if (this.centralMesh) {
        this.centralMesh.rotation.x = elapsed * 0.05;
        this.centralMesh.rotation.y = elapsed * 0.08;
      }

      // Subtle particle group rotation
      this.particles.rotation.y = elapsed * 0.02;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

      // Subtle camera orbit
      this._orbitAngle += 0.0003;
      this.camera.position.x = Math.sin(this._orbitAngle) * 2;
      this.camera.position.y = Math.cos(this._orbitAngle * 0.7) * 1;
      this.camera.lookAt(0, 0, 0);

      // Update connections (every other frame for perf)
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
