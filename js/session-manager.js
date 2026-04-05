/**
 * SessionManager - Data persistence layer for Deep Focus Studio.
 * All data is stored in localStorage for static GitHub Pages deployment.
 * @module SessionManager
 */
class SessionManager {
  constructor() {
    /** @type {Array<Object>} All completed session records */
    this.sessions = this._load('dfs_sessions', []);
    /** @type {Object} User preferences */
    this.settings = this._load('dfs_settings', {});
    /** @type {Object|null} Currently active session */
    this.activeSession = this._load('dfs_active', null);
    /** @type {Array<Object>} Tasks for the current session */
    this.tasks = this._load('dfs_tasks', []);
  }

  // =========================================================================
  //  SESSION LIFECYCLE
  // =========================================================================

  /**
   * Start a new focus session.
   * @param {string} goal - What the user intends to accomplish.
   * @param {string} presetName - Sound/ambience preset name.
   * @param {'free'|'pomodoro'|'countdown'} timerMode - Timer behaviour.
   * @param {number} [timerDuration=0] - Duration in seconds (pomodoro/countdown).
   * @returns {Object} The newly created session object.
   */
  startSession(goal, presetName, timerMode, timerDuration) {
    if (this.activeSession) {
      console.warn('SessionManager: a session is already active.');
      return this.activeSession;
    }

    const session = {
      id: this._generateId(),
      goal: goal || '',
      preset: presetName || 'none',
      timerMode: timerMode || 'free',
      timerDuration: Number(timerDuration) || 0,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      totalPausedMs: 0,
      segments: [],
      tasks: [],
      notes: '',
      completed: false
    };

    this.activeSession = session;
    this.tasks = [];
    this._saveActive();
    this._saveTasks();
    return session;
  }

  /**
   * Pause the current active session. No-op if already paused or no session.
   */
  pauseSession() {
    if (!this.activeSession || this.activeSession.pausedAt) return;

    this.activeSession.pausedAt = new Date().toISOString();
    this._saveActive();
  }

  /**
   * Resume a paused session. No-op if not paused or no session.
   */
  resumeSession() {
    if (!this.activeSession || !this.activeSession.pausedAt) return;

    const pauseStart = new Date(this.activeSession.pausedAt).getTime();
    const now = Date.now();
    const pausedMs = Math.max(0, now - pauseStart);

    this.activeSession.totalPausedMs += pausedMs;
    this.activeSession.segments.push({
      start: this.activeSession.pausedAt,
      end: new Date().toISOString()
    });
    this.activeSession.pausedAt = null;
    this._saveActive();
  }

  /**
   * End the active session, compute stats, and archive it.
   * @param {string} [notes=''] - Optional session notes / reflection.
   * @returns {Object|null} The completed session with computed stats, or null.
   */
  endSession(notes) {
    if (!this.activeSession) return null;

    // If still paused, resume first so pause time is counted
    if (this.activeSession.pausedAt) {
      this.resumeSession();
    }

    const start = new Date(this.activeSession.startedAt).getTime();
    const end = Date.now();
    const totalMs = end - start;
    const focusMs = Math.max(0, totalMs - this.activeSession.totalPausedMs);
    const focusMinutes = Math.round(focusMs / 60000);

    this.activeSession.endedAt = new Date().toISOString();
    this.activeSession.completed = true;
    this.activeSession.notes = notes || '';
    this.activeSession.tasks = [...this.tasks];
    this.activeSession.totalMs = totalMs;
    this.activeSession.focusMs = focusMs;
    this.activeSession.focusMinutes = focusMinutes;

    const completed = { ...this.activeSession };
    this.sessions.push(completed);
    this.activeSession = null;
    this.tasks = [];

    this._saveSessions();
    this._saveActive();
    this._saveTasks();
    return completed;
  }

  /**
   * Return the active session object, or null.
   * @returns {Object|null}
   */
  getActiveSession() {
    return this.activeSession;
  }

  /**
   * Compute elapsed focus seconds for the active session (excluding pauses).
   * @returns {number}
   */
  getElapsedSeconds() {
    if (!this.activeSession) return 0;

    const start = new Date(this.activeSession.startedAt).getTime();
    const now = this.activeSession.pausedAt
      ? new Date(this.activeSession.pausedAt).getTime()
      : Date.now();

    return Math.max(0, Math.floor((now - start - this.activeSession.totalPausedMs) / 1000));
  }

  // =========================================================================
  //  TASK MANAGEMENT
  // =========================================================================

  /**
   * Add a task to the current session.
   * @param {string} text - Task description.
   * @returns {Object} The created task object.
   */
  addTask(text) {
    const task = {
      id: this._generateId(),
      text: (text || '').trim(),
      done: false,
      createdAt: new Date().toISOString()
    };
    this.tasks.push(task);
    this._saveTasks();
    return task;
  }

  /**
   * Toggle the done state of a task.
   * @param {string} id - Task id.
   * @returns {Object|null} The updated task, or null if not found.
   */
  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.done = !task.done;
    this._saveTasks();
    return task;
  }

  /**
   * Remove a task by id.
   * @param {string} id - Task id.
   */
  removeTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this._saveTasks();
  }

  /**
   * Return all current session tasks.
   * @returns {Array<Object>}
   */
  getTasks() {
    return this.tasks;
  }

  // =========================================================================
  //  STATISTICS
  // =========================================================================

  /**
   * Stats for today: session count, total focus minutes, current streak.
   * @returns {{ sessions: number, minutes: number, streak: number }}
   */
  getTodayStats() {
    const today = new Date().toDateString();
    const todaySessions = this.sessions.filter(
      s => new Date(s.startedAt).toDateString() === today
    );
    return {
      sessions: todaySessions.length,
      minutes: todaySessions.reduce((sum, s) => sum + (s.focusMinutes || 0), 0),
      streak: this._calculateStreak()
    };
  }

  /**
   * Per-day stats for the last 7 days.
   * @returns {Array<{ day: string, dateStr: string, sessions: number, minutes: number }>}
   */
  getWeeklyStats() {
    return this._rangeDayStats(7);
  }

  /**
   * Per-day stats for the last 30 days.
   * @returns {Array<{ date: string, sessions: number, minutes: number }>}
   */
  getMonthlyStats() {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const daySessions = this.sessions.filter(
        s => new Date(s.startedAt).toDateString() === dateStr
      );
      result.push({
        date: d.toISOString().split('T')[0],
        sessions: daySessions.length,
        minutes: daySessions.reduce((sum, s) => sum + (s.focusMinutes || 0), 0)
      });
    }
    return result;
  }

  /**
   * All-time aggregate statistics.
   * @returns {{ totalSessions: number, totalMinutes: number, longestSession: number, streak: number, bestStreak: number }}
   */
  getAllTimeStats() {
    return {
      totalSessions: this.sessions.length,
      totalMinutes: this.sessions.reduce((sum, s) => sum + (s.focusMinutes || 0), 0),
      longestSession: Math.max(0, ...this.sessions.map(s => s.focusMinutes || 0)),
      streak: this._calculateStreak(),
      bestStreak: this._calculateBestStreak()
    };
  }

  // =========================================================================
  //  SESSION HISTORY
  // =========================================================================

  /**
   * Return completed sessions, most recent first.
   * @param {number} [limit=50] - Max number to return.
   * @returns {Array<Object>}
   */
  getSessionHistory(limit = 50) {
    return [...this.sessions].reverse().slice(0, limit);
  }

  // =========================================================================
  //  DATA EXPORT
  // =========================================================================

  /**
   * Serialise all data as a JSON string.
   * @returns {string}
   */
  exportData() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      sessions: this.sessions,
      settings: this.settings,
      stats: this.getAllTimeStats()
    }, null, 2);
  }

  /**
   * Trigger a browser download of the exported JSON.
   */
  downloadExport() {
    const data = this.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deep-focus-export-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  //  SETTINGS
  // =========================================================================

  /**
   * Get a setting value.
   * @param {string} key
   * @param {*} defaultValue - Returned when key is not set.
   * @returns {*}
   */
  getSetting(key, defaultValue) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Set a setting value and persist immediately.
   * @param {string} key
   * @param {*} value
   */
  setSetting(key, value) {
    this.settings[key] = value;
    this._save('dfs_settings', this.settings);
  }

  // =========================================================================
  //  PRIVATE HELPERS
  // =========================================================================

  /**
   * Load and parse a localStorage key, returning fallback on failure.
   * @private
   */
  _load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('SessionManager: failed to load', key, e);
      return fallback;
    }
  }

  /**
   * Safely persist a value to localStorage.
   * @private
   */
  _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('SessionManager: localStorage save failed for', key, e);
    }
  }

  /** @private */
  _saveActive() { this._save('dfs_active', this.activeSession); }
  /** @private */
  _saveSessions() { this._save('dfs_sessions', this.sessions); }
  /** @private */
  _saveTasks() { this._save('dfs_tasks', this.tasks); }

  /**
   * Generate a unique ID with crypto.randomUUID fallback.
   * @private
   * @returns {string}
   */
  _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, function () {
      return ((Math.random() * 16) | 0).toString(16);
    }) + '-' + Date.now().toString(36);
  }

  /**
   * Current streak: consecutive days with at least one session, ending today
   * or yesterday (if today has no session yet).
   * @private
   * @returns {number}
   */
  _calculateStreak() {
    if (this.sessions.length === 0) return 0;

    const sessionDates = new Set(
      this.sessions.map(s => new Date(s.startedAt).toDateString())
    );

    let streak = 0;
    let d = new Date();

    // Allow today to be missing (day not over yet) - start from yesterday
    if (!sessionDates.has(d.toDateString())) {
      d.setDate(d.getDate() - 1);
      if (!sessionDates.has(d.toDateString())) return 0;
    }

    while (sessionDates.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    return streak;
  }

  /**
   * Best streak ever recorded.
   * @private
   * @returns {number}
   */
  _calculateBestStreak() {
    if (this.sessions.length === 0) return 0;

    const dates = [...new Set(
      this.sessions.map(s => new Date(s.startedAt).toISOString().split('T')[0])
    )].sort();

    let best = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }

  /**
   * Build per-day stats for the last N days.
   * @private
   */
  _rangeDayStats(n) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const daySessions = this.sessions.filter(
        s => new Date(s.startedAt).toDateString() === dateStr
      );
      result.push({
        day: dayNames[d.getDay()],
        dateStr: d.toISOString().split('T')[0],
        sessions: daySessions.length,
        minutes: daySessions.reduce((sum, s) => sum + (s.focusMinutes || 0), 0)
      });
    }
    return result;
  }
}

// Expose globally for non-module usage
window.SessionManager = SessionManager;
