'use strict';

(() => {
  const t = (key, params) => (window.I18N ? window.I18N.t(key, params) : key);

  const form = document.getElementById('start-form');
  const nicknameInput = document.getElementById('nickname');
  const roomField = document.getElementById('room-field');
  const roomInput = document.getElementById('room-code');
  const tabs = document.querySelector('.mode-tabs');
  const tabButtons = [...document.querySelectorAll('.mode-tab')];
  const submitButton = document.getElementById('submit-button');
  const submitLabel = document.getElementById('submit-label');
  const errorEl = document.getElementById('form-error');
  const ticketNumber = document.getElementById('ticket-number');

  let mode = 'create';
  let submitting = false;

  const NAME_KEY = 'tp:name';
  const CODE_ALPHABET = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

  try {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nicknameInput.value = savedName;
  } catch {
    // Storage may be unavailable in private mode.
  }

  const now = new Date();
  ticketNumber.textContent = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const params = new URLSearchParams(location.search);
  if (params.get('join')) {
    setMode('join');
    roomInput.value = params.get('join').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    nicknameInput.focus();
  }

  function setMode(nextMode) {
    if (nextMode !== 'create' && nextMode !== 'join') return;
    mode = nextMode;
    tabs.dataset.mode = mode;
    tabButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    roomField.classList.toggle('is-hidden', mode !== 'join');
    roomInput.required = mode === 'join';
    submitLabel.textContent = mode === 'create' ? t('创建今晚的放映室') : t('进入放映室');
    if (mode === 'join') {
      window.setTimeout(() => roomInput.focus(), 50);
    }
    clearError();
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }

  function setLoading(loading) {
    submitting = loading;
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    if (loading) {
      submitLabel.textContent = mode === 'create' ? t('正在点亮放映室…') : t('正在寻找放映室…');
    } else {
      submitLabel.textContent = mode === 'create' ? t('创建今晚的放映室') : t('进入放映室');
    }
  }

  function saveName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
      sessionStorage.setItem(NAME_KEY, name);
    } catch {
      // Ignore storage errors.
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  roomInput.addEventListener('input', () => {
    roomInput.value = roomInput.value
      .toUpperCase()
      .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')
      .slice(0, 6);
    clearError();
  });

  nicknameInput.addEventListener('input', () => {
    if (nicknameInput.value.length > 20) nicknameInput.value = nicknameInput.value.slice(0, 20);
    clearError();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    clearError();

    const name = nicknameInput.value.trim();
    if (!name) {
      showError(t('先告诉 TA，该怎么称呼你。'));
      nicknameInput.focus();
      return;
    }

    let roomCode = '';
    if (mode === 'join') {
      roomCode = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (roomCode.length !== 6) {
        showError(t('房间码是 6 位字符，再检查一下邀请信息。'));
        roomInput.focus();
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || t('放映室没有创建成功，请稍后再试。'));
        saveName(name);
        location.href = `/room/${data.roomId}`;
        return;
      }

      const response = await fetch(`/api/rooms/${roomCode}`, { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) throw new Error(t('没有找到这间放映室，房间码可能过期了。'));
      if (!response.ok) throw new Error(data.error || t('暂时无法加入，请稍后再试。'));
      if (data.participants >= data.capacity) throw new Error(t('放映室已经满员了，只容得下两个人。'));
      saveName(name);
      location.href = `/room/${data.roomId}`;
    } catch (error) {
      setLoading(false);
      showError(error.message || t('网络似乎走神了，请再试一次。'));
      submitButton.disabled = false;
    }
  });

  if (window.I18N) {
    window.I18N.onChange(() => {
      setMode(mode);
      clearError();
    });
  }
})();
