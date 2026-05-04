(function () {
  const PASSWORD = 'shindap';
  const STORAGE_KEY = 'sensorVibeKeyboardUnlocked';
  const CONTROL_KEYS = new Set([
    ' ', 'Space', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
    'z', 'Z', 'x', 'X',
    'Control', 'ControlLeft', 'ControlRight',
  ]);
  const ACTION_POINTER_EVENTS = [
    'click', 'mousedown', 'pointerdown', 'touchstart',
  ];
  const LOCKED_INPUT_VALUES = new Set([
    'keyboard',
    'mouse',
    'keyboard+mouse',
    'both',
  ]);

  function isUnlocked() {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }

  function setUnlocked(value) {
    if (value) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
    window.__keyboardControlsEnabled = value;
    window.__teacherControlsEnabled = value;
    syncUi(true);
    syncInputOptions();
    window.dispatchEvent(new CustomEvent('keyboard-lock-change', { detail: { unlocked: value } }));
    window.dispatchEvent(new CustomEvent('teacher-control-lock-change', { detail: { unlocked: value } }));
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function isGameControlKey(event) {
    return CONTROL_KEYS.has(event.key) || CONTROL_KEYS.has(event.code);
  }

  function blockKeyboardWhenLocked(event) {
    if (isUnlocked()) return;
    if (isTypingTarget(event.target)) return;
    if (!isGameControlKey(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function isCanvasTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('canvas');
  }

  function blockPointerActionWhenLocked(event) {
    if (isUnlocked()) return;
    if (!isCanvasTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function optionUsesLockedInput(value) {
    const normalized = String(value || '').toLowerCase();
    if (LOCKED_INPUT_VALUES.has(normalized)) return true;
    return normalized.includes('keyboard');
  }

  function findFallbackOption(select) {
    const options = Array.from(select.options || []);
    return (
      options.find(option => option.value === 'sensor') ||
      options.find(option => !optionUsesLockedInput(option.value))
    );
  }

  function syncInputOptions() {
    const unlocked = isUnlocked();
    document.querySelectorAll('select').forEach(select => {
      Array.from(select.options || []).forEach(option => {
        if (optionUsesLockedInput(option.value)) option.disabled = !unlocked;
      });
      if (!unlocked && optionUsesLockedInput(select.value)) {
        const fallback = findFallbackOption(select);
        if (fallback) {
          select.value = fallback.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('keyboard-lock-style')) return;
    const style = document.createElement('style');
    style.id = 'keyboard-lock-style';
    style.textContent = `
      .teacher-lock-card {
        margin: 0 0 16px;
        padding: 12px;
        border: 1px solid var(--border, rgba(255,255,255,.22));
        border-radius: 10px;
        background: rgba(255,255,255,.06);
        color: var(--text, #fff);
      }
      .teacher-lock-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 9px;
        font-size: .82rem;
        font-weight: 800;
      }
      .teacher-lock-status {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid currentColor;
        font-size: .7rem;
        line-height: 1;
      }
      .teacher-lock-controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 6px;
        align-items: center;
      }
      .teacher-lock-controls input {
        min-width: 0;
        border: 1px solid var(--border, rgba(255,255,255,.25));
        border-radius: 8px;
        padding: 8px 9px;
        background: rgba(255,255,255,.08);
        color: var(--text, #fff);
        font-size: .78rem;
      }
      .teacher-lock-controls button,
      .teacher-lock-open-button,
      .teacher-lock-close-button {
        border: 1px solid var(--border, rgba(255,255,255,.25));
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(255,255,255,.08);
        color: var(--text, #fff);
        cursor: pointer;
        font-size: .75rem;
        font-weight: 800;
        white-space: nowrap;
      }
      .teacher-lock-controls button:hover,
      .teacher-lock-open-button:hover,
      .teacher-lock-close-button:hover {
        border-color: var(--accent, #00d4ff);
        color: var(--accent, #00d4ff);
      }
      .teacher-lock-msg {
        min-height: 16px;
        margin-top: 6px;
        font-size: .7rem;
        color: var(--muted, #94a3b8);
        line-height: 1.35;
      }
      .teacher-lock-open-button {
        position: fixed;
        top: 56px;
        right: 16px;
        z-index: 31;
        background: rgba(5,10,20,.9);
        color: #dff;
        border-color: rgba(0,255,180,.45);
        box-shadow: 0 8px 22px rgba(0,0,0,.28);
      }
      .teacher-lock-generated-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 32;
        width: min(300px, 100%);
        padding: 20px;
        overflow-y: auto;
        transform: translateX(100%);
        transition: transform .3s;
        background: var(--panel, rgba(5,10,20,.96));
        border-left: 1px solid var(--border, rgba(0,255,180,.45));
        color: var(--text, #dff);
        box-shadow: -14px 0 32px rgba(0,0,0,.35);
      }
      .teacher-lock-generated-panel.open { transform: translateX(0); }
      .teacher-lock-generated-panel h3 {
        margin: 0 0 18px;
        color: var(--accent, #00ffb4);
        font-size: 1rem;
      }
      .teacher-lock-generated-panel .teacher-lock-card { margin-bottom: 16px; }
      .teacher-lock-close-button { width: 100%; }
      @media (max-width: 420px) {
        .teacher-lock-controls {
          grid-template-columns: 1fr;
        }
        .teacher-lock-controls button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createCard() {
    const row = document.createElement('div');
    row.className = 'teacher-lock-card';
    row.innerHTML = `
      <div class="teacher-lock-title">
        <span>교사용 입력</span>
        <strong class="teacher-lock-status" data-keyboard-lock-status></strong>
      </div>
      <div class="teacher-lock-controls">
        <input data-keyboard-lock-password type="password" autocomplete="off" placeholder="비밀번호">
        <button type="button" data-keyboard-lock-unlock>ON</button>
        <button type="button" data-keyboard-lock-lock>잠금</button>
      </div>
      <div class="teacher-lock-msg" data-keyboard-lock-msg></div>
    `;

    const input = row.querySelector('[data-keyboard-lock-password]');
    const msg = row.querySelector('[data-keyboard-lock-msg]');
    const unlock = () => {
      if (input.value === PASSWORD) {
        input.value = '';
        msg.textContent = '교사용 키보드/클릭 조작이 켜졌습니다.';
        setUnlocked(true);
      } else {
        msg.textContent = '비밀번호가 맞지 않습니다.';
        input.select();
      }
    };

    row.querySelector('[data-keyboard-lock-unlock]').addEventListener('click', unlock);
    row.querySelector('[data-keyboard-lock-lock]').addEventListener('click', () => {
      input.value = '';
      msg.textContent = '교사용 키보드/클릭 조작을 잠갔습니다.';
      setUnlocked(false);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        unlock();
      }
    });
    return row;
  }

  function getSettingsPanel() {
    return (
      document.getElementById('settPanel') ||
      document.getElementById('settingPanel') ||
      document.getElementById('settingsPanel')
    );
  }

  function getCloseButton(panel) {
    return panel.querySelector('#closeSett, #closeSetting, [data-teacher-lock-close]');
  }

  function createGeneratedPanel() {
    const existing = document.getElementById('teacherLockGeneratedPanel');
    if (existing) return existing;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'teacher-lock-open-button';
    button.textContent = '교사용 입력';

    const panel = document.createElement('div');
    panel.id = 'teacherLockGeneratedPanel';
    panel.className = 'teacher-lock-generated-panel';
    panel.innerHTML = `
      <h3>교사용 설정</h3>
      <button type="button" class="teacher-lock-close-button" data-teacher-lock-close>닫기</button>
    `;

    button.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        const pwInput = panel.querySelector('[data-keyboard-lock-password]');
        if (pwInput) setTimeout(() => pwInput.focus(), 50);
      }
    });
    panel.querySelector('[data-teacher-lock-close]').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    document.body.appendChild(button);
    document.body.appendChild(panel);
    return panel;
  }

  function injectUi() {
    if (document.querySelector('[data-keyboard-lock-status]')) return;
    injectStyles();

    const panel = getSettingsPanel() || createGeneratedPanel();
    const card = createCard();
    const closeButton = getCloseButton(panel);
    if (closeButton) panel.insertBefore(card, closeButton);
    else panel.appendChild(card);
    syncUi(false);
  }

  function syncUi(forceMessage) {
    const unlocked = isUnlocked();
    window.__keyboardControlsEnabled = unlocked;
    window.__teacherControlsEnabled = unlocked;
    document.querySelectorAll('[data-keyboard-lock-status]').forEach(el => {
      el.textContent = unlocked ? 'ON' : '잠김';
      el.style.color = unlocked ? 'var(--success, #00ff88)' : 'var(--accent, #f59e0b)';
    });
    document.querySelectorAll('[data-keyboard-lock-msg]').forEach(el => {
      if (forceMessage || !el.textContent) {
        el.textContent = unlocked
          ? '교사용 키보드/클릭 조작이 켜져 있습니다.'
          : '센서 수업용으로 키보드/클릭 조작을 막고 있습니다.';
      }
    });
  }

  window.KeyboardLock = {
    isUnlocked,
    unlock(password) {
      if (password !== PASSWORD) return false;
      setUnlocked(true);
      return true;
    },
    lock() { setUnlocked(false); },
  };
  window.TeacherControlLock = window.KeyboardLock;

  window.__keyboardControlsEnabled = isUnlocked();
  window.__teacherControlsEnabled = isUnlocked();
  window.addEventListener('keydown', blockKeyboardWhenLocked, true);
  window.addEventListener('keyup', blockKeyboardWhenLocked, true);
  ACTION_POINTER_EVENTS.forEach(type => {
    window.addEventListener(type, blockPointerActionWhenLocked, true);
  });

  document.addEventListener('DOMContentLoaded', () => {
    injectUi();
    syncInputOptions();
  });
  if (document.readyState !== 'loading') {
    injectUi();
    syncInputOptions();
  }
})();
