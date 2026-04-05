/**
 * Deep Focus Studio - Main Application Logic
 * Orchestrates screens, timer, audio controls, tasks, and dashboard.
 */

(function () {
  'use strict';

  let audioEngine;
  let sessionManager;
  let timerInterval = null;
  let vizAnimFrame = null;
  let breathingTimeout = null;
  let vizBG = null;
  let micAnalyser = null;
  let micVizActive = false;
  let selectedPreset = null;
  let selectedTimerMinutes = 25;
  let pomodoroCount = 0;
  let pomodoroOnBreak = false;
  let isMuted = false;
  let preMuteVolume = 50;
  let selectedTrackId = null; // track selected on welcome screen to play on loop

  // ─── IndexedDB: Custom Track Persistence ────────────────────────────

  const DB_NAME = 'deep-focus-custom-tracks';
  const DB_STORE = 'tracks';
  let _db = null;

  function openTracksDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveCustomTrackToDB(file, id, name, genre) {
    try {
      const db = await openTracksDB();
      const buf = await file.arrayBuffer();
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({ id, name, genre, type: file.type, buf });
    } catch (e) { console.warn('Could not save track to DB', e); }
  }

  async function deleteCustomTrackFromDB(id) {
    try {
      const db = await openTracksDB();
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(id);
    } catch (e) { console.warn('Could not delete track from DB', e); }
  }

  async function restoreCustomTracksFromDB() {
    try {
      const db = await openTracksDB();
      const tx = db.transaction(DB_STORE, 'readonly');
      const records = await new Promise((res, rej) => {
        const req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      for (const r of records) {
        const blob = new Blob([r.buf], { type: r.type || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        if (audioEngine) audioEngine.restoreCustomTrack(r.id, r.name, r.genre, url);
      }
      if (records.length && window._renderTrackList) window._renderTrackList();
    } catch (e) { console.warn('Could not restore tracks from DB', e); }
  }

  // ─── Toast Notification System ──────────────────────────────────────

  function showToast(message, duration) {
    duration = duration || 2000;
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─── Confetti Celebration ───────────────────────────────────────────

  function launchConfetti() {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#818cf8', '#34d399', '#a78bfa'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.top = '-10px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.width = (6 + Math.random() * 6) + 'px';
      piece.style.height = (6 + Math.random() * 6) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5000);
    }
  }

  // ─── Neuroscience Tips ───────────────────────────────────────────────

  const tips = [
    'Alpha waves (8-12Hz) enhance relaxed alertness — ideal for creative problem solving.',
    'Brown noise masks distracting frequencies, helping maintain sustained attention.',
    'The Pomodoro technique leverages ultradian rhythms — your brain\'s natural 90-minute focus cycles.',
    'Binaural beats work through frequency-following response — your brain synchronizes to the beat frequency.',
    'Taking breaks every 25-50 minutes prevents cognitive fatigue and maintains prefrontal cortex efficiency.',
    'Theta waves (4-8Hz) are associated with the "flow state" — deep creative immersion.',
    'Ambient sounds at 70dB have been shown to boost creative cognition (Mehta et al., 2012).',
    'Nature sounds activate the parasympathetic nervous system, reducing stress hormones.',
    'Gamma waves (30-50Hz) are linked to heightened perception and peak concentration.',
    'The default mode network deactivates during deep focus — external distractions reactivate it.',
    'Beta waves (12-30Hz) support analytical thinking and active problem solving.',
    'White noise provides a consistent auditory backdrop that reduces the startle response to sudden sounds.',
    'Deep breathing before a session lowers cortisol and primes the prefrontal cortex for sustained attention.',
    'Dopamine release during focused work reinforces the habit loop — making future sessions easier to start.',
    'Studies show 90-minute work blocks align with the brain\'s basic rest-activity cycle (BRAC).',
    'Pink noise mirrors the spectral density of many natural processes and promotes stable, restful focus.',
    'Setting a clear intention before working activates goal-directed neural circuits in the anterior cingulate cortex.',
  ];

  function showRandomTip() {
    const el = document.getElementById('focus-tip');
    if (el) el.textContent = tips[Math.floor(Math.random() * tips.length)];
  }

  // ─── Screen Management ──────────────────────────────────────────────

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  // ─── Welcome Screen ─────────────────────────────────────────────────

  function initWelcomeScreen() {
    // Preset cards
    document.querySelectorAll('.preset-card[data-preset]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedPreset = card.dataset.preset;
        // Update music suggestion for chosen focus mode
        if (window._updateMusicSuggestion) window._updateMusicSuggestion();
      });
    });

    // Welcome screen track list
    (function initWelcomeTrackPicker() {
      const listEl = document.getElementById('welcome-track-list');
      const genreTabsEl = document.getElementById('welcome-genre-tabs');
      if (!listEl) return;

      let activeGenre = 'all';

      function renderWelcomeTracks() {
        const tracks = window.AudioEngine ? window.AudioEngine.TRACKS : [];
        const filtered = activeGenre === 'all' ? tracks : tracks.filter(t => t.genre === activeGenre);

        // "None" item + track items
        const noneActive = selectedTrackId === null ? ' active' : '';
        listEl.innerHTML = '<button class="welcome-track-item' + noneActive + '" data-track-id="">'
          + '<span class="welcome-track-name">None</span>'
          + '</button>'
          + filtered.map(t => {
            const isActive = t.id === selectedTrackId ? ' active' : '';
            return '<button class="welcome-track-item' + isActive + '" data-track-id="' + t.id + '">'
              + '<span class="welcome-track-name">' + escapeHtml(t.name) + '</span>'
              + '<span class="welcome-track-genre-badge">' + t.genre + '</span>'
              + '</button>';
          }).join('');

        listEl.querySelectorAll('.welcome-track-item').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedTrackId = btn.dataset.trackId || null;
            renderWelcomeTracks();
          });
        });
      }

      if (genreTabsEl) {
        genreTabsEl.querySelectorAll('.welcome-genre-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            genreTabsEl.querySelectorAll('.welcome-genre-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeGenre = tab.dataset.genre;
            renderWelcomeTracks();
          });
        });
      }

      renderWelcomeTracks();
    })();

    // Timer mode buttons
    document.querySelectorAll('.timer-preset-btn[data-minutes]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTimerMinutes = parseInt(btn.dataset.minutes, 10);
      });
    });

    // Begin button
    const btnBegin = document.getElementById('btn-begin');
    if (btnBegin) {
      btnBegin.addEventListener('click', beginSession);
    }
  }

  function beginSession() {
    if (audioEngine && audioEngine.playing) {
      audioEngine.stop();
    }

    const goal = (document.getElementById('goal-input')?.value || '').trim();
    const preset = selectedPreset || null;
    const duration = selectedTimerMinutes;
    const timerMode = duration === 0 ? 'free' : (duration === 25 ? 'pomodoro' : 'countdown');

    sessionManager.startSession(goal, preset, timerMode, duration);

    pomodoroCount = 0;
    pomodoroOnBreak = false;

    // Show focus screen
    showScreen('screen-focus');
    const goalText = document.getElementById('session-goal-text');
    if (goalText) goalText.textContent = goal || 'Untitled Session';

    updateTimerModeLabel(timerMode, duration);

    const breathingEnabled = sessionManager.getSetting('breathingEnabled', true);
    if (breathingEnabled) {
      startBreathingExercise(() => {
        startAudioAndTimer(preset);
      });
    } else {
      startAudioAndTimer(preset);
    }
  }

  function startAudioAndTimer(preset) {
    audioEngine.init().then(() => {
      audioEngine.start();
      // Apply neural/soundscape preset only when user explicitly chose one
      // and didn't pick a track (track = clean music, no surprise binaural/noise on top)
      if (preset && !selectedTrackId) {
        audioEngine.applyPreset(preset);
      } else {
        // Silence all layers — nothing unexpected should play
        audioEngine.setBinauralEnabled(false);
        audioEngine.setNoiseEnabled(false);
        audioEngine.setNatureEnabled(false);
        audioEngine.setDroneEnabled(false);
      }
      syncAudioToggleUI();

      // Play the user-selected track on loop; persist so reload can resume it
      if (selectedTrackId) {
        sessionManager.setSetting('session_trackId', selectedTrackId);
        while (audioEngine.getLoopMode() !== 'one') audioEngine.cycleLoopMode();
        audioEngine.playTrack(selectedTrackId);
      } else {
        sessionManager.setSetting('session_trackId', '');
      }
      restoreAudioSettings();
      startTimer();
      startVisualizer();
      if (window._updateMusicSuggestion) window._updateMusicSuggestion();
      if (window._renderTrackList) window._renderTrackList();
    }).catch(() => {
      // Audio may fail if user hasn't interacted; start timer anyway
      startTimer();
    });
  }

  function updateTimerModeLabel(mode, duration) {
    const badge = document.getElementById('timer-mode');
    if (!badge) return;
    if (mode === 'free') badge.textContent = 'Free Flow';
    else if (mode === 'pomodoro') badge.textContent = 'Pomodoro 25 min';
    else badge.textContent = 'Focus ' + duration + ' min';
  }

  // ─── Timer System ───────────────────────────────────────────────────

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(tickTimer, 1000);
    updatePlayPauseButton(true);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    updatePlayPauseButton(false);
  }

  function tickTimer() {
    const session = sessionManager.getActiveSession();
    if (!session) return;

    const elapsed = sessionManager.getElapsedSeconds();
    elapsedSeconds = elapsed; // keep elapsed counter in sync for display
    const mode = session.timerMode;
    const duration = session.timerDuration * 60; // seconds

    if (mode === 'free') {
      renderTimerDisplay(elapsed);
      updateProgressBar(0, false);
    } else if (mode === 'pomodoro') {
      tickPomodoro(elapsed, session);
    } else {
      // countdown
      const remaining = Math.max(0, duration - elapsed);
      renderTimerDisplay(remaining);
      updateProgressBar((elapsed / duration) * 100, true);
      if (remaining <= 0) {
        completeSession();
      }
    }
  }

  function tickPomodoro(totalElapsed) {
    const workDuration = 25 * 60;
    const shortBreak = 5 * 60;
    const longBreak = 15 * 60;

    // Determine cycle position
    const cycleLength = workDuration + shortBreak;
    const longCycleLength = workDuration + longBreak;

    // Simple approach: calculate current phase from total elapsed
    let remaining = totalElapsed;
    let count = 0;
    while (true) {
      const isLong = ((count + 1) % 4 === 0);
      const bk = isLong ? longBreak : shortBreak;
      if (remaining < workDuration) {
        // In work phase
        pomodoroOnBreak = false;
        pomodoroCount = count;
        const left = workDuration - remaining;
        renderTimerDisplay(left);
        updateProgressBar((remaining / workDuration) * 100, true);
        const badge = document.getElementById('timer-mode');
        if (badge) badge.textContent = 'Pomodoro #' + (count + 1) + ' — Work';
        return;
      }
      remaining -= workDuration;
      if (remaining < bk) {
        // In break phase
        pomodoroOnBreak = true;
        pomodoroCount = count;
        const left = bk - remaining;
        renderTimerDisplay(left);
        updateProgressBar((remaining / bk) * 100, true);
        const badge = document.getElementById('timer-mode');
        if (badge) badge.textContent = 'Pomodoro #' + (count + 1) + ' — ' + (isLong ? 'Long Break' : 'Break');
        return;
      }
      remaining -= bk;
      count++;
    }
  }

  // Timer display format: 'countdown' | 'clock' | 'elapsed'
  let timerFormat = 'countdown';
  let elapsedSeconds = 0;

  function renderTimerDisplay(seconds) {
    const display = document.getElementById('timer-display');
    if (!display) return;

    if (timerFormat === 'clock') {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      display.textContent =
        String(h12).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ' ' + ampm;
    } else if (timerFormat === 'elapsed') {
      const h = Math.floor(elapsedSeconds / 3600);
      const m = Math.floor((elapsedSeconds % 3600) / 60);
      const s = Math.floor(elapsedSeconds % 60);
      display.textContent =
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0');
    } else {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      display.textContent =
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0');
    }
  }

  function cycleTimerFormat() {
    const float = document.querySelector('.focus-timer-float');
    const label = document.getElementById('timer-format-label');
    const formats = ['countdown', 'clock', 'elapsed'];
    const labels  = ['COUNTDOWN', 'WALL CLOCK', 'ELAPSED'];
    const idx = (formats.indexOf(timerFormat) + 1) % formats.length;
    timerFormat = formats[idx];
    if (label) label.textContent = labels[idx];
    if (float) {
      float.classList.toggle('clock-mode',   timerFormat === 'clock');
      float.classList.toggle('elapsed-mode', timerFormat === 'elapsed');
    }
  }

  function updateProgressBar(percent, show) {
    const bar = document.getElementById('timer-progress');
    if (!bar) return;
    bar.style.width = show ? Math.min(100, percent) + '%' : '0%';
  }

  function updatePlayPauseButton(playing) {
    const btn = document.getElementById('btn-timer-toggle');
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function togglePlayPause() {
    const session = sessionManager.getActiveSession();
    if (!session) return;

    const pauseOverlay = document.getElementById('pause-overlay');

    if (timerInterval) {
      stopTimer();
      sessionManager.pauseSession();
      if (audioEngine && audioEngine.playing) audioEngine.stop();
      if (pauseOverlay) pauseOverlay.classList.add('visible');
      showToast('Session paused');
    } else {
      sessionManager.resumeSession();
      startTimer();
      if (audioEngine) {
        audioEngine.init().then(() => audioEngine.start()).catch(() => {});
      }
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      showToast('Session resumed');
    }
  }

  // ─── Focus Screen Controls ──────────────────────────────────────────

  function initFocusScreen() {
    // Timer controls
    const btnToggle = document.getElementById('btn-timer-toggle');
    if (btnToggle) btnToggle.addEventListener('click', togglePlayPause);

    const btnReset = document.getElementById('btn-timer-reset');
    if (btnReset) btnReset.addEventListener('click', confirmEndSession);

    // Timer format toggle
    const btnFormat = document.getElementById('btn-timer-format');
    if (btnFormat) btnFormat.addEventListener('click', cycleTimerFormat);

    // End session confirmation dialog
    const confirmCancel = document.getElementById('confirm-end-cancel');
    const confirmYes = document.getElementById('confirm-end-yes');
    const confirmBackdrop = document.getElementById('confirm-end-backdrop');
    if (confirmCancel) confirmCancel.addEventListener('click', () => {
      if (confirmBackdrop) confirmBackdrop.classList.remove('visible');
    });
    if (confirmYes) confirmYes.addEventListener('click', () => {
      if (confirmBackdrop) confirmBackdrop.classList.remove('visible');
      completeSession();
    });
    if (confirmBackdrop) confirmBackdrop.addEventListener('click', (e) => {
      if (e.target === confirmBackdrop) confirmBackdrop.classList.remove('visible');
    });

    // Master controls
    wireToggle('master-play', async (active) => {
      if (!audioEngine) return;
      if (!active) {
        audioEngine.stop();
      }
      // If active: wireToggle already called init()+start(), nothing more needed
    });

    wireSlider('master-vol', v => {
      if (audioEngine) audioEngine.setMasterVolume(v / 100);
      saveAudioSetting('masterVol', v);
    });

    // Binaural
    wireToggle('binaural-toggle', v => { if (audioEngine) audioEngine.setBinauralEnabled(v); });
    wireSlider('binaural-vol', v => {
      if (audioEngine) audioEngine.setBinauralVolume(v / 100);
      saveAudioSetting('binauralVol', v);
    });
    document.querySelectorAll('.state-btn[data-freq]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.state-btn[data-freq]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const freq = parseFloat(btn.dataset.freq);
        if (audioEngine) audioEngine.setBinauralFrequency(freq);
        updateBrainwaveTheme(freq);
        saveAudioSetting('binauralFreq', freq);
      });
    });

    // Noise
    wireToggle('noise-toggle', v => { if (audioEngine) audioEngine.setNoiseEnabled(v); });
    wireSlider('brown-vol', v => {
      if (audioEngine) audioEngine.setBrownVolume(v / 100);
      saveAudioSetting('brownVol', v);
    });
    wireSlider('pink-vol', v => {
      if (audioEngine) audioEngine.setPinkVolume(v / 100);
      saveAudioSetting('pinkVol', v);
    });
    wireSlider('white-vol', v => {
      if (audioEngine) audioEngine.setWhiteVolume(v / 100);
      saveAudioSetting('whiteVol', v);
    });

    // Drone
    wireToggle('drone-toggle', v => { if (audioEngine) audioEngine.setDroneEnabled(v); });
    wireSlider('drone-vol', v => {
      if (audioEngine) audioEngine.setDroneVolume(v / 100);
      saveAudioSetting('droneVol', v);
    });

    // Nature
    wireToggle('nature-toggle', v => { if (audioEngine) audioEngine.setNatureEnabled(v); });
    wireSlider('nature-vol', v => {
      if (audioEngine) audioEngine.setNatureVolume(v / 100);
      saveAudioSetting('natureVol', v);
    });
    document.querySelectorAll('.nature-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nature-btn[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (audioEngine) audioEngine.setNatureType(btn.dataset.type);
        saveAudioSetting('natureType', btn.dataset.type);
      });
    });

    // Music
    wireToggle('music-toggle', v => { if (audioEngine) audioEngine.setMusicEnabled(v); });
    wireSlider('arp-vol', v => {
      if (audioEngine) audioEngine.setArpVolume(v / 100);
      saveAudioSetting('arpVol', v);
    });
    wireSlider('pad-vol', v => {
      if (audioEngine) audioEngine.setPadVolume(v / 100);
      saveAudioSetting('padVol', v);
    });
    wireSlider('beat-vol', v => {
      if (audioEngine) audioEngine.setBeatVolume(v / 100);
      saveAudioSetting('beatVol', v);
    });
    document.querySelectorAll('.music-preset-btn[data-preset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.music-preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        const matchingMood = document.querySelector('.mood-btn[data-preset="' + btn.dataset.preset + '"]');
        if (matchingMood) matchingMood.classList.add('active');
        if (audioEngine) {
          if (!audioEngine.playing) { try { await audioEngine.init(); audioEngine.start(); } catch(e){} }
          audioEngine.setMusicEnabled(true);
          audioEngine.setMusicPreset(btn.dataset.preset);
          document.getElementById('music-toggle') && document.getElementById('music-toggle').classList.add('active');
          if (vizBG && vizBG.setGenre) vizBG.setGenre(btn.dataset.preset);
          // Sync BPM and swing sliders to the new preset
          const bpm = audioEngine.getBPM();
          const bpmSlider = document.getElementById('bpm-slider');
          const bpmVal = document.getElementById('bpm-val');
          if (bpmSlider) bpmSlider.value = Math.round(bpm);
          if (bpmVal) bpmVal.textContent = Math.round(bpm);
        }
        saveAudioSetting('musicPreset', btn.dataset.preset);
      });
    });

    // Mood buttons (sync with genre pills and presets)
    document.querySelectorAll('.mood-btn[data-preset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.music-preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
        const matchingPill = document.querySelector('.music-preset-btn[data-preset="' + btn.dataset.preset + '"]');
        if (matchingPill) matchingPill.classList.add('active');
        if (audioEngine) {
          if (!audioEngine.playing) { try { await audioEngine.init(); audioEngine.start(); } catch(e){} }
          audioEngine.setMusicEnabled(true);
          audioEngine.setMusicPreset(btn.dataset.preset);
          document.getElementById('music-toggle') && document.getElementById('music-toggle').classList.add('active');
          if (vizBG && vizBG.setGenre) vizBG.setGenre(btn.dataset.preset);
          // Sync BPM slider
          const bpm = audioEngine.getBPM();
          const bpmSlider = document.getElementById('bpm-slider');
          const bpmVal = document.getElementById('bpm-val');
          if (bpmSlider) bpmSlider.value = Math.round(bpm);
          if (bpmVal) bpmVal.textContent = Math.round(bpm);
        }
        saveAudioSetting('musicPreset', btn.dataset.preset);
      });
    });

    // ── Music Player (full media player) ──
    (function initMusicPlayer() {
      const trackList = document.getElementById('track-list');
      if (!trackList) return;

      let activeGenre = 'all';
      let dragSrcIndex = null;

      function getPlaylist() {
        if (audioEngine && audioEngine.initialized) return audioEngine.getPlaylist();
        return window.AudioEngine.TRACKS;
      }

      function renderTracks() {
        const playlist = getPlaylist();
        const filtered = activeGenre === 'all' ? playlist : playlist.filter(t => t.genre === activeGenre);
        const currentId = audioEngine ? audioEngine.getCurrentTrackId() : null;

        trackList.innerHTML = filtered.map((t, i) => {
          const isPlaying = t.id === currentId;
          const realIdx = playlist.indexOf(t);
          return '<div class="track-item' + (isPlaying ? ' playing' : '') + '" data-track="' + t.id + '" data-idx="' + realIdx + '" draggable="true">'
            + '<span class="track-item-drag" title="Drag to reorder">&#x2630;</span>'
            + '<button class="track-item-play">' + (isPlaying ? '&#9632;' : '&#9654;') + '</button>'
            + '<div class="track-item-info">'
            + '<div class="track-item-name">' + escapeHtml(t.name) + '</div>'
            + '<div class="track-item-genre">' + t.genre + '</div>'
            + '</div>'
            + (t.isCustom ? '<button class="track-item-remove" data-remove="' + t.id + '" title="Remove">&times;</button>' : '')
            + '</div>';
        }).join('');

        // Volume slider visibility
        const volGroup = document.getElementById('track-vol-group');
        if (volGroup) volGroup.style.display = currentId ? 'block' : 'none';

        // Now playing bar
        updateNowPlaying(currentId);

        // Play/pause button state
        const playBtn = document.getElementById('btn-track-play');
        if (playBtn) {
          playBtn.classList.toggle('playing', !!currentId);
        }
      }

      function updateNowPlaying(trackId) {
        const el = document.getElementById('now-playing');
        if (!el) return;
        if (!trackId) { el.style.display = 'none'; return; }
        const playlist = getPlaylist();
        const track = playlist.find(t => t.id === trackId);
        if (!track) { el.style.display = 'none'; return; }
        el.style.display = 'flex';
        const titleEl = document.getElementById('now-playing-title');
        const genreEl = document.getElementById('now-playing-genre');
        if (titleEl) titleEl.textContent = track.name;
        if (genreEl) genreEl.textContent = track.genre;
      }

      // Show neuroscience suggestion based on focus mode
      function updateMusicSuggestion() {
        const el = document.getElementById('music-suggestion');
        const textEl = document.getElementById('music-suggestion-text');
        if (!el || !textEl) return;
        const preset = selectedPreset || 'deep-work';
        const suggestions = window.AudioEngine.MUSIC_SUGGESTIONS;
        if (suggestions && suggestions[preset]) {
          textEl.textContent = suggestions[preset].tip;
          el.style.display = 'flex';
        } else {
          el.style.display = 'none';
        }
      }

      // Track list click handler (play/stop + remove)
      trackList.addEventListener('click', function(e) {
        // Remove button
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn && audioEngine) {
          const removeId = removeBtn.dataset.remove;
          audioEngine.removeCustomTrack(removeId);
          deleteCustomTrackFromDB(removeId);
          renderTracks();
          return;
        }
        // Play/stop
        const item = e.target.closest('.track-item');
        if (!item || !audioEngine || e.target.closest('.track-item-drag')) return;
        const trackId = item.dataset.track;
        if (audioEngine.getCurrentTrackId() === trackId) {
          audioEngine.stopTrack();
        } else {
          audioEngine.playTrack(trackId);
        }
        renderTracks();
      });

      // Drag & drop reorder
      trackList.addEventListener('dragstart', function(e) {
        const item = e.target.closest('.track-item');
        if (!item) return;
        dragSrcIndex = parseInt(item.dataset.idx);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      trackList.addEventListener('dragover', function(e) {
        e.preventDefault();
        const item = e.target.closest('.track-item');
        if (item) item.classList.add('drag-over');
      });
      trackList.addEventListener('dragleave', function(e) {
        const item = e.target.closest('.track-item');
        if (item) item.classList.remove('drag-over');
      });
      trackList.addEventListener('drop', function(e) {
        e.preventDefault();
        const item = e.target.closest('.track-item');
        if (!item || !audioEngine) return;
        item.classList.remove('drag-over');
        const toIndex = parseInt(item.dataset.idx);
        if (dragSrcIndex !== null && dragSrcIndex !== toIndex) {
          audioEngine.moveTrack(dragSrcIndex, toIndex);
          renderTracks();
        }
        dragSrcIndex = null;
      });
      trackList.addEventListener('dragend', function() {
        trackList.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        dragSrcIndex = null;
      });

      // Genre filter tabs
      document.querySelectorAll('.track-genre-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.track-genre-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeGenre = tab.dataset.genre;
          renderTracks();
        });
      });

      // Transport: Play/Pause
      const btnPlay = document.getElementById('btn-track-play');
      if (btnPlay) btnPlay.addEventListener('click', () => {
        if (!audioEngine) return;
        if (audioEngine.getCurrentTrackId()) {
          audioEngine.stopTrack();
        } else {
          // Play first track in playlist
          const playlist = getPlaylist();
          if (playlist.length > 0) audioEngine.playTrack(playlist[0].id);
        }
        renderTracks();
      });

      // Transport: Next
      const btnNext = document.getElementById('btn-next');
      if (btnNext) btnNext.addEventListener('click', () => {
        if (audioEngine) { audioEngine.playNext(); renderTracks(); }
      });

      // Transport: Previous
      const btnPrev = document.getElementById('btn-prev');
      if (btnPrev) btnPrev.addEventListener('click', () => {
        if (audioEngine) { audioEngine.playPrev(); renderTracks(); }
      });

      // Transport: Shuffle
      const btnShuffle = document.getElementById('btn-shuffle');
      if (btnShuffle) btnShuffle.addEventListener('click', () => {
        if (!audioEngine) return;
        const shuffled = audioEngine.toggleShuffle();
        btnShuffle.classList.toggle('active', shuffled);
        showToast(shuffled ? 'Shuffle on' : 'Shuffle off');
      });

      // Transport: Loop
      const btnLoop = document.getElementById('btn-loop');
      if (btnLoop) btnLoop.addEventListener('click', () => {
        if (!audioEngine) return;
        const mode = audioEngine.cycleLoopMode();
        btnLoop.className = 'player-btn player-btn-sm';
        if (mode === 'all') { btnLoop.classList.add('loop-all'); showToast('Loop all'); }
        else if (mode === 'one') { btnLoop.classList.add('loop-one'); showToast('Loop one'); }
        else { showToast('Loop off'); }
      });

      // Add custom tracks
      const btnAdd = document.getElementById('btn-add-track');
      const fileInput = document.getElementById('track-file-input');
      if (btnAdd && fileInput) {
        btnAdd.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (!fileInput.files.length) return;
          const files = Array.from(fileInput.files);
          fileInput.value = '';

          // Show genre selection modal
          const backdrop = document.getElementById('upload-genre-backdrop');
          if (!backdrop) {
            // Fallback: add without genre selection
            if (!audioEngine) return;
            files.forEach(f => audioEngine.addCustomTrack(f, 'custom'));
            renderTracks();
            showToast(files.length + ' track(s) added');
            return;
          }

          let selectedGenre = 'custom';
          backdrop.style.display = '';
          backdrop.querySelectorAll('.upload-genre-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.genre === 'custom');
            btn.onclick = () => {
              selectedGenre = btn.dataset.genre;
              backdrop.querySelectorAll('.upload-genre-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
            };
          });

          const doAdd = async () => {
            backdrop.style.display = 'none';
            if (!audioEngine) return;
            for (const file of files) {
              const track = audioEngine.addCustomTrack(file, selectedGenre);
              await saveCustomTrackToDB(file, track.id, track.name, track.genre);
            }
            // Switch to selected genre tab
            document.querySelectorAll('.track-genre-tab').forEach(t => t.classList.remove('active'));
            const genreTab = document.querySelector('.track-genre-tab[data-genre="' + selectedGenre + '"]');
            if (genreTab) genreTab.classList.add('active');
            activeGenre = selectedGenre;
            renderTracks();
            showToast(files.length + ' track(s) added');
          };

          document.getElementById('upload-genre-confirm').onclick = doAdd;
          document.getElementById('upload-genre-cancel').onclick = () => {
            backdrop.style.display = 'none';
          };
        });
      }

      // Track volume
      wireSlider('track-vol', v => {
        if (audioEngine) audioEngine.setTrackVolume(v / 100);
      });

      // Initial render
      renderTracks();
      updateMusicSuggestion();

      // Expose for external updates
      window._renderTrackList = renderTracks;
      window._updateMusicSuggestion = updateMusicSuggestion;
    })();

    // Bass volume
    wireSlider('bass-vol', v => {
      if (audioEngine && audioEngine._nodes && audioEngine._nodes.bassGain) {
        audioEngine._nodes.bassGain.gain.rampTo(v / 100, 0.05);
      }
      saveAudioSetting('bassVol', v);
    });

    // BPM control
    wireSlider('bpm-slider', v => {
      if (audioEngine) audioEngine.setBPM(v);
      saveAudioSetting('bpm', v);
    });

    // Swing control
    wireSlider('swing-slider', v => {
      if (audioEngine) audioEngine.setSwing(v / 100);
      saveAudioSetting('swing', v);
    });

    // Bass filter cutoff
    wireSlider('bass-cutoff', v => {
      if (audioEngine) audioEngine.setBassFilterCutoff(v);
      saveAudioSetting('bassCutoff', v);
    });

    // Bass filter resonance
    wireSlider('bass-reso', v => {
      if (audioEngine) audioEngine.setBassFilterResonance(parseFloat(v));
      saveAudioSetting('bassReso', v);
    });

    // Reverb mix
    wireSlider('reverb-slider', v => {
      if (audioEngine) audioEngine.setReverbMix(v / 100);
      saveAudioSetting('reverbMix', v);
    });

    // Delay mix
    wireSlider('delay-slider', v => {
      if (audioEngine) audioEngine.setDelayMix(v / 100);
      saveAudioSetting('delayMix', v);
    });

    // Density
    wireSlider('density-slider', v => {
      if (audioEngine) audioEngine.setDensity(v / 100);
      saveAudioSetting('density', v);
    });

    // Pad Attack
    wireSlider('pad-attack-slider', v => {
      if (audioEngine) audioEngine.setPadAttack(v / 100);
      saveAudioSetting('padAttack', v);
    });

    // Arp pattern buttons
    document.querySelectorAll('.arp-pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.arp-pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pattern = btn.dataset.pattern;
        if (audioEngine) audioEngine.setArpPattern(pattern);
        saveAudioSetting('arpPattern', pattern);
      });
    });

    // Key select
    const keySelect = document.getElementById('key-select');
    if (keySelect) {
      keySelect.addEventListener('change', () => {
        if (audioEngine) audioEngine.setKeyTranspose(parseInt(keySelect.value));
        saveAudioSetting('keyTranspose', keySelect.value);
      });
    }

    // Progression select
    const progSelect = document.getElementById('progression-select');
    if (progSelect) {
      progSelect.addEventListener('change', () => {
        if (audioEngine) audioEngine.setProgression(progSelect.value);
        saveAudioSetting('progression', progSelect.value);
      });
    }

    // Melody toggle
    const melodyToggle = document.getElementById('melody-toggle');
    if (melodyToggle) {
      melodyToggle.addEventListener('click', () => {
        melodyToggle.classList.toggle('active');
        const enabled = melodyToggle.classList.contains('active');
        if (audioEngine) audioEngine.setMelodyEnabled(enabled);
        saveAudioSetting('melodyEnabled', enabled);
      });
    }

    // Melody volume
    wireSlider('melody-vol', v => {
      if (audioEngine) audioEngine.setMelodyVolume(v / 100);
      saveAudioSetting('melodyVol', v);
    });

    // Melody style buttons
    document.querySelectorAll('.melody-style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.melody-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const style = btn.dataset.style;
        if (audioEngine) audioEngine.setMelodyStyle(style);
        saveAudioSetting('melodyStyle', style);
      });
    });

    // Regenerate button
    const btnRegen = document.getElementById('btn-regenerate');
    if (btnRegen) {
      btnRegen.addEventListener('click', () => {
        if (audioEngine && audioEngine.regenerate) {
          audioEngine.regenerate();
          // Visual feedback - spin the icon
          btnRegen.classList.add('spinning');
          setTimeout(() => btnRegen.classList.remove('spinning'), 600);
          showToast('New variation generated');
        }
      });
    }

    // Task management
    initTaskManagement();

    // Session notes - auto-save on blur
    const notesEl = document.getElementById('session-notes');
    if (notesEl) {
      notesEl.addEventListener('blur', () => {
        saveAudioSetting('sessionNotes', notesEl.value);
      });
    }

    // Fullscreen
    const btnFs = document.getElementById('btn-fullscreen');
    if (btnFs) btnFs.addEventListener('click', toggleFullscreen);

    // Mic visualizer toggle
    const btnMic = document.getElementById('btn-mic-viz');
    if (btnMic) {
      btnMic.addEventListener('click', async () => {
        if (!micVizActive) {
          try {
            if (!micAnalyser) micAnalyser = new window.MicAnalyser();
            await micAnalyser.start();
            micVizActive = true;
            btnMic.classList.add('mic-active');
            btnMic.title = 'Stop mic sync';
            if (vizBG && vizBG.setMicMode) vizBG.setMicMode(true);
            showToast('Mic sync on — visuals reacting to sound');
          } catch (e) {
            showToast('Mic access denied');
          }
        } else {
          micVizActive = false;
          if (micAnalyser) micAnalyser.stop();
          btnMic.classList.remove('mic-active');
          btnMic.title = 'Sync visuals to microphone';
          if (vizBG && vizBG.setMicMode) vizBG.setMicMode(false);
          showToast('Mic sync off');
        }
      });
    }

    // Panel toggle buttons
    const fabMusic = document.getElementById('fab-music');
    if (fabMusic) fabMusic.addEventListener('click', () => togglePanel('panel-music'));

    const fabTasks = document.getElementById('fab-tasks');
    if (fabTasks) fabTasks.addEventListener('click', () => togglePanel('panel-tasks'));

    const fabNotes = document.getElementById('fab-notes');
    if (fabNotes) {
      fabNotes.addEventListener('click', () => {
        togglePanel('panel-tasks');
        // Focus the notes textarea when panel opens
        setTimeout(() => {
          const notes = document.getElementById('session-notes');
          if (notes) notes.focus();
        }, 400);
      });
    }

    // Panel close buttons
    document.querySelectorAll('.panel-close[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => closePanel(btn.dataset.panel));
    });

    // Backdrop click to close
    const backdrop = document.getElementById('panel-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => closeAllPanels());
    }

    // Sound panel tabs
    document.querySelectorAll('#sound-panel-tabs .panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#sound-panel-tabs .panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetTab = tab.dataset.tab;
        document.querySelectorAll('#panel-music .panel-tab-content').forEach(content => {
          content.classList.toggle('active', content.dataset.tabContent === targetTab);
        });
      });
    });

    // Dashboard button in topbar
    document.querySelectorAll('.focus-topbar-actions [data-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        showScreen(btn.dataset.screen);
        if (btn.dataset.screen === 'screen-dashboard') refreshDashboard();
      });
    });
  }

  // ─── Panel Management ──────────────────────────────────────────────

  function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const backdrop = document.getElementById('panel-backdrop');
    if (!panel) return;

    const isOpen = panel.classList.contains('open');

    // Close other panels first
    document.querySelectorAll('.slide-panel.open').forEach(p => {
      if (p.id !== panelId) p.classList.remove('open');
    });

    if (isOpen) {
      panel.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
    } else {
      panel.classList.add('open');
      if (backdrop) backdrop.classList.add('visible');
    }
  }

  function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    const backdrop = document.getElementById('panel-backdrop');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('visible');
  }

  function closeAllPanels() {
    document.querySelectorAll('.slide-panel.open').forEach(p => p.classList.remove('open'));
    const backdrop = document.getElementById('panel-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  }

  // ─── Helper: Wire Toggle & Slider ───────────────────────────────────

  function wireToggle(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', async () => {
      const active = el.classList.toggle('active');
      // Auto-init audio engine if it hasn't been started yet
      // (all setXxxEnabled methods are no-ops when !audioEngine.playing)
      if (active && audioEngine && !audioEngine.playing) {
        try {
          await audioEngine.init();
          audioEngine.start();
        } catch (e) { /* audio context may already be running */ }
      }
      callback(active);
    });
    if (el.type === 'checkbox') {
      el.removeEventListener('click', el._handler);
      el.addEventListener('change', () => callback(el.checked));
    }
  }

  function wireSlider(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    const valEl = document.getElementById(id + '-val');
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (valEl) valEl.textContent = Number.isInteger(v) ? v : v.toFixed(1);
      callback(v);
    });
  }

  // ─── Audio Toggle UI Sync ───────────────────────────────────────────

  function syncAudioToggleUI() {
    if (!audioEngine) return;
    const map = {
      'binaural-toggle': audioEngine._binauralEnabled,
      'noise-toggle':    audioEngine._noiseEnabled,
      'drone-toggle':    audioEngine._droneEnabled,
      'nature-toggle':   audioEngine._natureEnabled,
      'music-toggle':    audioEngine._musicEnabled,
    };
    Object.entries(map).forEach(([id, enabled]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', !!enabled);
    });
  }

  // ─── Audio Settings Persistence ─────────────────────────────────────

  function saveAudioSetting(key, value) {
    sessionManager.setSetting('audio_' + key, value);
  }

  function restoreAudioSettings() {
    const mappings = [
      ['masterVol', 'master-vol', v => audioEngine.setMasterVolume(v / 100)],
      ['binauralVol', 'binaural-vol', v => audioEngine.setBinauralVolume(v / 100)],
      ['brownVol', 'brown-vol', v => audioEngine.setBrownVolume(v / 100)],
      ['pinkVol', 'pink-vol', v => audioEngine.setPinkVolume(v / 100)],
      ['whiteVol', 'white-vol', v => audioEngine.setWhiteVolume(v / 100)],
      ['droneVol', 'drone-vol', v => audioEngine.setDroneVolume(v / 100)],
      ['natureVol', 'nature-vol', v => audioEngine.setNatureVolume(v / 100)],
      ['arpVol', 'arp-vol', v => audioEngine.setArpVolume(v / 100)],
      ['padVol', 'pad-vol', v => audioEngine.setPadVolume(v / 100)],
      ['beatVol', 'beat-vol', v => audioEngine.setBeatVolume(v / 100)],
      ['bassVol', 'bass-vol', v => { if (audioEngine._nodes && audioEngine._nodes.bassGain) audioEngine._nodes.bassGain.gain.rampTo(v / 100, 0.05); }],
      ['bpm', 'bpm-slider', v => audioEngine.setBPM(v)],
      ['swing', 'swing-slider', v => audioEngine.setSwing(v / 100)],
      ['bassCutoff', 'bass-cutoff', v => audioEngine.setBassFilterCutoff(v)],
      ['bassReso', 'bass-reso', v => audioEngine.setBassFilterResonance(parseFloat(v))],
      ['reverbMix', 'reverb-slider', v => audioEngine.setReverbMix(v / 100)],
      ['delayMix', 'delay-slider', v => audioEngine.setDelayMix(v / 100)],
      ['density', 'density-slider', v => audioEngine.setDensity(v / 100)],
      ['padAttack', 'pad-attack-slider', v => audioEngine.setPadAttack(v / 100)],
      ['melodyVol', 'melody-vol', v => audioEngine.setMelodyVolume(v / 100)],
    ];

    mappings.forEach(([key, sliderId, fn]) => {
      const saved = sessionManager.getSetting('audio_' + key, null);
      if (saved !== null) {
        const slider = document.getElementById(sliderId);
        const valEl = document.getElementById(sliderId + '-val');
        if (slider) slider.value = saved;
        if (valEl) valEl.textContent = saved;
        try { fn(parseInt(saved, 10)); } catch (e) { /* ignore */ }
      }
    });

    // Restore arp pattern
    const savedArpPattern = sessionManager.getSetting('audio_arpPattern', null);
    if (savedArpPattern) {
      audioEngine.setArpPattern(savedArpPattern);
      document.querySelectorAll('.arp-pattern-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pattern === savedArpPattern);
      });
    }

    // Restore key & progression
    const savedKey = sessionManager.getSetting('audio_keyTranspose', null);
    if (savedKey !== null) {
      audioEngine.setKeyTranspose(parseInt(savedKey));
      const keyEl = document.getElementById('key-select');
      if (keyEl) keyEl.value = savedKey;
    }
    const savedProg = sessionManager.getSetting('audio_progression', null);
    if (savedProg) {
      audioEngine.setProgression(savedProg);
      const progEl = document.getElementById('progression-select');
      if (progEl) progEl.value = savedProg;
    }

    // Restore melody
    const savedMelodyEnabled = sessionManager.getSetting('audio_melodyEnabled', null);
    if (savedMelodyEnabled === true || savedMelodyEnabled === 'true') {
      audioEngine.setMelodyEnabled(true);
      const mt = document.getElementById('melody-toggle');
      if (mt) mt.classList.add('active');
    }
    const savedMelodyStyle = sessionManager.getSetting('audio_melodyStyle', null);
    if (savedMelodyStyle) {
      audioEngine.setMelodyStyle(savedMelodyStyle);
      document.querySelectorAll('.melody-style-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.style === savedMelodyStyle);
      });
    }

    const savedFreq = sessionManager.getSetting('audio_binauralFreq', null);
    if (savedFreq !== null) {
      audioEngine.setBinauralFrequency(parseFloat(savedFreq));
      updateBrainwaveTheme(parseFloat(savedFreq));
    }

    const savedNatureType = sessionManager.getSetting('audio_natureType', null);
    if (savedNatureType) audioEngine.setNatureType(savedNatureType);

    const savedMusicPreset = sessionManager.getSetting('audio_musicPreset', null);
    if (savedMusicPreset) audioEngine.setMusicPreset(savedMusicPreset);
  }

  // ─── Music Preview ─────────────────────────────────────────────────

  let previewTimeout = null;

  async function previewMusic(focusPreset) {
    // Map focus presets to music presets
    const musicMap = {
      'deep-work': 'minimal',
      'creative': 'ambienttechno',
      'study': 'deephouse',
      'meditation': 'dubtechno',
      'energy': 'hardtechno'
    };
    const musicPreset = musicMap[focusPreset] || 'minimal';

    // Initialize audio if needed
    if (!audioEngine.initialized) {
      try { await audioEngine.init(); } catch(e) { return; }
    }

    // Stop any current preview
    if (previewTimeout) clearTimeout(previewTimeout);
    if (audioEngine.playing) await audioEngine.stop();

    // Apply the music preset
    audioEngine.setMusicEnabled(true);
    audioEngine.setMusicPreset(musicPreset);
    audioEngine.setMasterVolume(0.5); // lower volume for preview

    // Also update visualizer
    if (vizBG && vizBG.setGenre) vizBG.setGenre(musicPreset);

    // Start playing
    audioEngine.start();
    startVisualizer();

    // Auto-stop preview after 8 seconds
    previewTimeout = setTimeout(async () => {
      if (audioEngine.playing) await audioEngine.stop();
    }, 8000);
  }

  // ─── Background Theme ───────────────────────────────────────────────

  function updateBrainwaveTheme(freq) {
    document.body.classList.remove('theme-theta', 'theme-alpha', 'theme-beta', 'theme-gamma');
    if (freq < 8) document.body.classList.add('theme-theta');
    else if (freq < 12) document.body.classList.add('theme-alpha');
    else if (freq < 30) document.body.classList.add('theme-beta');
    else document.body.classList.add('theme-gamma');
    if (vizBG) {
      if (freq < 8) vizBG.setTheme('theta');
      else if (freq < 12) vizBG.setTheme('alpha');
      else if (freq < 30) vizBG.setTheme('beta');
      else vizBG.setTheme('gamma');
      if (vizBG.setGenre) vizBG.setGenre(audioEngine?._musicPreset || 'minimal');
    }
  }

  // ─── Visualizer ─────────────────────────────────────────────────────

  const vizBars = [];

  function initVisualizer() {
    const container = document.getElementById('visualizer');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement('div');
      bar.className = 'viz-bar';
      bar.style.height = '4px';
      container.appendChild(bar);
      vizBars.push(bar);
    }
  }

  function startVisualizer() {
    cancelAnimationFrame(vizAnimFrame);
    updateVisualizer();
  }

  function updateVisualizer() {
    if (vizBG) {
      let freqData = null, waveData = null;

      if (micVizActive && micAnalyser && micAnalyser.active) {
        // Mic mode: drive visuals entirely from microphone input
        freqData = micAnalyser.getFrequencyData();
        waveData = micAnalyser.getWaveformData();
      } else if (audioEngine && audioEngine.playing) {
        freqData = audioEngine.getFrequencyData();
        waveData = audioEngine.getWaveformData();
      }

      vizBG.update(freqData, waveData);
    }

    if (!audioEngine || !audioEngine.playing) {
      vizBars.forEach(bar => { bar.style.height = '4px'; });
      vizAnimFrame = requestAnimationFrame(updateVisualizer);
      return;
    }
    const data = audioEngine.getFrequencyData();
    if (data) {
      vizBars.forEach((bar, i) => {
        const idx = Math.floor(i * data.length / vizBars.length);
        const val = (data[idx] + 140) / 140; // FFT dB normalize
        bar.style.height = Math.max(4, val * 50) + 'px';
      });
    }
    vizAnimFrame = requestAnimationFrame(updateVisualizer);
  }

  // ─── Task Management ────────────────────────────────────────────────

  function initTaskManagement() {
    const input = document.getElementById('task-input');
    const btnAdd = document.getElementById('btn-add-task');

    function addTask() {
      const text = (input?.value || '').trim();
      if (!text) return;
      sessionManager.addTask(text);
      input.value = '';
      renderTasks();
    }

    if (btnAdd) btnAdd.addEventListener('click', addTask);
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addTask(); }
      });
    }
  }

  function renderTasks() {
    const list = document.getElementById('task-list');
    if (!list) return;
    list.innerHTML = '';
    const tasks = sessionManager.getTasks();
    if (tasks.length === 0) {
      list.innerHTML =
        '<div class="task-empty-state">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
          '<p>No tasks yet. Break your goal into small tasks to stay on track.</p>' +
        '</div>';
      return;
    }
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '');
      li.innerHTML =
        '<label class="task-check">' +
          '<input type="checkbox"' + (task.done ? ' checked' : '') + '>' +
          '<span class="task-text">' + escapeHtml(task.text) + '</span>' +
        '</label>' +
        '<button class="task-remove" title="Remove">&times;</button>';

      li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
        sessionManager.toggleTask(task.id);
        renderTasks();
      });
      li.querySelector('.task-remove').addEventListener('click', () => {
        sessionManager.removeTask(task.id);
        renderTasks();
      });

      list.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Breathing Exercise ─────────────────────────────────────────────

  function initBreathingExercise() {
    const skipBtn = document.getElementById('breathing-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        stopBreathingExercise();
        if (breathingCallback) breathingCallback();
      });
    }
  }

  let breathingCallback = null;

  function startBreathingExercise(onComplete) {
    breathingCallback = onComplete;
    const overlay = document.getElementById('breathing-overlay');
    if (!overlay) { onComplete(); return; }
    overlay.classList.add('active');
    // Reset intro visibility
    const intro = document.getElementById('breathing-intro');
    if (intro) intro.style.display = '';
    runBreathingCycle(0, 3, onComplete);
  }

  function runBreathingCycle(cycle, total, onComplete) {
    if (cycle >= total) {
      stopBreathingExercise();
      onComplete();
      return;
    }

    // Hide intro after first cycle starts
    if (cycle > 0) {
      const intro = document.getElementById('breathing-intro');
      if (intro) intro.style.display = 'none';
    }

    const circle = document.getElementById('breathing-circle');
    const text = document.getElementById('breathing-text');

    // Phase 1: Inhale (4s)
    if (circle) { circle.className = 'breathe-in'; }
    animateCountdown(text, 'Breathe in...', 4, () => {
      // Phase 2: Hold (7s)
      if (circle) { circle.className = 'breathe-hold'; }
      animateCountdown(text, 'Hold...', 7, () => {
        // Phase 3: Exhale (8s)
        if (circle) { circle.className = 'breathe-out'; }
        animateCountdown(text, 'Breathe out...', 8, () => {
          runBreathingCycle(cycle + 1, total, onComplete);
        });
      });
    });
  }

  function animateCountdown(el, label, seconds, onDone) {
    let count = seconds;
    if (el) el.textContent = label + ' ' + count;
    const id = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(id);
        onDone();
      } else {
        if (el) el.textContent = label + ' ' + count;
      }
    }, 1000);
    breathingTimeout = id;
  }

  function stopBreathingExercise() {
    clearInterval(breathingTimeout);
    const overlay = document.getElementById('breathing-overlay');
    if (overlay) overlay.classList.remove('active');
    const circle = document.getElementById('breathing-circle');
    if (circle) circle.className = '';
  }

  // ─── End Session Confirmation ────────────────────────────────────────

  function confirmEndSession() {
    const elapsed = sessionManager.getElapsedSeconds();
    // If session is very short (<30s), skip confirmation
    if (elapsed < 30) {
      completeSession();
      return;
    }
    const backdrop = document.getElementById('confirm-end-backdrop');
    if (backdrop) backdrop.classList.add('visible');
  }

  // ─── Session Complete ───────────────────────────────────────────────

  function completeSession() {
    stopTimer();
    if (audioEngine && audioEngine.playing) audioEngine.stop();
    cancelAnimationFrame(vizAnimFrame);

    const session = sessionManager.getActiveSession();
    const elapsed = session ? sessionManager.getElapsedSeconds() : 0;
    const tasks = sessionManager.getTasks();
    const completedTasks = tasks.filter(t => t.done).length;

    // Gather notes
    const focusNotes = document.getElementById('session-notes')?.value || '';

    sessionManager.endSession(focusNotes);

    // Populate complete screen
    const durationEl = document.getElementById('complete-duration');
    if (durationEl) {
      const mins = Math.floor(elapsed / 60);
      durationEl.textContent = mins + ' minute' + (mins !== 1 ? 's' : '');
    }

    const tasksEl = document.getElementById('complete-tasks');
    if (tasksEl) tasksEl.textContent = completedTasks + ' / ' + tasks.length + ' tasks completed';

    const goalEl = document.getElementById('complete-goal');
    if (goalEl) goalEl.textContent = session?.goal || '';

    const notesEl = document.getElementById('complete-notes');
    if (notesEl) notesEl.value = focusNotes;

    // Hide pause overlay if visible
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.remove('visible');

    showScreen('screen-complete');
    launchConfetti();
  }

  function initCompleteScreen() {
    const btnNew = document.getElementById('btn-new-session');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        showScreen('screen-welcome');
        showRandomTip();
        resetWelcomeForm();
      });
    }

    const btnDash = document.getElementById('btn-view-dashboard');
    if (btnDash) {
      btnDash.addEventListener('click', () => {
        showScreen('screen-dashboard');
        refreshDashboard();
      });
    }
  }

  function resetWelcomeForm() {
    const goalInput = document.getElementById('goal-input');
    if (goalInput) goalInput.value = '';
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
    // Re-activate 25 min default
    const defaultTimerBtn = document.querySelector('.timer-preset-btn[data-minutes="25"]');
    if (defaultTimerBtn) defaultTimerBtn.classList.add('active');
    selectedPreset = null;
    selectedTimerMinutes = 25;
  }

  // ─── Dashboard ──────────────────────────────────────────────────────

  function initDashboard() {
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', () => sessionManager.downloadExport());

    // Nav tabs also refresh dashboard when switching to it
  }

  function refreshDashboard() {
    // Today stats
    const today = sessionManager.getTodayStats();
    setTextIfExists('stat-today-sessions', today.sessions ?? 0);
    setTextIfExists('stat-today-minutes', today.minutes ?? 0);

    const allTime = sessionManager.getAllTimeStats();
    setTextIfExists('stat-streak', allTime.streak ?? 0);
    setTextIfExists('stat-best-streak', allTime.bestStreak ?? 0);

    // Gamification
    renderGamification();

    // Weekly chart
    renderWeeklyChart();

    // History list
    renderHistory();
  }

  function renderGamification() {
    // Level & XP
    const gam = sessionManager.getGamificationStats();
    setTextIfExists('level-number', gam.level);
    setTextIfExists('rank-badge', gam.rank);
    setTextIfExists('xp-current', gam.xpInLevel);
    setTextIfExists('xp-next', gam.xpForNext);
    setTextIfExists('total-xp', gam.totalXP.toLocaleString());

    const xpFill = document.getElementById('xp-bar-fill');
    if (xpFill) {
      const pct = gam.xpForNext > 0 ? (gam.xpInLevel / gam.xpForNext) * 100 : 0;
      xpFill.style.width = pct + '%';
    }

    // Daily goal ring
    const goalData = sessionManager.getDailyGoalProgress();
    setTextIfExists('goal-ring-percent', goalData.percent + '%');
    const ringFill = document.getElementById('goal-ring-fill');
    if (ringFill) {
      const circumference = 326.7;
      const offset = circumference - (circumference * goalData.percent / 100);
      ringFill.style.strokeDashoffset = offset;
    }

    // Achievements
    const achievements = sessionManager.getAchievements();
    const unlocked = achievements.filter(a => a.unlocked).length;
    setTextIfExists('achievements-count', unlocked + '/' + achievements.length);

    const grid = document.getElementById('achievements-grid');
    if (grid) {
      grid.innerHTML = '';
      achievements.forEach(a => {
        const card = document.createElement('div');
        card.className = 'achievement-card' + (a.unlocked ? ' unlocked' : ' locked');
        card.title = a.desc;
        card.innerHTML =
          '<div class="achievement-icon">' + a.icon + '</div>' +
          '<div class="achievement-name">' + escapeHtml(a.name) + '</div>';
        grid.appendChild(card);
      });
    }
  }

  function setTextIfExists(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderWeeklyChart() {
    const container = document.getElementById('weekly-chart');
    if (!container) return;
    container.innerHTML = '';

    const weekly = sessionManager.getWeeklyStats();
    if (!weekly || !weekly.length) {
      container.innerHTML = '<p class="empty-state">No data this week</p>';
      return;
    }

    const maxMin = Math.max(...weekly.map(d => d.minutes || 0), 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    weekly.forEach((day, i) => {
      const col = document.createElement('div');
      col.className = 'chart-col';

      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const pct = ((day.minutes || 0) / maxMin) * 100;
      bar.style.height = Math.max(4, pct) + '%';
      bar.title = (day.minutes || 0) + ' min';

      const label = document.createElement('span');
      label.className = 'chart-label';
      label.textContent = days[i] || day.day || '';

      col.appendChild(bar);
      col.appendChild(label);
      container.appendChild(col);
    });
  }

  function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';

    const history = sessionManager.getSessionHistory(20);
    if (!history || !history.length) {
      list.innerHTML = '<p class="empty-state">No sessions yet</p>';
      return;
    }

    history.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const date = new Date(session.startedAt || session.startTime || session.date);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const mins = session.focusMinutes || Math.floor((session.duration || 0) / 60);
      const goal = (session.goal || 'No goal').substring(0, 60);

      item.innerHTML =
        '<div class="history-meta">' +
          '<span class="history-date">' + dateStr + '</span>' +
          '<span class="history-duration">' + mins + ' min</span>' +
        '</div>' +
        '<div class="history-goal">' + escapeHtml(goal) + '</div>' +
        (session.preset ? '<span class="preset-badge">' + escapeHtml(session.preset) + '</span>' : '');

      list.appendChild(item);
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────

  function initNavigation() {
    document.querySelectorAll('.nav-tab[data-screen]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const screen = tab.dataset.screen;
        showScreen(screen);
        if (screen === 'screen-dashboard') refreshDashboard();
      });
    });
  }

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyT':
          togglePanel('panel-music');
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'Escape':
          if (document.querySelector('.slide-panel.open')) {
            closeAllPanels();
          } else {
            exitFullscreen();
          }
          break;
      }
    });
  }

  function toggleMute() {
    if (!audioEngine) return;
    const slider = document.getElementById('master-vol');
    if (isMuted) {
      audioEngine.setMasterVolume(preMuteVolume / 100);
      if (slider) slider.value = preMuteVolume;
      const valEl = document.getElementById('master-vol-val');
      if (valEl) valEl.textContent = preMuteVolume;
      isMuted = false;
    } else {
      preMuteVolume = slider ? parseInt(slider.value, 10) : 50;
      audioEngine.setMasterVolume(0);
      if (slider) slider.value = 0;
      const valEl = document.getElementById('master-vol-val');
      if (valEl) valEl.textContent = '0';
      isMuted = true;
    }
    showToast(isMuted ? 'Audio muted' : 'Audio unmuted');
  }

  // ─── Fullscreen / Zen Mode ──────────────────────────────────────────

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().then(() => {
        document.body.classList.add('zen-mode');
      }).catch(() => {});
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        document.body.classList.remove('zen-mode');
      }).catch(() => {});
    }
  }

  // Listen for fullscreen changes (e.g. user presses browser Esc)
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove('zen-mode');
    }
  });

  // ─── Session Restore ────────────────────────────────────────────────

  function restoreSession(session) {
    const goalText = document.getElementById('session-goal-text');
    if (goalText) goalText.textContent = session.goal || 'Untitled Session';
    updateTimerModeLabel(session.timerMode, session.timerDuration);

    // Restore notes
    const notesEl = document.getElementById('session-notes');
    const savedNotes = sessionManager.getSetting('audio_sessionNotes', '');
    if (notesEl && savedNotes) notesEl.value = savedNotes;

    renderTasks();

    selectedPreset = (session.preset && session.preset !== 'none') ? session.preset : null;

    // Start timer immediately so display shows correct elapsed time from saved session
    startTimer();
    tickTimer();
    startVisualizer();
    if (window._updateMusicSuggestion) window._updateMusicSuggestion();
    if (window._renderTrackList) window._renderTrackList();

    // Audio requires user interaction — try to start, then show resume banner if blocked
    audioEngine.init().then(() => {
      audioEngine.start();

      const savedTrackId = sessionManager.getSetting('session_trackId', '');
      if (savedTrackId) {
        // Session was started with a track — silence all layers, play track on loop
        audioEngine.setBinauralEnabled(false);
        audioEngine.setNoiseEnabled(false);
        audioEngine.setNatureEnabled(false);
        audioEngine.setDroneEnabled(false);
        while (audioEngine.getLoopMode() !== 'one') audioEngine.cycleLoopMode();
        audioEngine.playTrack(savedTrackId);
      } else if (selectedPreset) {
        // Session was started with a neural preset — apply it
        audioEngine.applyPreset(selectedPreset);
      } else {
        // No preset, no track — start silent
        audioEngine.setBinauralEnabled(false);
        audioEngine.setNoiseEnabled(false);
        audioEngine.setNatureEnabled(false);
        audioEngine.setDroneEnabled(false);
      }
      syncAudioToggleUI();
      restoreAudioSettings();
      hideAudioResumeBanner();
    }).catch(() => {
      showAudioResumeBanner();
    });

    // Show banner after a short delay; if audio started fine it will be hidden
    setTimeout(() => {
      if (!audioEngine.playing) showAudioResumeBanner();
    }, 800);
  }

  function showAudioResumeBanner() {
    let banner = document.getElementById('audio-resume-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'audio-resume-banner';
      banner.className = 'audio-resume-banner';
      banner.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Tap to resume audio';
      banner.addEventListener('click', () => {
        audioEngine.init().then(() => {
          audioEngine.start();
          const savedTrackId = sessionManager.getSetting('session_trackId', '');
          if (savedTrackId) {
            audioEngine.setBinauralEnabled(false);
            audioEngine.setNoiseEnabled(false);
            audioEngine.setNatureEnabled(false);
            audioEngine.setDroneEnabled(false);
            while (audioEngine.getLoopMode() !== 'one') audioEngine.cycleLoopMode();
            audioEngine.playTrack(savedTrackId);
          } else if (selectedPreset) {
            audioEngine.applyPreset(selectedPreset);
          }
          syncAudioToggleUI();
          restoreAudioSettings();
          hideAudioResumeBanner();
        }).catch(() => {});
      });
      document.getElementById('screen-focus')?.appendChild(banner);
    }
    banner.style.display = 'flex';
  }

  function hideAudioResumeBanner() {
    const banner = document.getElementById('audio-resume-banner');
    if (banner) banner.style.display = 'none';
  }

  // ─── Clap Detection ─────────────────────────────────────────────────

  function initClapDetection() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // browser doesn't support it

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (e) {
      const result = e.results[e.results.length - 1][0];
      const transcript = result.transcript.trim().toLowerCase();
      const confidence = result.confidence;

      // Require high confidence and an exact phrase match (not a substring of unrelated speech)
      const PHRASES = ['start the timer', 'start timer'];
      const exactMatch = PHRASES.some(p => transcript === p || transcript === p + '.' || transcript === p + '!');
      if (exactMatch && confidence > 0.7) {
        const welcomeScreen = document.getElementById('screen-welcome');
        if (welcomeScreen && welcomeScreen.classList.contains('active')) {
          beginSession();
        }
      }
    };

    recognition.onend = function () {
      // Restart so it keeps listening continuously
      try { recognition.start(); } catch (_) {}
    };

    try { recognition.start(); } catch (_) {}
  }

  // ─── Initialization ─────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    audioEngine = new window.AudioEngine();
    sessionManager = new window.SessionManager();

    // Restore persisted custom tracks
    restoreCustomTracksFromDB();

    // Check for active session
    const active = sessionManager.getActiveSession();
    if (active) {
      showScreen('screen-focus');
      restoreSession(active);
    } else {
      showScreen('screen-welcome');
    }

    // Wire up all modules
    initWelcomeScreen();
    initFocusScreen();
    initCompleteScreen();
    initDashboard();
    initNavigation();
    initKeyboardShortcuts();
    initBreathingExercise();
    initVisualizer();
    initClapDetection();
    if (window.VisualizerBG) {
      const bgEl = document.getElementById('bg-canvas');
      if (bgEl) {
        vizBG = new VisualizerBG(bgEl);
      }
    }

    // Mouse parallax for visualizer
    window.addEventListener('mousemove', function (e) {
      if (!vizBG) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      vizBG.setMousePosition(nx, ny);
    });

    // Click → particle burst + fractal ripple
    window.addEventListener('click', function (e) {
      if (!vizBG) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1); // flip Y for WebGL
      vizBG.triggerClick(nx, ny);
    });

    // Scroll → push camera closer/further for depth feel
    window.addEventListener('wheel', function (e) {
      if (!vizBG || !vizBG.camera) return;
      const delta = e.deltaY * 0.04;
      vizBG.camera.position.z = Math.max(35, Math.min(70, vizBG.camera.position.z + delta));
    }, { passive: true });

    // Genre-change → update CSS background accent
    const PALETTE_BG = {
      warm:   '40, 15, 5',
      cool:   '5, 10, 35',
      neon:   '0, 20, 10',
      fire:   '40, 5, 0',
      ice:    '5, 20, 40',
      psyche: '25, 5, 30',
    };
    window.addEventListener('genre-change', function (e) {
      const rgb = PALETTE_BG[e.detail.palette] || '10, 10, 25';
      document.documentElement.style.setProperty('--genre-bg', rgb);
      document.body.dataset.genre = e.detail.genre;
    });

    showRandomTip();

    // No auto-select for neural preset — user must opt in explicitly

    // beforeunload warning during active session
    window.addEventListener('beforeunload', function (e) {
      if (sessionManager && sessionManager.getActiveSession() && timerInterval) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  });

})();
