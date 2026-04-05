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
  let selectedPreset = null;
  let selectedTimerMinutes = 25;
  let pomodoroCount = 0;
  let pomodoroOnBreak = false;
  let isMuted = false;
  let preMuteVolume = 50;

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
      });
    });

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
    const goal = (document.getElementById('goal-input')?.value || '').trim();
    const preset = selectedPreset || 'deep-work';
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
      if (preset) audioEngine.applyPreset(preset);
      restoreAudioSettings();
      startTimer();
      startVisualizer();
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

  function renderTimerDisplay(seconds) {
    const display = document.getElementById('timer-display');
    if (!display) return;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    display.textContent =
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' +
      String(s).padStart(2, '0');
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
      ? '<i class="fas fa-pause"></i>'
      : '<i class="fas fa-play"></i>';
  }

  function togglePlayPause() {
    const session = sessionManager.getActiveSession();
    if (!session) return;

    if (timerInterval) {
      stopTimer();
      sessionManager.pauseSession();
      if (audioEngine && audioEngine.playing) audioEngine.stop();
    } else {
      sessionManager.resumeSession();
      startTimer();
      if (audioEngine) {
        audioEngine.init().then(() => audioEngine.start()).catch(() => {});
      }
    }
  }

  // ─── Focus Screen Controls ──────────────────────────────────────────

  function initFocusScreen() {
    // Timer controls
    const btnToggle = document.getElementById('btn-timer-toggle');
    if (btnToggle) btnToggle.addEventListener('click', togglePlayPause);

    const btnReset = document.getElementById('btn-timer-reset');
    if (btnReset) btnReset.addEventListener('click', completeSession);

    // Master controls
    wireToggle('master-play', () => {
      if (!audioEngine) return;
      if (audioEngine.playing) {
        audioEngine.stop();
      } else {
        audioEngine.init().then(() => audioEngine.start()).catch(() => {});
      }
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
      btn.addEventListener('click', () => {
        document.querySelectorAll('.music-preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Sync mood button active state
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        const matchingMood = document.querySelector('.mood-btn[data-preset="' + btn.dataset.preset + '"]');
        if (matchingMood) matchingMood.classList.add('active');
        if (audioEngine) {
          audioEngine.setMusicPreset(btn.dataset.preset);
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
      btn.addEventListener('click', () => {
        // Update mood button active state
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Also sync genre pill active state
        document.querySelectorAll('.music-preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
        const matchingPill = document.querySelector('.music-preset-btn[data-preset="' + btn.dataset.preset + '"]');
        if (matchingPill) matchingPill.classList.add('active');
        // Apply preset
        if (audioEngine) {
          audioEngine.setMusicPreset(btn.dataset.preset);
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

    // Regenerate button
    const btnRegen = document.getElementById('btn-regenerate');
    if (btnRegen) {
      btnRegen.addEventListener('click', () => {
        if (audioEngine && audioEngine.regenerate) {
          audioEngine.regenerate();
          // Visual feedback - spin the icon
          btnRegen.classList.add('spinning');
          setTimeout(() => btnRegen.classList.remove('spinning'), 600);
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
  }

  // ─── Helper: Wire Toggle & Slider ───────────────────────────────────

  function wireToggle(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      const active = el.classList.toggle('active');
      callback(active);
    });
    // Support checkboxes too
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
    // Always update background visualizer (ambient mode when no audio)
    if (vizBG) {
      vizBG.update(
        audioEngine && audioEngine.playing ? audioEngine.getFrequencyData() : null,
        audioEngine && audioEngine.playing ? audioEngine.getWaveformData() : null
      );
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
    runBreathingCycle(0, 3, onComplete);
  }

  function runBreathingCycle(cycle, total, onComplete) {
    if (cycle >= total) {
      stopBreathingExercise();
      onComplete();
      return;
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

    showScreen('screen-complete');
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

    // Weekly chart
    renderWeeklyChart();

    // History list
    renderHistory();
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
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'Escape':
          exitFullscreen();
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

    audioEngine.init().then(() => {
      audioEngine.start();
      if (session.preset) audioEngine.applyPreset(session.preset);
      restoreAudioSettings();
      startTimer();
      startVisualizer();
    }).catch(() => {
      startTimer();
    });
  }

  // ─── Initialization ─────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    audioEngine = new window.AudioEngine();
    sessionManager = new window.SessionManager();

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
    if (window.VisualizerBG) {
      const bgEl = document.getElementById('bg-canvas');
      if (bgEl) {
        vizBG = new VisualizerBG(bgEl);
      }
    }
    showRandomTip();
  });

})();
