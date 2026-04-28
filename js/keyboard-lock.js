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

  function isUnlocked() {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }

  function setUnlocked(value) {
    if (value) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
    window.__keyboardControlsEnabled = value;
    syncUi();
    syncKeyboardOptions();
    window.dispatchEvent(new CustomEvent('keyboard-lock-change', { detail: { unlocked: value } }));
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

  function optionUsesKeyboard(value) {
    return String(value || '').includes('keyboard');
  }

  function syncKeyboardOptions() {
    const unlocked = isUnlocked();
    document.querySelectorAll('select').forEach(select => {
      Array.from(select.options || []).forEach(option => {
        if (optionUsesKeyboard(option.value)) option.disabled = !unlocked;
      });
      if (!unlocked && optionUsesKeyboard(select.value)) {
        const fallback = Array.from(select.options || []).find(option => !optionUsesKeyboard(option.value));
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
      .keyboard-lock-row {
        border-top: 1px solid var(--border, rgba(255,255,255,.18));
        padding-top: 14px;
      }
      .keyboard-lock-controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 6px;
        align-items: center;
      }
      .keyboard-lock-controls input {
        min-width: 0;
        border: 1px solid var(--border, rgba(255,255,255,.25));
        border-radius: 8px;
        padding: 8px 9px;
        background: rgba(255,255,255,.08);
        color: var(--text, #fff);
        font-size: .78rem;
      }
      .keyboard-lock-controls button {
        border: 1px solid var(--border, rgba(255,255,255,.25));
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(255,255,255,.08);
        color: var(--text, #fff);
        cursor: pointer;
        font-size: .75rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .keyboard-lock-controls button:hover {
        border-color: var(--accent, #00d4ff);
        color: var(--accent, #00d4ff);
      }
      .keyboard-lock-msg {
        min-height: 16px;
        margin-top: 5px;
        font-size: .7rem;
        color: var(--muted, #94a3b8);
        line-height: 1.35;
      }
      .keyboard-lock-floating {
        position: fixed;
        top: 56px;
        right: 16px;
        z-index: 30;
        width: min(280px, calc(100vw - 32px));
        padding: 10px;
        border: 1px solid rgba(0,255,180,.45);
        border-radius: 12px;
        background: rgba(5,10,20,.9);
        color: #dff;
        box-shadow: 0 12px 32px rgba(0,0,0,.35);
      }
      .keyboard-lock-floating label {
        display: block;
        margin-bottom: 6px;
        color: #00ffb4;
        font-size: .78rem;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function createRow(floating) {
    const row = document.createElement('div');
    row.className = floating ? 'keyboard-lock-floating' : 'srow keyboard-lock-row';
    row.innerHTML = `
      <label>키보드 조작: <strong data-keyboard-lock-status></strong></label>
      <div class="keyboard-lock-controls">
        <input data-keyboard-lock-password type="password" autocomplete="off" placeholder="비밀번호">
        <button type="button" data-keyboard-lock-unlock>ON</button>
        <button type="button" data-keyboard-lock-lock>잠금</button>
      </div>
      <div class="keyboard-lock-msg" data-keyboard-lock-msg></div>
    `;

    const input = row.querySelector('[data-keyboard-lock-password]');
    const msg = row.querySelector('[data-keyboard-lock-msg]');
    const unlock = () => {
      if (input.value === PASSWORD) {
        input.value = '';
        msg.textContent = '키보드 조작이 켜졌습니다.';
        setUnlocked(true);
      } else {
        msg.textContent = '비밀번호가 맞지 않습니다.';
        input.select();
      }
    };

    row.querySelector('[data-keyboard-lock-unlock]').addEventListener('click', unlock);
    row.querySelector('[data-keyboard-lock-lock]').addEventListener('click', () => {
      input.value = '';
      msg.textContent = '키보드 조작을 잠갔습니다.';
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

  function injectUi() {
    if (document.querySelector('[data-keyboard-lock-status]')) return;
    injectStyles();

    const panel = document.getElementById('settPanel');
    if (panel) {
      const row = createRow(false);
      const closeButton = panel.querySelector('#closeSett');
      if (closeButton) panel.insertBefore(row, closeButton);
      else panel.appendChild(row);
    } else {
      document.body.appendChild(createRow(true));
    }
    syncUi();
  }

  function syncUi() {
    const unlocked = isUnlocked();
    window.__keyboardControlsEnabled = unlocked;
    document.querySelectorAll('[data-keyboard-lock-status]').forEach(el => {
      el.textContent = unlocked ? 'ON' : '잠김';
      el.style.color = unlocked ? 'var(--success, #00ff88)' : 'var(--accent, #f59e0b)';
    });
    document.querySelectorAll('[data-keyboard-lock-msg]').forEach(el => {
      if (!el.textContent) {
        el.textContent = unlocked
          ? '교사용 키보드 조작이 켜져 있습니다.'
          : '비밀번호를 입력해야 키보드 조작을 사용할 수 있습니다.';
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

  window.__keyboardControlsEnabled = isUnlocked();
  window.addEventListener('keydown', blockKeyboardWhenLocked, true);
  window.addEventListener('keyup', blockKeyboardWhenLocked, true);
  document.addEventListener('DOMContentLoaded', () => {
    injectUi();
    syncKeyboardOptions();
  });
  if (document.readyState !== 'loading') {
    injectUi();
    syncKeyboardOptions();
  }
})();
