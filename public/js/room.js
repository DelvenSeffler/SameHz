'use strict';

(() => {
  const roomMatch = location.pathname.match(/^\/room\/([A-Za-z0-9]{6})\/?$/);
  if (!roomMatch) {
    location.replace('/');
    return;
  }

  const t = (key, params) => (window.I18N ? window.I18N.t(key, params) : key);
  const i18n = window.I18N || {
    onChange: () => {},
    getLang: () => 'zh',
    locale: () => 'zh-CN',
    formatDate: (date) => `${date.getMonth() + 1} 月 ${date.getDate()} 日`,
    isEnglish: () => false,
  };

  const ROOM_ID = roomMatch[1].toUpperCase();
  const NAME_KEY = 'tp:name';
  const CLIENT_KEY = 'tp:client-id';
  const AUTO_SYNC_KEY = 'tp:auto-sync';
  const VOLUME_KEY = 'tp:volume';
  const HEARTBEAT_MS = 3000;
  const AUTO_SYNC_THRESHOLD = 0.85;
  const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';

  const $ = (id) => document.getElementById(id);

  const dom = {
    player: $('player'),
    stageFrame: $('stage-frame'),
    emptyState: $('empty-state'),
    fileInput: $('file-input'),
    pickButton: $('pick-button'),
    urlOpen: $('url-open'),
    replaceButton: $('replace-button'),
    sourceModal: $('source-modal'),
    sourceForm: $('source-form'),
    sourceUrl: $('source-url'),
    sourceError: $('source-error'),
    sourcePlatform: $('source-platform'),
    sourceSubmit: $('source-submit'),
    sourceFile: $('source-file'),
    embedFrame: $('embed-frame'),
    ytMount: $('yt-mount'),
    embedPlayer: $('embed-player'),
    countdownCard: $('countdown-card'),
    countdownNumber: $('countdown-number'),
    countdownHint: $('countdown-hint'),
    loading: $('stage-loading'),
    loadingText: $('loading-text'),
    dropOverlay: $('drop-overlay'),
    screenTopbar: document.querySelector('.screen-topbar'),
    syncPill: $('sync-pill'),
    syncPillText: $('sync-pill-text'),
    peerIndicator: $('peer-indicator'),
    gestureCard: $('gesture-card'),
    gesturePlay: $('gesture-play'),
    centerPlay: $('center-play'),
    videoControls: $('video-controls'),
    playButton: $('play-button'),
    backButton: $('back-button'),
    forwardButton: $('forward-button'),
    muteButton: $('mute-button'),
    volume: $('volume'),
    fullscreenButton: $('fullscreen-button'),
    currentTime: $('current-time'),
    totalTime: $('total-time'),
    timeline: $('timeline'),
    timelineBuffer: $('timeline-buffer'),
    driftReadout: $('drift-readout'),
    driftText: $('drift-text'),
    inlineSync: $('inline-sync'),
    filmState: $('film-state'),
    fileSize: $('file-size'),
    sourceMode: $('source-mode'),
    filmTitle: $('film-title'),
    filmSubline: $('film-subline'),
    matchBadge: $('match-badge'),
    matchTitle: $('match-title'),
    matchSub: $('match-sub'),
    matchMark: $('match-mark'),
    roomCodeLabel: $('room-code-label'),
    roomDate: $('room-date'),
    footerRoomCode: $('footer-room-code'),
    inviteCode: $('invite-code'),
    dialogRoomCode: $('dialog-room-code'),
    entryRoomCode: $('entry-room-code'),
    connectionPill: $('connection-pill'),
    connectionText: $('connection-text'),
    participantList: $('participant-list'),
    seatCount: $('seat-count'),
    offsetValue: $('offset-value'),
    lastSync: $('last-sync'),
    autoSyncToggle: $('auto-sync-toggle'),
    autoChip: $('auto-chip'),
    manualSync: $('manual-sync'),
    manualSyncSub: $('manual-sync-sub'),
    activityList: $('activity-list'),
    syncFlash: $('sync-flash'),
    entryOverlay: $('entry-overlay'),
    entryForm: $('entry-form'),
    entryName: $('entry-name'),
    entryError: $('entry-error'),
    entrySubmit: $('entry-submit'),
    inviteModal: $('invite-modal'),
    helpModal: $('help-modal'),
    fatalOverlay: $('fatal-overlay'),
    fatalTitle: $('fatal-title'),
    fatalText: $('fatal-text'),
    inviteLinkInput: $('invite-link-input'),
    copyCodeTop: $('copy-code-top'),
    copyCode: $('copy-code'),
    copyLink: $('copy-link'),
    shareButton: $('share-button'),
    inviteButton: $('invite-button'),
    helpButton: $('help-button'),
    dialogCopyLink: $('dialog-copy-link'),
    dialogCopyCode: $('dialog-copy-code'),
    dialogShare: $('dialog-share'),
    toastRegion: $('toast-region'),
  };

  const state = {
    socket: null,
    connected: false,
    everJoined: false,
    connecting: false,
    fatal: false,
    selfId: null,
    selfName: '',
    participants: [],
    partner: null,
    partnerFile: null,
    roomState: { playing: false, position: 0, updatedAt: 0, revision: 0, updatedBy: null },
    roomDuration: 0,
    clockOffset: 0,
    clockSynced: false,
    hasVideo: false,
    file: null,
    fileUrl: null,
    sourceKind: 'local',
    sourceUrl: '',
    platform: 'file',
    playerMode: 'native',
    controllable: true,
    ytPlayer: null,
    embedStartAt: 0,
    peerSourceAttempted: '',
    fingerprint: '',
    fileDuration: 0,
    videoWidth: 0,
    videoHeight: 0,
    fileSize: 0,
    filesMatch: null,
    matchKey: '',
    lastMatchNotice: '',
    autoSync: true,
    needsGesture: false,
    buffering: false,
    applyingRemote: false,
    suppressControlUntil: 0,
    scrubbing: false,
    scrubbingTarget: 0,
    lastUserActionAt: 0,
    lastDrift: null,
    lastSyncAt: 0,
    lastAutoLogAt: 0,
    ended: false,
    reconnectTimer: null,
    reconnectDelay: 1200,
    reconnectAttempts: 0,
    loadToken: 0,
    controlsTimer: null,
    dragDepth: 0,
    manualResetTimer: null,
    syncFlashTimer: null,
    toastTimers: new Set(),
    activityItems: [],
    hls: null,
    countdownTimer: null,
  };

  const roomUrl = `${location.origin}/room/${ROOM_ID}`;
  const nameStorage = {
    getSession() {
      try { return sessionStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
    },
    getLocal() {
      try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
    },
    set(name) {
      try {
        sessionStorage.setItem(NAME_KEY, name);
        localStorage.setItem(NAME_KEY, name);
      } catch {
        // Ignore storage restrictions.
      }
    },
  };

  function getClientId() {
    let id = '';
    try { id = sessionStorage.getItem(CLIENT_KEY) || ''; } catch { id = ''; }
    if (!id || id.length < 8) {
      id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      try { sessionStorage.setItem(CLIENT_KEY, id); } catch { /* ignore */ }
    }
    return id;
  }

  function readAutoSync() {
    try {
      const stored = localStorage.getItem(AUTO_SYNC_KEY);
      if (stored === 'off') return false;
      if (stored === 'on') return true;
    } catch { /* ignore */ }
    return true;
  }

  function readVolume() {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw === null) return 0.85;
      const stored = Number(raw);
      if (Number.isFinite(stored) && stored >= 0 && stored <= 1) return stored;
    } catch { /* ignore */ }
    return 0.85;
  }

  function formatRoomDate() {
    return i18n.formatDate(new Date());
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDurationShort(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return t('时长未知');
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.round((total % 3600) / 60);
    if (h > 0) return t('{hours} 小时 {minutes} 分', { hours: h, minutes: m });
    if (m > 0) return t('{minutes} 分钟', { minutes: m });
    return t('{seconds} 秒', { seconds: total });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / (1024 ** index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function formatClock(timestamp) {
    if (!timestamp) return t('尚未校准');
    return new Date(timestamp).toLocaleTimeString(i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function serverNow() {
    return Date.now() + state.clockOffset;
  }

  function projectState(roomState = state.roomState) {
    let position = Number(roomState.position) || 0;
    if (roomState.playing) {
      position += Math.max(0, serverNow() - (roomState.updatedAt || 0)) / 1000;
    }
    if (state.fileDuration > 0) position = Math.min(position, state.fileDuration);
    return Math.max(0, position);
  }

  function suppressControlEvents(ms = 1100) {
    state.suppressControlUntil = Math.max(state.suppressControlUntil, performance.now() + ms);
  }

  function isControlSuppressed() {
    return performance.now() < state.suppressControlUntil;
  }

  function setIcon(button, href) {
    const use = button && button.querySelector('use');
    if (use) use.setAttribute('href', href);
  }

  function setConnection(mode, text) {
    dom.connectionPill.classList.remove('is-connecting', 'is-offline');
    if (mode === 'connecting') dom.connectionPill.classList.add('is-connecting');
    if (mode === 'offline') dom.connectionPill.classList.add('is-offline');
    dom.connectionText.textContent = text;
    dom.connectionPill.title = text;
    updateSyncUI();
  }

  function toast(message, type = '', duration = 3400) {
    const element = document.createElement('div');
    element.className = `toast ${type}`.trim();
    element.textContent = message;
    dom.toastRegion.appendChild(element);
    while (dom.toastRegion.children.length > 3) dom.toastRegion.removeChild(dom.toastRegion.firstElementChild);
    const timer = window.setTimeout(() => {
      element.classList.add('is-leaving');
      window.setTimeout(() => {
        element.remove();
        state.toastTimers.delete(timer);
      }, 260);
    }, duration);
    state.toastTimers.add(timer);
  }

  function renderActivity() {
    if (!state.activityItems.length) {
      const empty = document.createElement('li');
      empty.className = 'activity-empty';
      empty.textContent = t('等一束光，等一个人。');
      dom.activityList.replaceChildren(empty);
      return;
    }
    const nodes = state.activityItems.map((entry) => {
      const item = document.createElement('li');
      item.className = `activity-item is-${entry.tone}`;
      const dot = document.createElement('span');
      dot.className = 'activity-dot';
      const paragraph = document.createElement('p');
      const params = entry.params ? { ...entry.params } : null;
      if (params && params.__selfActor) params.actor = t('你');
      paragraph.textContent = entry.key ? t(entry.key, params) : entry.text;
      const time = document.createElement('time');
      time.textContent = new Date(entry.at).toLocaleTimeString(i18n.locale(), {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      item.append(dot, paragraph, time);
      return item;
    });
    dom.activityList.replaceChildren(...nodes);
  }

  function addActivity(spec, tone = 'neutral') {
    if (!spec) return;
    let entry;
    if (typeof spec === 'string') {
      entry = { key: spec, params: null, text: t(spec), tone, at: Date.now() };
    } else {
      entry = { key: spec.key, params: spec.params || null, text: '', tone, at: Date.now() };
      entry.text = t(entry.key, entry.params);
    }
    state.activityItems.unshift(entry);
    if (state.activityItems.length > 16) state.activityItems.length = 16;
    renderActivity();
  }

  function showSyncFlash(text = null) {
    dom.syncFlash.querySelector('span').textContent = text || t('进度已对齐');
    dom.syncFlash.classList.remove('is-hidden');
    window.clearTimeout(state.syncFlashTimer);
    requestAnimationFrame(() => dom.syncFlash.classList.add('is-visible'));
    state.syncFlashTimer = window.setTimeout(() => {
      dom.syncFlash.classList.remove('is-visible');
      window.setTimeout(() => dom.syncFlash.classList.add('is-hidden'), 320);
    }, 1800);
  }

  function modalList() {
    return [dom.entryOverlay, dom.inviteModal, dom.helpModal, dom.fatalOverlay, dom.sourceModal];
  }

  function openModal(element) {
    modalList().forEach((modal) => {
      if (modal !== element) modal.classList.add('is-hidden');
    });
    element.classList.remove('is-hidden');
    document.body.classList.add('modal-open');
    const focusable = element.querySelector('input, button, a');
    if (focusable) window.setTimeout(() => focusable.focus(), 60);
  }

  function closeModal(element) {
    if (!element) return;
    element.classList.add('is-hidden');
    const anyOpen = modalList().some((modal) => !modal.classList.contains('is-hidden'));
    if (!anyOpen) document.body.classList.remove('modal-open');
  }

  function showFatal(title, message) {
    state.fatal = true;
    if (state.socket) {
      try { state.socket.close(); } catch { /* ignore */ }
    }
    clearTimeout(state.reconnectTimer);
    dom.fatalTitle.textContent = title;
    dom.fatalText.textContent = message;
    openModal(dom.fatalOverlay);
  }

  /* ---------------- Clipboard & sharing ---------------- */

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall back to the legacy copy path.
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      area.style.pointerEvents = 'none';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function copyWithFeedback(text, label) {
    const ok = await copyText(text);
    toast(ok ? (label || t('已复制')) : t('复制失败，请手动选择复制'), ok ? 'success' : 'error');
  }

  async function shareInvite() {
    const shareData = {
      title: t('同频 · 私人放映室'),
      text: t('来和我一起看电影吧，房间码 {code}', { code: ROOM_ID }),
      url: roomUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    await copyWithFeedback(roomUrl, t('邀请链接已复制'));
  }

  function populateInviteDialog() {
    dom.inviteLinkInput.value = roomUrl;
    dom.dialogRoomCode.textContent = ROOM_ID;
  }

  /* ---------------- UI rendering ---------------- */

  function initials(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return i18n.isEnglish() ? 'S' : '影';
    return [...trimmed][0].toUpperCase();
  }

  function nameHue(name) {
    let hash = 0;
    for (const character of String(name)) hash = (hash * 31 + character.codePointAt(0)) % 360;
    return hash;
  }

  function createParticipantRow(participant, isSelf) {
    const item = document.createElement('li');
    item.className = 'participant';
    if (isSelf) item.classList.add('is-self');
    if (participant && !participant.online) item.classList.add('is-offline');

    const avatar = document.createElement('span');
    avatar.className = 'participant-avatar';
    avatar.style.setProperty('--avatar-hue', String(nameHue(participant ? participant.name : '')));
    avatar.textContent = initials(participant ? participant.name : '');

    const copy = document.createElement('span');
    copy.className = 'participant-copy';

    const name = document.createElement('span');
    name.className = 'participant-name';
    name.append(document.createTextNode(participant && participant.name ? participant.name : state.selfName || t('你')));
    if (isSelf) {
      const selfTag = document.createElement('em');
      selfTag.textContent = t('你');
      name.appendChild(selfTag);
    }

    const status = document.createElement('span');
    status.className = 'participant-status';
    const dot = document.createElement('i');
    if (participant && participant.online) {
      dot.className = participant.file ? 'is-ready' : 'is-online';
    }
    const statusText = document.createElement('span');
    if (!participant) {
      statusText.textContent = t('正在连接…');
    } else if (!participant.online) {
      statusText.textContent = t('暂时离线');
    } else if (participant.file) {
      statusText.textContent = `${formatDurationShort(participant.file.duration)} · ${participant.file.fingerprint.slice(0, 6)}`;
    } else {
      statusText.textContent = t('正在选择片源…');
    }
    status.append(dot, statusText);
    copy.append(name, status);

    const tag = document.createElement('span');
    tag.className = 'participant-tag';
    if (!participant || !participant.online) {
      tag.textContent = t('离线');
    } else if (!participant.file) {
      tag.textContent = t('未选片');
      tag.classList.add('is-waiting');
    } else if (isSelf) {
      tag.textContent = t('已就位');
      tag.classList.add('is-ready');
    } else if (state.filesMatch === true) {
      tag.textContent = t('匹配');
      tag.classList.add('is-ready');
    } else if (state.filesMatch === false) {
      tag.textContent = t('不同');
      tag.classList.add('is-mismatch');
    } else {
      tag.textContent = t('就位');
      tag.classList.add('is-ready');
    }

    item.append(avatar, copy, tag);
    return item;
  }

  function createEmptySeat() {
    const item = document.createElement('li');
    item.className = 'participant is-empty';
    const avatar = document.createElement('span');
    avatar.className = 'empty-avatar';
    avatar.textContent = '+';
    const copy = document.createElement('span');
    copy.className = 'participant-copy';
    const name = document.createElement('span');
    name.className = 'participant-name';
    name.textContent = t('等待另一个人入座');
    const status = document.createElement('span');
    status.className = 'participant-status';
    status.textContent = t('把邀请链接发给 TA');
    copy.append(name, status);
    const tag = document.createElement('span');
    tag.className = 'participant-tag';
    tag.textContent = t('空座');
    item.append(avatar, copy, tag);
    return item;
  }

  function renderParticipants() {
    const self = state.participants.find((participant) => participant.id === state.selfId);
    const partner = state.participants.find((participant) => participant.id !== state.selfId) || null;
    state.partner = partner;
    state.partnerFile = partner && partner.file ? partner.file : null;
    evaluateFiles();

    const rows = [];
    if (self) rows.push(createParticipantRow(self, true));
    else if (state.selfName) {
      rows.push(createParticipantRow({
        id: state.selfId,
        name: state.selfName,
        online: state.connected,
        file: state.file ? {
          fingerprint: state.fingerprint,
          duration: state.fileDuration,
          size: state.fileSize,
          name: state.file.name,
        } : null,
      }, true));
    }
    if (partner) rows.push(createParticipantRow(partner, false));
    else rows.push(createEmptySeat());

    dom.participantList.replaceChildren(...rows);
    dom.seatCount.textContent = `${state.participants.length || (state.selfName ? 1 : 0)} / 2`;

    const peerDot = document.createElement('i');
    if (partner && partner.online) {
      dom.peerIndicator.classList.add('is-online');
      dom.peerIndicator.replaceChildren(peerDot, document.createTextNode(` ${t('TA 在线')}`));
    } else if (partner) {
      dom.peerIndicator.classList.remove('is-online');
      dom.peerIndicator.replaceChildren(peerDot, document.createTextNode(` ${t('TA 离线')}`));
    } else {
      dom.peerIndicator.classList.remove('is-online');
      dom.peerIndicator.replaceChildren(peerDot, document.createTextNode(` ${t('等待 TA')}`));
    }

    maybeAdoptPeerSource();
    updateSyncUI();
  }

  function evaluateFiles() {
    const selfParticipant = state.participants.find((participant) => participant.id === state.selfId);
    const selfFile = selfParticipant && selfParticipant.file
      ? selfParticipant.file
      : (state.file ? {
        fingerprint: state.fingerprint,
        duration: state.fileDuration,
        size: state.fileSize,
      } : null);
    const partnerFile = state.partnerFile;

    let match = null;
    let title = t('等待双方片源');
    let sub = t('各自打开同一部电影');
    let className = '';

    if (!selfFile) {
      title = t('等待你的片源');
      sub = t('从本地选择一部电影');
      className = 'is-partial';
    } else if (!partnerFile) {
      title = state.partner ? t('等待 TA 的片源') : t('等待 TA 入座');
      sub = `${selfFile.fingerprint.slice(0, 8)} · ${formatDurationShort(selfFile.duration)}`;
      className = 'is-partial';
    } else {
      const fingerprintMatch = String(selfFile.fingerprint).toUpperCase() === String(partnerFile.fingerprint).toUpperCase();
      const durationDelta = Math.abs((Number(selfFile.duration) || 0) - (Number(partnerFile.duration) || 0));
      const sizeMatch = !selfFile.size || !partnerFile.size || Number(selfFile.size) === Number(partnerFile.size);
      if (fingerprintMatch && sizeMatch && durationDelta <= 2) {
        match = true;
        title = t('片源匹配成功');
        sub = t('同一部电影 · {duration}', { duration: formatDurationShort(selfFile.duration) });
        className = 'is-matched';
      } else if (fingerprintMatch) {
        match = false;
        title = t('片源时长不一致');
        sub = t('相差 {value} 秒，建议重新选择', { value: Math.round(durationDelta) });
        className = 'is-mismatch';
      } else {
        match = false;
        title = t('片源不一致');
        sub = t('你们打开的可能不是同一个文件');
        className = 'is-mismatch';
      }
    }

    state.filesMatch = match;
    dom.matchBadge.className = `match-badge ${className}`.trim();
    dom.matchTitle.textContent = title;
    dom.matchSub.textContent = sub;
    dom.matchMark.textContent = '';

    if (match === true) {
      dom.filmSubline.textContent = sourceSubline(selfFile);
    } else if (match === false) {
      dom.filmSubline.textContent = t('片源不一致，自动校准会暂停；请双方换成同一个文件。');
    } else if (selfFile && state.hasVideo) {
      dom.filmSubline.textContent = sourceSubline(selfFile);
    }

    const matchKey = `${selfFile ? selfFile.fingerprint : 'none'}:${partnerFile ? partnerFile.fingerprint : 'none'}`;
    if (match !== null && matchKey !== state.lastMatchNotice) {
      state.lastMatchNotice = matchKey;
      if (match && partnerFile) {
        addActivity('双方片源核对一致', 'success');
        toast(t('片源匹配成功，可以一起开始了'), 'success');
      } else if (!match) {
        addActivity('检测到片源不一致', 'warning');
        toast(t('你们选择的片源不一致，建议换成同一个文件'), 'error', 5200);
      }
    }
    state.matchKey = matchKey;
  }

  function sourceSubline(file) {
    const duration = formatDurationShort(file.duration);
    if (file && file.source && file.source.kind === 'url') {
      return t('在线链接 · {duration} · 直接在浏览器播放', { duration });
    }
    return t('指纹 {fingerprint} · {duration} · 仅在本机读取', {
      fingerprint: file.fingerprint,
      duration,
    });
  }

  function updateSyncStatusPill() {
    let text = t('等待片源');
    let className = 'screen-sync-pill is-waiting';

    if (!state.connected) {
      text = t('连接中断');
      className = 'screen-sync-pill is-offline';
    } else if (!state.hasVideo) {
      text = t('等待片源');
      className = 'screen-sync-pill is-waiting';
    } else if (!state.partner) {
      text = t('等待 TA 入座');
      className = 'screen-sync-pill is-waiting';
    } else if (!state.partner.online) {
      text = t('TA 暂时离线');
      className = 'screen-sync-pill is-waiting';
    } else if (state.filesMatch === false) {
      text = t('片源不一致');
      className = 'screen-sync-pill is-warning';
    } else if (state.needsGesture) {
      text = t('等待点击播放');
      className = 'screen-sync-pill is-waiting';
    } else if (state.buffering) {
      text = t('缓冲中');
      className = 'screen-sync-pill is-waiting';
    } else if (state.roomState.playing) {
      text = t('同步播放中');
      className = 'screen-sync-pill';
    } else {
      text = t('已暂停 · 同步中');
      className = 'screen-sync-pill';
    }

    dom.syncPill.className = className;
    dom.syncPillText.textContent = text;
  }

  function updateSyncUI() {
    updateSyncStatusPill();
    if (!state.hasVideo) {
      dom.offsetValue.textContent = '—';
      dom.driftText.textContent = t('等待同步');
      dom.driftReadout.className = 'drift-readout';
      dom.lastSync.textContent = t('尚未校准');
      dom.manualSync.disabled = true;
      dom.inlineSync.disabled = true;
      return;
    }

    const drift = state.lastDrift;

    if (!state.controllable) {
      dom.offsetValue.textContent = '—';
      dom.driftText.textContent = t('该平台不支持自动校准');
      dom.driftReadout.className = 'drift-readout is-warning';
      dom.autoChip.textContent = t('手动');
      dom.autoChip.classList.add('is-off');
      dom.lastSync.textContent = state.lastSyncAt ? formatClock(state.lastSyncAt) : t('尚未校准');
      dom.manualSync.disabled = !state.connected;
      dom.inlineSync.disabled = !state.connected;
      const label = dom.manualSync.querySelector('strong');
      if (label) label.textContent = t('一起开始');
      return;
    }

    if (drift === null || !Number.isFinite(drift)) {
      dom.offsetValue.textContent = '—';
      dom.driftText.textContent = t('等待同步');
      dom.driftReadout.className = 'drift-readout';
    } else {
      const abs = Math.abs(drift);
      dom.offsetValue.textContent = `${abs < 10 ? abs.toFixed(2) : Math.round(abs)}s`;
      if (state.filesMatch === false) {
        dom.driftText.textContent = t('片源不同');
        dom.driftReadout.className = 'drift-readout is-danger';
      } else if (abs < 0.25) {
        dom.driftText.textContent = t('误差 {value}s', { value: abs.toFixed(2) });
        dom.driftReadout.className = 'drift-readout';
      } else if (abs < AUTO_SYNC_THRESHOLD) {
        dom.driftText.textContent = t('偏差 {value}s', { value: abs.toFixed(2) });
        dom.driftReadout.className = 'drift-readout is-warning';
      } else {
        dom.driftText.textContent = t('偏差 {value}s', { value: abs.toFixed(1) });
        dom.driftReadout.className = 'drift-readout is-danger';
      }
    }

    const orbit = document.querySelector('.sync-orbit');
    if (orbit) orbit.classList.toggle('is-warning', state.filesMatch === false || (drift !== null && Math.abs(drift) > AUTO_SYNC_THRESHOLD));
    const pausedByMismatch = state.filesMatch === false;
    dom.autoChip.textContent = pausedByMismatch ? t('暂停') : (state.autoSync ? t('自动') : t('手动'));
    dom.autoChip.classList.toggle('is-off', !state.autoSync || pausedByMismatch);
    dom.lastSync.textContent = state.lastSyncAt ? formatClock(state.lastSyncAt) : t('尚未校准');
    const manualLabel = dom.manualSync.querySelector('strong');
    if (manualLabel) manualLabel.textContent = t('一键同步进度');
    dom.manualSync.disabled = !state.connected || !state.hasVideo;
    dom.inlineSync.disabled = !state.connected || !state.hasVideo;
  }

  function updateTimelineUI() {
    if (!state.hasVideo) return;
    if (!isNativePlayer()) return;
    const duration = mediaDuration() || state.fileDuration || 0;
    if (!duration) return;
    const current = state.scrubbing ? state.scrubbingTarget : mediaCurrentTime();
    const percent = clamp((current / duration) * 100, 0, 100);
    if (!state.scrubbing) {
      dom.timeline.value = String(percent * 10);
      dom.currentTime.textContent = formatTime(current);
    }
    dom.timeline.style.setProperty('--played', `${percent}%`);
    dom.totalTime.textContent = formatTime(duration);

    try {
      if (dom.player.buffered.length) {
        const bufferedEnd = dom.player.buffered.end(dom.player.buffered.length - 1);
        dom.timelineBuffer.style.width = `${clamp((bufferedEnd / duration) * 100, 0, 100)}%`;
      }
    } catch {
      // Buffered ranges can briefly throw after switching sources.
    }

    dom.driftReadout.setAttribute('aria-label', dom.driftText.textContent);
  }

  function updatePlaybackUI() {
    const playing = state.hasVideo && !mediaPaused() && !mediaEnded();
    setIcon(dom.playButton, playing ? '#i-pause' : '#i-play');
    dom.playButton.setAttribute('aria-label', playing ? t('暂停') : t('播放'));
    dom.centerPlay.classList.toggle('is-hidden', !state.hasVideo || playing || state.needsGesture || state.ended);
    dom.gestureCard.classList.toggle('is-hidden', !state.needsGesture || !state.hasVideo);
    dom.videoControls.classList.toggle('is-hidden', !state.hasVideo || !isNativePlayer());
    if (!state.hasVideo) {
      dom.centerPlay.classList.add('is-hidden');
      dom.gestureCard.classList.add('is-hidden');
    }
    updateTimelineUI();
    updateSyncStatusPill();
    if (playing) scheduleControlsHide();
    else {
      clearTimeout(state.controlsTimer);
      dom.stageFrame.classList.remove('controls-hidden');
    }
  }

  function setVideoInfo() {
    if (!state.file) return;
    const displayName = state.file.name.replace(/\.[^.]+$/, '') || state.file.name;
    dom.filmTitle.textContent = displayName;
    dom.filmTitle.title = state.file.name;
    dom.filmState.textContent = state.sourceKind === 'url' ? t('在线片源已就绪') : t('本地片源已就绪');
    dom.sourceMode.textContent = state.sourceKind === 'url' ? t('在线播放') : t('本地播放');
    dom.fileSize.textContent = state.sourceKind === 'url' || !state.fileSize
      ? (PLATFORM_LABELS[state.platform] || '—')
      : `${formatBytes(state.fileSize)}${state.videoWidth && state.videoHeight ? ` · ${state.videoWidth}×${state.videoHeight}` : ''}`;
    dom.totalTime.textContent = formatTime(state.fileDuration);
    if (state.filesMatch !== false) {
      dom.filmSubline.textContent = sourceSubline({
        fingerprint: state.fingerprint,
        duration: state.fileDuration,
        source: state.sourceKind === 'url' ? { kind: 'url', url: state.sourceUrl } : null,
      });
    }
    dom.replaceButton.hidden = false;
  }

  const PLATFORM_LABELS = {
    youtube: 'YOUTUBE',
    bilibili: 'BILIBILI',
    vimeo: 'VIMEO',
    direct: 'ONLINE',
  };

  function resetVideoInfo() {
    dom.filmTitle.textContent = t('今晚的放映，还差一部电影');
    dom.filmTitle.title = '';
    dom.filmState.textContent = t('尚未选择片源');
    dom.fileSize.textContent = '—';
    dom.sourceMode.textContent = t('本地播放');
    dom.totalTime.textContent = '00:00';
    dom.currentTime.textContent = '00:00';
    dom.filmSubline.textContent = t('选择影片后，会和 TA 自动核对是否为同一片源。');
    dom.replaceButton.hidden = true;
  }

  /* ---------------- Clock & correction ---------------- */

  function updateClockOffset(serverTime, sentAt) {
    if (!Number.isFinite(serverTime) || !Number.isFinite(sentAt)) return;
    const now = Date.now();
    const rtt = Math.max(0, now - sentAt);
    const sample = serverTime - (sentAt + rtt / 2);
    if (!state.clockSynced) {
      state.clockOffset = sample;
      state.clockSynced = true;
    } else {
      const previous = state.clockOffset;
      const adjusted = previous * 0.72 + sample * 0.28;
      state.clockOffset = Math.abs(adjusted - previous) > 8000 ? sample : adjusted;
    }
  }

  function noteDrift(overrideExpected = null) {
    if (!state.hasVideo || !state.roomState.updatedAt) {
      state.lastDrift = null;
      return null;
    }
    const expected = overrideExpected === null ? projectState() : overrideExpected;
    const drift = mediaCurrentTime() - expected;
    state.lastDrift = drift;
    return drift;
  }

  async function tryPlay({ broadcast = true } = {}) {
    if (!state.hasVideo) return false;
    if (!broadcast) suppressControlEvents(900);
    try {
      await dom.player.play();
      state.needsGesture = false;
      updatePlaybackUI();
      return true;
    } catch {
      state.needsGesture = true;
      updatePlaybackUI();
      updateSyncUI();
      return false;
    }
  }

  async function applyRoomState(roomState, { force = false, expectedOverride = null, reason = 'remote' } = {}) {
    if (!state.hasVideo) return;
    state.roomState = roomState;
    if (!state.controllable) {
      // 内嵌平台（Bilibili 等）无法程序化控制，只能提示用户手动对齐。
      updateSyncUI();
      return;
    }
    const expected = expectedOverride === null ? projectState(roomState) : expectedOverride;
    const duration = mediaDuration() || state.fileDuration;
    const target = duration > 0 ? clamp(expected, 0, duration) : expected;
    const drift = mediaCurrentTime() - target;
    const playMismatch = Boolean(roomState.playing) !== (!mediaPaused() && !mediaEnded());

    if (!force && !playMismatch && Math.abs(drift) < 0.35) {
      state.lastDrift = drift;
      updateSyncUI();
      updateTimelineUI();
      return;
    }

    const needsSeek = force || Math.abs(drift) > 0.22;
    state.applyingRemote = true;
    suppressControlEvents(1300);

    if (needsSeek) mediaSeek(target);

    if (roomState.playing) {
      if (mediaPaused()) {
        mediaPlay();
        updatePlaybackUI();
      }
    } else if (!mediaPaused()) {
      mediaPause();
      updatePlaybackUI();
    }

    state.applyingRemote = false;
    state.lastDrift = needsSeek ? 0 : drift;
    updatePlaybackUI();
    updateSyncUI();
    updateTimelineUI();

    if (reason === 'manual') {
      state.lastSyncAt = Date.now();
      updateSyncUI();
    }
  }

  async function autoCorrect(expected, drift) {
    if (!state.autoSync || !state.connected || !state.hasVideo) return;
    if (!state.controllable) return;
    if (state.filesMatch === false) return;
    if (state.buffering || state.scrubbing || (isNativePlayer() && dom.player.seeking)) return;
    if (Date.now() - state.lastUserActionAt < 1500) return;
    if (state.needsGesture) return;

    await applyRoomState(state.roomState, {
      force: true,
      expectedOverride: expected,
      reason: 'auto',
    });
    state.lastSyncAt = Date.now();
    updateSyncUI();
    if (Date.now() - state.lastAutoLogAt > 12000) {
      state.lastAutoLogAt = Date.now();
      const amount = Math.abs(drift);
      addActivity(amount > 0.3
        ? { key: '自动校准了 {seconds} 秒偏差', params: { seconds: amount.toFixed(1) } }
        : '自动校准了播放状态', 'success');
    }
  }

  /* ---------------- Message handling ---------------- */

  function sendMessage(payload) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      try {
        state.socket.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  function sendControl(action, positionOverride = null) {
    if (!state.hasVideo || !state.controllable) return;
    const position = positionOverride === null ? mediaCurrentTime() : positionOverride;
    sendMessage({
      type: 'control',
      action,
      position,
      playing: !mediaPaused(),
    });
  }

  function sendFileMeta() {
    if (!state.file || !state.fingerprint) return;
    sendMessage({
      type: 'file-meta',
      file: {
        fingerprint: state.fingerprint,
        size: state.fileSize,
        duration: state.fileDuration,
        name: state.file.name,
        source: state.sourceKind === 'url'
          ? { kind: 'url', url: state.sourceUrl, platform: state.platform }
          : { kind: 'local' },
      },
    });
  }

  function handleWelcome(message) {
    state.selfId = message.selfId;
    state.everJoined = true;
    state.reconnectAttempts = 0;
    state.reconnectDelay = 1200;
    state.participants = Array.isArray(message.participants) ? message.participants : [];
    if (message.room && message.room.state) state.roomState = message.room.state;
    if (message.room && message.room.duration) state.roomDuration = message.room.duration;
    if (Number.isFinite(message.serverTime)) state.clockOffset = message.serverTime - Date.now();
    state.clockSynced = true;
    setConnection('online', t('已连接'));
    closeModal(dom.entryOverlay);
    renderParticipants();
    updateSyncUI();
    if (state.file) sendFileMeta();
    sendMessage({ type: 'heartbeat', position: mediaCurrentTime(), playing: !mediaPaused(), sentAt: Date.now() });
    if (state.hasVideo && (state.roomState.playing || state.roomState.position > 0.2)) {
      applyRoomState(state.roomState, { force: true, reason: 'join' });
    }
  }

  function handleStateMessage(message) {
    const previous = state.roomState;
    const roomState = message.state;
    if (!roomState) return;
    const fromSelf = roomState.updatedBy === state.selfId;
    state.roomState = roomState;
    state.ended = !roomState.playing && state.fileDuration > 0 && roomState.position >= state.fileDuration - 0.5;
    const actorName = fromSelf ? t('你') : (message.actor ? message.actor.name : 'TA');
    const action = message.action || 'seek';
    const actionKey = {
      play: '{actor}播放了影片',
      pause: '{actor}暂停了影片',
      seek: '{actor}调整了进度',
      ended: '{actor}看完了影片',
    }[action] || '{actor}更新了播放状态';
    addActivity({
      key: actionKey,
      params: fromSelf ? { actor: t('你'), __selfActor: true } : { actor: actorName },
    }, fromSelf ? 'neutral' : 'accent');
    if (!fromSelf) {
      if (action === 'play') toast(t('{actor} 按下了播放', { actor: actorName }), 'success', 2200);
      else if (action === 'pause') toast(t('{actor} 暂停了影片', { actor: actorName }), '', 2200);
    }
    updateSyncUI();
    if (state.hasVideo) {
      if (fromSelf) {
        state.lastDrift = mediaCurrentTime() - projectState(roomState);
        updateSyncUI();
        updateTimelineUI();
      } else {
        applyRoomState(roomState, { reason: 'state' });
      }
    }
    if (previous.revision !== roomState.revision) updateSyncUI();
  }

  function handleSyncCheck(message) {
    if (message.echoSentAt) updateClockOffset(message.serverTime, message.echoSentAt);
    if (message.state) state.roomState = message.state;
    if (message.duration) state.roomDuration = message.duration;
    if (!state.hasVideo) {
      updateSyncUI();
      return;
    }
    const drift = noteDrift(projectState());
    updateSyncUI();
    updateTimelineUI();

    const playMismatch = Boolean(state.roomState.playing) !== (!mediaPaused() && !mediaEnded());
    const shouldCorrect = drift !== null && (Math.abs(drift) > AUTO_SYNC_THRESHOLD || playMismatch);
    if (shouldCorrect && state.autoSync && state.filesMatch !== false && !state.buffering) {
      autoCorrect(projectState(), drift);
    }
  }

  function handleForceSync(message) {
    if (message.state) state.roomState = message.state;
    const fromSelf = message.actor && message.actor.id === state.selfId;
    state.lastSyncAt = Date.now();
    addActivity(fromSelf
      ? '你发起了同步校准'
      : { key: '{actor} 发起了同步校准', params: { actor: message.actor ? message.actor.name : 'TA' } }, 'success');
    if (!state.hasVideo) {
      toast(t('先放入你的片源，才能一起同步'), 'error');
      updateSyncUI();
      return;
    }
    if (!state.controllable) {
      updateSyncUI();
      return;
    }
    applyRoomState(state.roomState, { force: true, reason: 'manual' });
    showSyncFlash();
    dom.manualSync.classList.remove('is-syncing');
    dom.manualSyncSub.textContent = t('已对齐到 {time}', { time: formatTime(projectState()) });
    window.clearTimeout(state.manualResetTimer);
    state.manualResetTimer = window.setTimeout(() => {
      dom.manualSyncSub.textContent = t('让两个人回到同一秒');
    }, 5000);
    if (!fromSelf) toast(t('TA 把进度对齐了'), 'success', 2400);
    updateSyncUI();
  }

  function handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
      case 'welcome':
        handleWelcome(message);
        break;
      case 'participants':
        state.participants = Array.isArray(message.participants) ? message.participants : [];
        renderParticipants();
        break;
      case 'state':
        handleStateMessage(message);
        break;
      case 'sync-check':
        handleSyncCheck(message);
        break;
      case 'force-sync':
        handleForceSync(message);
        break;
      case 'together':
        if (Number.isFinite(message.startAt)) {
          showCountdown(message.startAt);
          addActivity(message.actor && message.actor.id === state.selfId
            ? '发起了「一起开始」倒计时'
            : { key: '{actor} 发起了「一起开始」倒计时', params: { actor: message.actor ? message.actor.name : 'TA' } }, 'success');
        }
        break;
      case 'file-ready':
        renderParticipants();
        if (message.actor && message.actor.id !== state.selfId) {
          const file = message.participant && message.participant.file;
          if (file && file.name) {
            addActivity({
              key: '{actor} 放入了《{title}》',
              params: { actor: message.actor.name, title: stripExtension(file.name) },
            }, 'accent');
          } else {
            addActivity({ key: '{actor} 放入了片源', params: { actor: message.actor.name } }, 'accent');
          }
        }
        break;
      case 'event':
        if (message.event === 'join' && message.name) {
          addActivity({ key: '{name} 连接了放映室', params: { name: message.name } }, 'accent');
        } else if (message.event === 'leave' && message.name) {
          addActivity({ key: '{name} 暂时离线了', params: { name: message.name } }, 'neutral');
        } else if (message.text) {
          addActivity(message.text, message.tone === 'join' ? 'accent' : 'neutral');
        }
        break;
      default:
        break;
    }
  }

  /* ---------------- Connection ---------------- */

  function connect() {
    if (state.fatal) return;
    if (state.socket && (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)) return;

    state.connecting = true;
    setConnection('connecting', state.reconnectAttempts > 0 ? t('正在重连') : t('连接中'));
    const params = new URLSearchParams({
      room: ROOM_ID,
      clientId: getClientId(),
      name: state.selfName,
    });
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket;
    try {
      socket = new WebSocket(`${protocol}//${location.host}/ws?${params.toString()}`);
    } catch {
      state.connecting = false;
      scheduleReconnect();
      return;
    }
    state.socket = socket;

    socket.addEventListener('open', () => {
      if (state.socket !== socket) return;
      state.connecting = false;
      state.connected = true;
      setConnection('online', t('已连接'));
      if (state.hasVideo) sendFileMeta();
      sendMessage({ type: 'heartbeat', position: mediaCurrentTime(), playing: !mediaPaused(), sentAt: Date.now() });
      if (state.reconnectAttempts > 0) {
        toast(t('已经重新连上放映室'), 'success', 2200);
        addActivity('重新连接了放映室', 'success');
      }
    });

    socket.addEventListener('message', (event) => {
      if (state.socket !== socket) return;
      handleMessage(event);
    });

    socket.addEventListener('close', (event) => {
      if (state.socket !== socket) return;
      state.connected = false;
      state.connecting = false;
      state.socket = null;
      const code = event.code;
      if (code === 4003) {
        showFatal(t('这间放映室已经满员了。'), t('两个座位都已经有人了。如果这是你的房间，请刷新原窗口，或回到首页创建新的放映室。'));
        return;
      }
      if (code === 4004) {
        showFatal(t('没有找到这间放映室。'), t('房间码可能已经过期，或者链接不完整。回到首页，重新开一间只属于你们的放映室吧。'));
        return;
      }
      if (code === 4001) {
        showFatal(t('这个身份已在另一个窗口连接。'), t('同一间放映室不能打开两个相同的身份。请关闭其他窗口，再重新刷新这一页。'));
        return;
      }
      if (code === 1000) {
        setConnection('offline', t('已离开'));
        return;
      }
      setConnection('offline', t('连接中断'));
      updateSyncUI();
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      // The close event schedules the reconnect.
    });
  }

  function scheduleReconnect() {
    clearTimeout(state.reconnectTimer);
    if (state.fatal) return;
    state.reconnectAttempts += 1;
    const delay = state.reconnectDelay;
    state.reconnectDelay = Math.min(5000, Math.round(state.reconnectDelay * 1.35));
    state.reconnectTimer = window.setTimeout(() => {
      if (!state.fatal) connect();
    }, delay);
  }

  /* ---------------- Video & file ---------------- */

  function isVideoFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('video/')) return true;
    return /\.(mp4|webm|m4v|mov|mkv|ogv|ogg|avi|ts|m2ts)$/i.test(file.name || '');
  }

  function waitForMediaEvent(media, eventName, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let timer;
      const onEvent = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(t('这个视频格式无法在当前浏览器中播放')));
      };
      const cleanup = () => {
        clearTimeout(timer);
        media.removeEventListener(eventName, onEvent);
        media.removeEventListener('error', onError);
      };
      timer = window.setTimeout(() => {
        cleanup();
        reject(new Error(t('读取视频信息超时，请换一个文件试试')));
      }, timeoutMs);
      media.addEventListener(eventName, onEvent, { once: true });
      media.addEventListener('error', onError, { once: true });
    });
  }

  function resolveMediaDuration(media, timeoutMs = 5000) {
    if (Number.isFinite(media.duration) && media.duration > 0) {
      return Promise.resolve(media.duration);
    }
    return new Promise((resolve, reject) => {
      let finished = false;
      let timer;
      const cleanup = () => {
        if (finished) return false;
        finished = true;
        clearTimeout(timer);
        media.removeEventListener('durationchange', checkDuration);
        media.removeEventListener('timeupdate', checkDuration);
        media.removeEventListener('seeked', checkDuration);
        return true;
      };
      const checkDuration = () => {
        if (!Number.isFinite(media.duration) || media.duration <= 0) return;
        const duration = media.duration;
        if (!cleanup()) return;
        try { media.currentTime = 0; } catch { /* ignore */ }
        resolve(duration);
      };
      timer = window.setTimeout(() => {
        if (!cleanup()) return;
        reject(new Error(t('无法识别视频时长，请尝试 MP4 或常规 WebM 文件')));
      }, timeoutMs);
      media.addEventListener('durationchange', checkDuration);
      media.addEventListener('timeupdate', checkDuration);
      media.addEventListener('seeked', checkDuration);
      try {
        // Some streamed WebM files do not carry duration metadata. Seeking past
        // the end makes Chromium scan the file and expose the real duration.
        media.currentTime = 1e101;
      } catch {
        if (cleanup()) reject(new Error(t('无法读取视频时长')));
      }
    });
  }

  async function probeVideo(url) {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    const ready = waitForMediaEvent(probe, 'loadedmetadata');
    probe.src = url;
    probe.load();
    try {
      await ready;
      const duration = await resolveMediaDuration(probe);
      return {
        duration,
        width: probe.videoWidth || 0,
        height: probe.videoHeight || 0,
      };
    } finally {
      probe.removeAttribute('src');
      probe.load();
    }
  }

  function hashSample(bytes, seed) {
    let hash = seed >>> 0;
    for (let index = 0; index < bytes.length; index += 1) {
      hash ^= bytes[index];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function hex8(value) {
    return value.toString(16).padStart(8, '0');
  }

  async function fingerprintFile(file) {
    const sampleSize = 1024 * 1024;
    const first = new Uint8Array(await file.slice(0, sampleSize).arrayBuffer());
    const last = new Uint8Array(await file.slice(Math.max(0, file.size - sampleSize)).arrayBuffer());
    const meta = new TextEncoder().encode(`tongpin:v1:${file.size}`);
    const combined = new Uint8Array(meta.length + first.length + last.length);
    combined.set(meta, 0);
    combined.set(first, meta.length);
    combined.set(last, meta.length + first.length);
    return `${hex8(hashSample(combined, 0x811c9dc5))}${hex8(hashSample(combined, 0x9e3779b9))}`.toUpperCase();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!isVideoFile(file)) {
      toast(t('请选择视频文件，例如 MP4、WebM 或 MOV'), 'error');
      return;
    }
    if (!file.size) {
      toast(t('这个文件是空的，换一个视频试试'), 'error');
      return;
    }

    const token = ++state.loadToken;
    dom.loading.classList.remove('is-hidden');
    dom.loadingText.textContent = t('正在读取片源…');
    const newUrl = URL.createObjectURL(file);

    try {
      dom.loadingText.textContent = t('正在核对片源指纹…');
      const [fingerprint, metadata] = await Promise.all([
        fingerprintFile(file),
        probeVideo(newUrl),
      ]);
      if (token !== state.loadToken) {
        URL.revokeObjectURL(newUrl);
        return;
      }

      if (!dom.player.paused) {
        suppressControlEvents(900);
        dom.player.pause();
      }

      const oldUrl = state.fileUrl;
      const ready = waitForMediaEvent(dom.player, 'loadedmetadata');
      dom.player.src = newUrl;
      dom.player.load();
      await ready;
      if (token !== state.loadToken) {
        URL.revokeObjectURL(newUrl);
        return;
      }

      dom.loadingText.textContent = t('正在准备播放器…');
      let playbackDuration = metadata.duration;
      try {
        playbackDuration = await resolveMediaDuration(dom.player);
      } catch {
        playbackDuration = metadata.duration;
      }
      if (token !== state.loadToken) {
        URL.revokeObjectURL(newUrl);
        return;
      }

      if (oldUrl && oldUrl !== newUrl) URL.revokeObjectURL(oldUrl);

      state.file = file;
      state.fileUrl = newUrl;
      state.sourceKind = 'local';
      state.sourceUrl = '';
      state.platform = 'file';
      state.playerMode = 'native';
      state.controllable = true;
      state.fingerprint = fingerprint;
      state.fileDuration = playbackDuration;
      state.videoWidth = metadata.width;
      state.videoHeight = metadata.height;
      state.fileSize = file.size;
      state.hasVideo = true;
      state.needsGesture = false;
      state.buffering = false;
      state.ended = false;
      state.lastDrift = null;

      dom.player.volume = dom.volume.valueAsNumber;
      dom.player.muted = false;
      destroyYouTubePlayer();
      dom.embedPlayer.removeAttribute('src');
      showPlayerSurface('native');
      dom.stageFrame.classList.add('has-video');
      dom.stageFrame.classList.remove('is-dragging');
      dom.emptyState.classList.add('is-hidden');
      dom.loading.classList.add('is-hidden');
      dom.videoControls.classList.remove('is-hidden');
      setVideoInfo();
      updatePlaybackUI();
      updateTimelineUI();
      sendFileMeta();
      evaluateFiles();
      updateSyncUI();
      addActivity({ key: '你载入了《{title}》', params: { title: stripExtension(file.name) } }, 'accent');
      toast(t('片源已就绪，只在你本机播放'), 'success', 2600);

      if (state.roomState.updatedAt && (state.roomState.playing || state.roomState.position > 0.2)) {
        await applyRoomState(state.roomState, { force: true, reason: 'file' });
      } else {
        updatePlaybackUI();
      }
    } catch (error) {
      const committed = state.fileUrl === newUrl;
      dom.loading.classList.add('is-hidden');
      if (!committed) {
        URL.revokeObjectURL(newUrl);
        if (state.hasVideo && state.fileUrl) {
          try {
            dom.player.src = state.fileUrl;
            dom.player.load();
          } catch {
            // Keep the existing player state as best we can.
          }
        } else {
          dom.player.removeAttribute('src');
          dom.player.load();
        }
      }
      toast(error.message || t('无法读取这个视频文件'), 'error', 5000);
    } finally {
      dom.fileInput.value = '';
    }
  }

  function chooseFile() {
    dom.fileInput.click();
  }

  /* ---------------- 播放器抽象：原生 / YouTube / 内嵌 ---------------- */

  function isNativePlayer() {
    return state.playerMode === 'native';
  }

  function isYouTubePlayer() {
    return state.playerMode === 'youtube';
  }

  function mediaCurrentTime() {
    if (isYouTubePlayer()) {
      try { return Number(state.ytPlayer.getCurrentTime()) || 0; } catch { return 0; }
    }
    if (!isNativePlayer()) return 0;
    return Number(dom.player.currentTime) || 0;
  }

  function mediaDuration() {
    if (isYouTubePlayer()) {
      try { return Number(state.ytPlayer.getDuration()) || state.fileDuration || 0; } catch { return state.fileDuration || 0; }
    }
    if (!isNativePlayer()) return state.fileDuration || 0;
    const live = Number(dom.player.duration);
    return Number.isFinite(live) && live > 0 ? live : (state.fileDuration || 0);
  }

  function mediaPaused() {
    if (isYouTubePlayer()) {
      try { return state.ytPlayer.getPlayerState() !== 1; } catch { return true; }
    }
    if (!isNativePlayer()) return true;
    return dom.player.paused;
  }

  function mediaEnded() {
    if (isYouTubePlayer()) {
      try { return state.ytPlayer.getPlayerState() === 0; } catch { return false; }
    }
    if (!isNativePlayer()) return false;
    return dom.player.ended;
  }

  function mediaPlay() {
    if (isYouTubePlayer()) {
      try { state.ytPlayer.playVideo(); } catch { /* ignore */ }
      return;
    }
    if (!isNativePlayer()) return;
    const result = dom.player.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }

  function mediaPause() {
    if (isYouTubePlayer()) {
      try { state.ytPlayer.pauseVideo(); } catch { /* ignore */ }
      return;
    }
    if (!isNativePlayer()) return;
    dom.player.pause();
  }

  function mediaSeek(target) {
    if (isYouTubePlayer()) {
      try { state.ytPlayer.seekTo(Math.max(0, target), true); } catch { /* ignore */ }
      return;
    }
    if (!isNativePlayer()) return;
    try { dom.player.currentTime = Math.max(0, target); } catch { /* ignore */ }
  }

  /* ---------------- 平台链接解析 ---------------- */

  const DIRECT_MEDIA_RE = /\.(mp4|webm|m4v|mov|ogv|ogg|m3u8|ts|flv)(\?|#|$)/i;
  // 受 DRM 保护，浏览器不允许第三方控制或解析，直接给出明确提示
  const DRM_HOSTS = /(^|\.)(netflix\.com|disneyplus\.com|hbomax\.com|max\.com|primevideo\.com|hulu\.com|iqiyi\.com|youku\.com|qq\.com|mgtv\.com|sohu\.com)$/i;
  // 没有 DRM、但需要服务器解析页面拿直链的站点
  const KNOWN_PAGE_HOSTS = /(^|\.)(douyin\.com|tiktok\.com|ixigua\.com|weibo\.com|twitch\.tv|dailymotion\.com)$/i;

  function youtubeId(parsed) {
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || '';
    }
    const fromQuery = parsed.searchParams.get('v');
    if (fromQuery) return fromQuery;
    const match = parsed.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : '';
  }

  function bilibiliInfo(parsed) {
    const bv = parsed.pathname.match(/\/(BV[0-9A-Za-z]{8,})/);
    if (bv) {
      const page = parsed.searchParams.get('p') || '1';
      return { query: `bvid=${bv[1]}&p=${Number(page) || 1}`, label: bv[1] };
    }
    const av = parsed.pathname.match(/\/av(\d+)/i);
    if (av) {
      const page = parsed.searchParams.get('p') || '1';
      return { query: `aid=${av[1]}&p=${Number(page) || 1}`, label: `av${av[1]}` };
    }
    const queryBv = parsed.searchParams.get('bvid');
    if (queryBv) return { query: `bvid=${queryBv}&p=1`, label: queryBv };
    return null;
  }

  function parsePlatformLink(raw) {
    const input = String(raw || '').trim();
    if (!input) return { error: t('请输入视频链接') };
    let parsed;
    try {
      parsed = new URL(input.startsWith('//') ? `https:${input}` : input);
    } catch {
      return { error: t('链接格式不对，请粘贴 http 或 https 开头的地址') };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: t('链接格式不对，请粘贴 http 或 https 开头的地址') };
    }
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const url = parsed.href;

    if (host === 'youtu.be' || /(^|\.)(youtube\.com|youtube-nocookie\.com|music\.youtube\.com)$/.test(host)) {
      const videoId = youtubeId(parsed);
      if (!videoId) return { error: t('没有识别出 YouTube 视频 ID，请粘贴完整的视频链接。') };
      return {
        platform: 'youtube',
        videoId,
        url,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1`,
      };
    }

    if (host === 'b23.tv') {
      return { error: t('b23.tv 短链无法直接识别，请先在浏览器打开，再复制完整的 Bilibili 视频链接。') };
    }

    if (/(^|\.)bilibili\.com$/.test(host)) {
      const info = bilibiliInfo(parsed);
      if (!info) return { error: t('没有识别出 Bilibili 视频号，请粘贴含 BV 号或 av 号的视频链接。') };
      return {
        platform: 'bilibili',
        url,
        label: info.label,
        embedUrl: `https://player.bilibili.com/player.html?${info.query}&autoplay=0&danmaku=0&high_quality=1`,
      };
    }

    if (/(^|\.)vimeo\.com$/.test(host)) {
      const match = parsed.pathname.match(/(\d{6,})/);
      if (!match) return { error: t('没有识别出 Vimeo 视频 ID，请粘贴完整的视频链接。') };
      return {
        platform: 'vimeo',
        videoId: match[1],
        url,
        embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=0&title=0&byline=0&portrait=0`,
      };
    }

    if (DIRECT_MEDIA_RE.test(parsed.pathname + parsed.search)) {
      return { platform: 'direct', url };
    }

    if (DRM_HOSTS.test(host)) {
      return { error: t('暂不支持这个网站：它使用 DRM 加密，浏览器不允许第三方播放或解析。') };
    }

    if (KNOWN_PAGE_HOSTS.test(host) || /\.(html?|php|aspx)$/i.test(parsed.pathname)) {
      return { platform: 'page', url };
    }

    // 其他网页地址交给服务器解析
    if (/\/(watch|video|play|detail|drama|movie|tv|vod|episode)/i.test(parsed.pathname)) {
      return { platform: 'page', url };
    }

    // 无扩展名的直链也当成在线视频尝试一次
    return { platform: 'direct', url };
  }

  async function resolvePageSource(parsed, { fromPeer = false } = {}) {
    const token = ++state.loadToken;
    closeModal(dom.sourceModal);
    clearSourceError();
    dom.loading.classList.remove('is-hidden');
    dom.loadingText.textContent = t('正在解析网页里的视频…');

    let result;
    try {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.url }),
      });
      result = await response.json().catch(() => null);
    } catch {
      result = null;
    }
    if (token !== state.loadToken) return false;

    if (!result || !result.ok || !Array.isArray(result.streams) || !result.streams.length) {
      dom.loading.classList.add('is-hidden');
      const message = (result && result.errorText) || t('没能解析这个网页里的视频，可以换一个来源或使用直链。');
      if (fromPeer) {
        if (!peerNoticeShown) {
          peerNoticeShown = true;
          toast(message, 'error', 6000);
        }
      } else {
        showSourceError(message);
        openModal(dom.sourceModal);
        dom.sourcePlatform.textContent = message;
      }
      return false;
    }

    const picked = result.streams[0];
    const name = result.title
      || (sourceNameFromUrl(parsed.url) || t('在线片源'));

    const loaded = await loadDirectSource({
      platform: 'direct',
      url: picked.url,
      name,
      needsHeaders: Boolean(picked.needsHeaders),
    }, { fromPeer, label: name });

    return loaded;
  }

  /* ---------------- YouTube 适配 ---------------- */

  let ytApiLoader = null;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiLoader) return ytApiLoader;
    ytApiLoader = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        if (window.YT && window.YT.Player) resolve(window.YT);
        else reject(new Error('yt-unavailable'));
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('yt-unavailable'));
      document.head.appendChild(script);
      window.setTimeout(() => {
        if (!(window.YT && window.YT.Player)) reject(new Error('yt-timeout'));
      }, 14000);
    });
    ytApiLoader.catch(() => { ytApiLoader = null; });
    return ytApiLoader;
  }

  function destroyYouTubePlayer() {
    if (state.ytPlayer) {
      try { state.ytPlayer.destroy(); } catch { /* ignore */ }
      state.ytPlayer = null;
    }
    if (dom.ytMount) dom.ytMount.replaceChildren();
  }

  function handleYouTubeStateChange(event) {
    const YT = window.YT;
    if (!YT || !event) return;
    if (event.data === YT.PlayerState.PLAYING) {
      state.needsGesture = false;
      state.ended = false;
      state.buffering = false;
      updatePlaybackUI();
      updateSyncUI();
      if (isControlSuppressed()) return;
      state.lastUserActionAt = Date.now();
      sendControl('play', mediaCurrentTime());
    } else if (event.data === YT.PlayerState.PAUSED) {
      updatePlaybackUI();
      updateSyncUI();
      if (isControlSuppressed()) return;
      state.lastUserActionAt = Date.now();
      sendControl('pause', mediaCurrentTime());
    } else if (event.data === YT.PlayerState.BUFFERING) {
      state.buffering = true;
      updateSyncStatusPill();
    } else if (event.data === YT.PlayerState.ENDED) {
      state.ended = true;
      updatePlaybackUI();
      if (isControlSuppressed()) return;
      sendControl('ended', mediaDuration());
    }
  }

  async function createYouTubePlayer(videoId) {
    destroyYouTubePlayer();
    dom.ytMount.replaceChildren();
    const mount = document.createElement('div');
    dom.ytMount.appendChild(mount);
    const YT = await loadYouTubeApi();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('yt-timeout'));
      }, 16000);
      const player = new YT.Player(mount, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, origin: location.origin },
        events: {
          onReady: () => {
            try {
              const frame = player.getIframe && player.getIframe();
              if (frame) {
                frame.style.width = '100%';
                frame.style.height = '100%';
                frame.style.border = '0';
              }
            } catch { /* ignore */ }
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(player);
          },
          onStateChange: handleYouTubeStateChange,
          onError: () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            reject(new Error('yt-error'));
          },
        },
      });
    });
  }

  /* ---------------- 一起开始（倒计时） ---------------- */

  function showCountdown(startAt) {
    window.clearInterval(state.countdownTimer);
    dom.countdownCard.classList.remove('is-hidden');

    const tick = () => {
      const remaining = startAt - serverNow();
      if (remaining <= -700) {
        window.clearInterval(state.countdownTimer);
        state.countdownTimer = null;
        dom.countdownCard.classList.add('is-hidden');
        if (state.controllable) {
          mediaSeek(projectState());
          mediaPlay();
          suppressControlEvents(1500);
        }
        return;
      }
      if (remaining <= 0) {
        dom.countdownNumber.textContent = '▶';
        dom.countdownHint.textContent = state.controllable ? t('同时播放') : t('现在一起按下播放');
      } else {
        dom.countdownNumber.textContent = String(Math.ceil(remaining / 1000));
        dom.countdownHint.textContent = t('一起按下播放');
      }
    };

    tick();
    state.countdownTimer = window.setInterval(tick, 100);
  }

  function startTogether() {
    if (!state.connected) {
      toast(t('连接中断了，正在尝试重连'), 'error');
      return;
    }
    if (!state.hasVideo) {
      toast(t('先载入片源，才能一起开始'), 'error');
      return;
    }
    const startAt = serverNow() + 3200;
    sendMessage({ type: 'together', startAt });
    showCountdown(startAt);
  }

  /* ---------------- 在线视频链接 ---------------- */

  function stripExtension(name) {
    return String(name || '').replace(/\.[^.]+$/, '');
  }

  function revokeIfBlob(url) {
    if (!url || !String(url).startsWith('blob:')) return;
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }

  function fingerprintUrl(url) {
    const text = `tongpin:url:${url}`;
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193) >>> 0;
      second = Math.imul(second ^ code, 0x9e3779b9) >>> 0;
    }
    return `${hex8(first)}${hex8(second)}`.toUpperCase();
  }

  function sourceNameFromUrl(url) {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      if (last) return decodeURIComponent(last);
      return parsed.hostname;
    } catch {
      return t('在线片源');
    }
  }

  function isHlsUrl(url) {
    return /\.m3u8(\?|#|$)/i.test(url);
  }

  function destroyHls() {
    if (!state.hls) return;
    try { state.hls.destroy(); } catch { /* ignore */ }
    state.hls = null;
  }

  let hlsLoader = null;

  function loadHlsLibrary() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoader) return hlsLoader;
    hlsLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HLS_CDN;
      script.async = true;
      script.onload = () => (window.Hls ? resolve(window.Hls) : reject(new Error('hls-unavailable')));
      script.onerror = () => reject(new Error('hls-unavailable'));
      document.head.appendChild(script);
    });
    hlsLoader.catch(() => { hlsLoader = null; });
    return hlsLoader;
  }

  async function attachMediaSource(url) {
    destroyHls();
    if (isHlsUrl(url) && !dom.player.canPlayType('application/vnd.apple.mpegurl')) {
      const Hls = await loadHlsLibrary();
      const hls = new Hls({ enableWorker: true });
      state.hls = hls;
      hls.attachMedia(dom.player);
      hls.loadSource(url);
      return;
    }
    dom.player.src = url;
    dom.player.load();
  }

  let peerNoticeShown = false;

  function handleLoadFailure(message, { fromPeer = false } = {}) {
    dom.loading.classList.add('is-hidden');
    if (fromPeer) {
      if (!peerNoticeShown) {
        peerNoticeShown = true;
        toast(message, 'error', 5200);
      }
      return;
    }
    showSourceError(message);
    openModal(dom.sourceModal);
  }

  function showPlayerSurface(mode) {
    const embed = mode !== 'native';
    dom.stageFrame.classList.toggle('is-embed', embed);
    dom.player.classList.toggle('is-hidden', embed);
    dom.embedFrame.classList.toggle('is-hidden', !embed);
    dom.embedPlayer.classList.toggle('is-hidden', mode !== 'embed');
    dom.ytMount.classList.toggle('is-hidden', mode !== 'youtube');
    dom.videoControls.classList.toggle('is-hidden', embed);
  }

  function applySourceState({ name, url, platform, playerMode, controllable, duration, width, height }) {
    state.file = { name, size: 0 };
    state.fileUrl = url;
    state.sourceKind = 'url';
    state.sourceUrl = url;
    state.platform = platform;
    state.playerMode = playerMode;
    state.controllable = Boolean(controllable);
    state.fingerprint = fingerprintUrl(url);
    state.fileDuration = Number(duration) || 0;
    state.videoWidth = width || 0;
    state.videoHeight = height || 0;
    state.fileSize = 0;
    state.hasVideo = true;
    state.needsGesture = false;
    state.buffering = false;
    state.ended = false;
    state.lastDrift = null;
    dom.stageFrame.classList.add('has-video');
    dom.stageFrame.classList.remove('is-dragging');
    dom.emptyState.classList.add('is-hidden');
    dom.loading.classList.add('is-hidden');
  }

  function afterSourceReady(name, { fromPeer = false, note = null } = {}) {
    showPlayerSurface(state.playerMode);
    setVideoInfo();
    updatePlaybackUI();
    sendFileMeta();
    evaluateFiles();
    updateSyncUI();
    addActivity({ key: '你载入了在线片源《{title}》', params: { title: name } }, 'accent');
    if (note) toast(note, 'success', 3600);
    else {
      toast(fromPeer
        ? t('TA 正在使用在线片源，已为你同步载入')
        : t('在线片源已载入'), 'success', 3000);
    }
  }

  async function loadYouTubeSource(parsed, { fromPeer = false } = {}) {
    const token = ++state.loadToken;
    closeModal(dom.sourceModal);
    clearSourceError();
    dom.loading.classList.remove('is-hidden');
    dom.loadingText.textContent = t('正在连接 YouTube…');
    try {
      const player = await createYouTubePlayer(parsed.videoId);
      if (token !== state.loadToken) {
        destroyYouTubePlayer();
        return false;
      }
      let duration = 0;
      try { duration = Number(player.getDuration()) || 0; } catch { duration = 0; }
      if (!duration) {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        try { duration = Number(player.getDuration()) || 0; } catch { duration = 0; }
      }
      if (token !== state.loadToken) {
        destroyYouTubePlayer();
        return false;
      }
      const name = parsed.label || t('YouTube 视频') + ' · ' + parsed.videoId;
      applySourceState({
        name,
        url: parsed.url,
        platform: 'youtube',
        playerMode: 'youtube',
        controllable: true,
        duration,
      });
      afterSourceReady(name, { fromPeer, note: fromPeer ? t('TA 正在使用在线片源，已为你同步载入') : t('YouTube 片源已载入') });
      if (state.roomState.updatedAt && (state.roomState.playing || state.roomState.position > 0.2)) {
        await applyRoomState(state.roomState, { force: true, reason: 'file' });
      }
      return true;
    } catch {
      destroyYouTubePlayer();
      handleLoadFailure(t('无法载入这个 YouTube 视频：可能是网络限制、地区限制或被禁止嵌入。'), { fromPeer });
      return false;
    }
  }

  function loadEmbedSource(parsed, { fromPeer = false } = {}) {
    closeModal(dom.sourceModal);
    clearSourceError();
    destroyYouTubePlayer();
    if (isNativePlayer() && !dom.player.paused) dom.player.pause();
    const platformName = parsed.platform === 'bilibili' ? 'Bilibili' : 'Vimeo';
    const name = parsed.label || platformName;
    dom.embedPlayer.src = parsed.embedUrl;
    applySourceState({
      name,
      url: parsed.url,
      platform: parsed.platform,
      playerMode: 'embed',
      controllable: false,
      duration: 0,
    });
    afterSourceReady(name, {
      fromPeer,
      note: fromPeer
        ? t('TA 正在使用在线片源，已为你同步载入')
        : t('{platform} 片源已载入。该平台不支持自动同步，请用「一起开始」倒计时对齐。', { platform: platformName }),
    });
    return true;
  }

  async function loadDirectSource(parsed, { fromPeer = false, label = '' } = {}) {
    const url = parsed.url;

    const token = ++state.loadToken;
    closeModal(dom.sourceModal);
    clearSourceError();
    dom.loading.classList.remove('is-hidden');
    dom.loadingText.textContent = t('正在连接在线片源…');

    let metadata = { duration: 0, width: 0, height: 0 };
    try {
      metadata = await probeVideo(url);
    } catch {
      // 探测失败不代表不能播放，交给播放器再试一次。
    }
    if (token !== state.loadToken) return false;

    const previousUrl = state.fileUrl;
    try {
      if (!dom.player.paused) {
        suppressControlEvents(900);
        dom.player.pause();
      }
      const ready = waitForMediaEvent(dom.player, 'loadedmetadata', 25000);
      await attachMediaSource(url);
      await ready;
      if (token !== state.loadToken) return false;

      dom.loadingText.textContent = t('正在准备播放器…');
      let playbackDuration = metadata.duration;
      try {
        playbackDuration = await resolveMediaDuration(dom.player, 8000);
      } catch {
        playbackDuration = metadata.duration;
      }
      if (token !== state.loadToken) return false;

      revokeIfBlob(previousUrl);
      const name = label || sourceNameFromUrl(url);
      applySourceState({
        name,
        url,
        platform: 'direct',
        playerMode: 'native',
        controllable: true,
        duration: playbackDuration,
        width: metadata.width,
        height: metadata.height,
      });

      if (parsed.needsHeaders) {
        addActivity('该地址可能需要 Referer 校验，直接播放可能失败', 'warning');
      }
      dom.player.volume = dom.volume.valueAsNumber;
      dom.player.muted = false;
      afterSourceReady(name, { fromPeer });
      if (state.roomState.updatedAt && (state.roomState.playing || state.roomState.position > 0.2)) {
        await applyRoomState(state.roomState, { force: true, reason: 'file' });
      } else {
        updatePlaybackUI();
      }
      return true;
    } catch {
      dom.loading.classList.add('is-hidden');
      destroyHls();
      if (state.hasVideo && state.fileUrl && isNativePlayer()) {
        try {
          dom.player.src = state.fileUrl;
          dom.player.load();
        } catch {
          // Keep whatever the player had.
        }
      }
      handleLoadFailure(t('无法载入这个链接：可能是防盗链、跨域限制或格式不支持。'), { fromPeer });
      return false;
    }
  }

  function handleUrl(rawUrl, options = {}) {
    const parsed = parsePlatformLink(rawUrl);
    if (parsed.error) {
      if (!options.fromPeer) showSourceError(parsed.error);
      return Promise.resolve(false);
    }
    if (parsed.platform === 'youtube') return loadYouTubeSource(parsed, options);
    if (parsed.platform === 'bilibili' || parsed.platform === 'vimeo') return Promise.resolve(loadEmbedSource(parsed, options));
    if (parsed.platform === 'page') return resolvePageSource(parsed, options);
    return loadDirectSource(parsed, options);
  }

  function maybeAdoptPeerSource() {
    const file = state.partnerFile;
    if (!file || !file.source || file.source.kind !== 'url') return;
    if (state.hasVideo) return;
    if (!state.partner || !state.partner.online) return;
    if (state.peerSourceAttempted === file.source.url) return;
    state.peerSourceAttempted = file.source.url;
    handleUrl(file.source.url, { fromPeer: true });
  }

  function showSourceError(message) {
    if (!dom.sourceError) return;
    dom.sourceError.textContent = message;
    dom.sourceError.classList.add('is-visible');
  }

  function clearSourceError() {
    if (!dom.sourceError) return;
    dom.sourceError.textContent = '';
    dom.sourceError.classList.remove('is-visible');
  }

  function openSourceDialog() {
    clearSourceError();
    if (state.sourceKind === 'url' && state.sourceUrl) dom.sourceUrl.value = state.sourceUrl;
    updatePlatformHint();
    openModal(dom.sourceModal);
  }

  const PLATFORM_HINTS = {
    youtube: 'YouTube · 支持完整同步',
    bilibili: 'Bilibili · 仅嵌入，用「一起开始」对齐',
    vimeo: 'Vimeo · 仅嵌入，用「一起开始」对齐',
    direct: '视频直链 · 支持完整同步',
    page: '网页视频 · 服务器尝试解析直链',
  };

  function updatePlatformHint() {
    if (!dom.sourcePlatform) return;
    const raw = dom.sourceUrl.value.trim();
    if (!raw) {
      dom.sourcePlatform.textContent = t('支持 YouTube · Bilibili · Vimeo · 视频直链');
      dom.sourcePlatform.classList.remove('is-detected');
      return;
    }
    const parsed = parsePlatformLink(raw);
    if (parsed.error) {
      dom.sourcePlatform.textContent = parsed.error;
      dom.sourcePlatform.classList.remove('is-detected');
      return;
    }    const hint = PLATFORM_HINTS[parsed.platform] || '';
    dom.sourcePlatform.textContent = t(hint);
    dom.sourcePlatform.classList.add('is-detected');
  }

  /* ---------------- Actions ---------------- */

  function clearControlSuppression() {
    state.suppressControlUntil = 0;
  }

  async function togglePlayback() {
    if (!state.hasVideo) {
      chooseFile();
      return;
    }
    if (!state.controllable) {
      startTogether();
      return;
    }
    clearControlSuppression();
    state.lastUserActionAt = Date.now();
    if (mediaEnded()) {
      mediaSeek(0);
      state.ended = false;
      state.lastDrift = 0;
      sendControl('seek', 0);
      if (isNativePlayer()) await tryPlay({ broadcast: true });
      else {
        mediaPlay();
        sendControl('play', 0);
      }
      return;
    }
    if (mediaPaused()) {
      if (isNativePlayer()) await tryPlay({ broadcast: true });
      else {
        mediaPlay();
        updatePlaybackUI();
      }
    } else {
      mediaPause();
      updatePlaybackUI();
    }
  }

  function seekTo(target, { broadcast = true } = {}) {
    if (!state.hasVideo) return;
    if (!state.controllable) {
      toast(t('这个平台不支持跳转，请用「一起开始」对齐进度'), '', 3200);
      return;
    }
    const position = clamp(target, 0, state.fileDuration || target);
    clearControlSuppression();
    state.lastUserActionAt = Date.now();
    state.ended = false;
    suppressControlEvents(700);
    mediaSeek(position);
    state.lastDrift = 0;
    updateTimelineUI();
    updatePlaybackUI();
    if (broadcast) sendControl('seek', position);
  }

  function seekBy(seconds) {
    if (!state.hasVideo) return;
    seekTo(mediaCurrentTime() + seconds);
  }

  function scheduleControlsHide() {
    clearTimeout(state.controlsTimer);
    if (!state.hasVideo || mediaPaused()) {
      dom.stageFrame.classList.remove('controls-hidden');
      return;
    }
    state.controlsTimer = window.setTimeout(() => {
      if (!mediaPaused() && !state.scrubbing) dom.stageFrame.classList.add('controls-hidden');
    }, 3200);
  }

  function revealControls() {
    dom.stageFrame.classList.remove('controls-hidden');
    scheduleControlsHide();
  }

  function updateVolumeIcon() {
    const muted = dom.player.muted || dom.player.volume === 0;
    setIcon(dom.muteButton, muted ? '#i-mute' : '#i-volume');
    dom.muteButton.setAttribute('aria-label', muted ? t('取消静音') : t('静音'));
    dom.volume.value = String(dom.player.muted ? 0 : dom.player.volume);
    dom.volume.style.setProperty('--volume', `${(dom.player.muted ? 0 : dom.player.volume) * 100}%`);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (dom.stageFrame.requestFullscreen) await dom.stageFrame.requestFullscreen();
        else if (dom.player.webkitEnterFullscreen) dom.player.webkitEnterFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      if (dom.player.webkitEnterFullscreen) {
        try {
          dom.player.webkitEnterFullscreen();
          return;
        } catch {
          // Fall through to the hint below.
        }
      }
      toast(t('当前浏览器不支持全屏，试试用浏览器菜单进入全屏'), '', 3000);
    }
  }

  function manualSync() {
    if (!state.connected) {
      toast(t('连接中断了，正在尝试重连'), 'error');
      return;
    }
    if (!state.hasVideo) {
      toast(t('先选择你的本地片源，才能同步进度'), 'error');
      chooseFile();
      return;
    }
    if (!state.controllable) {
      startTogether();
      return;
    }
    if (state.filesMatch === false) {
      toast(t('双方片源不一致，时间可以对齐，但画面可能不同'), '', 3600);
    }
    dom.manualSync.classList.add('is-syncing');
    const sent = sendMessage({ type: 'request-sync' });
    if (!sent) {
      dom.manualSync.classList.remove('is-syncing');
      toast(t('请求没有发出去，请检查网络连接'), 'error');
      return;
    }
    window.setTimeout(() => dom.manualSync.classList.remove('is-syncing'), 2400);
  }

  function openInvite() {
    populateInviteDialog();
    openModal(dom.inviteModal);
  }

  /* ---------------- Event wiring ---------------- */

  function wireEvents() {
    dom.pickButton.addEventListener('click', chooseFile);
    dom.urlOpen.addEventListener('click', openSourceDialog);
    dom.replaceButton.addEventListener('click', openSourceDialog);
    dom.sourceFile.addEventListener('click', () => {
      closeModal(dom.sourceModal);
      chooseFile();
    });
    dom.sourceUrl.addEventListener('input', () => {
      clearSourceError();
      updatePlatformHint();
    });
    dom.sourceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const parsed = parsePlatformLink(dom.sourceUrl.value);
      if (parsed.error) {
        showSourceError(parsed.error);
        dom.sourceUrl.focus();
        return;
      }
      handleUrl(dom.sourceUrl.value.trim());
    });
    dom.fileInput.addEventListener('change', () => {
      const file = dom.fileInput.files && dom.fileInput.files[0];
      if (file) handleFile(file);
    });

    dom.stageFrame.addEventListener('dragenter', (event) => {
      event.preventDefault();
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      state.dragDepth += 1;
      dom.stageFrame.classList.add('is-dragging');
    });
    dom.stageFrame.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    dom.stageFrame.addEventListener('dragleave', (event) => {
      event.preventDefault();
      state.dragDepth = Math.max(0, state.dragDepth - 1);
      if (state.dragDepth === 0) dom.stageFrame.classList.remove('is-dragging');
    });
    dom.stageFrame.addEventListener('drop', (event) => {
      event.preventDefault();
      state.dragDepth = 0;
      dom.stageFrame.classList.remove('is-dragging');
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    window.addEventListener('dragover', (event) => {
      if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault();
    });
    window.addEventListener('drop', (event) => {
      if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault();
    });

    dom.playButton.addEventListener('click', togglePlayback);
    dom.centerPlay.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlayback();
    });
    dom.backButton.addEventListener('click', () => seekBy(-10));
    dom.forwardButton.addEventListener('click', () => seekBy(10));

    dom.stageFrame.addEventListener('click', (event) => {
      if (!state.hasVideo) return;
      const target = event.target;
      if (target instanceof Element && target.closest('button, input, .video-controls, .screen-topbar, .gesture-card, .drop-overlay')) return;
      if (dom.stageFrame.classList.contains('controls-hidden')) {
        revealControls();
        return;
      }
      togglePlayback();
    });

    dom.stageFrame.addEventListener('dblclick', (event) => {
      if (!state.hasVideo) return;
      const target = event.target;
      if (target instanceof Element && target.closest('button, input, .video-controls, .screen-topbar, .gesture-card')) return;
      toggleFullscreen();
    });

    dom.stageFrame.addEventListener('pointermove', revealControls);
    dom.stageFrame.addEventListener('pointerleave', () => {
      if (!dom.player.paused) scheduleControlsHide();
    });

    dom.player.addEventListener('play', () => {
      state.needsGesture = false;
      state.ended = false;
      updatePlaybackUI();
      scheduleControlsHide();
      if (isControlSuppressed()) return;
      state.lastUserActionAt = Date.now();
      sendControl('play');
    });

    dom.player.addEventListener('pause', () => {
      updatePlaybackUI();
      if (isControlSuppressed() || dom.player.ended) return;
      state.lastUserActionAt = Date.now();
      sendControl('pause');
    });

    dom.player.addEventListener('timeupdate', () => {
      if (!state.scrubbing) {
        updateTimelineUI();
        noteDrift();
        updateSyncUI();
      }
    });

    dom.player.addEventListener('durationchange', () => {
      if (Number.isFinite(dom.player.duration) && dom.player.duration > 0) {
        state.fileDuration = dom.player.duration;
      }
      updateTimelineUI();
    });

    dom.player.addEventListener('waiting', () => {
      state.buffering = true;
      updateSyncStatusPill();
    });
    dom.player.addEventListener('playing', () => {
      state.buffering = false;
      state.needsGesture = false;
      updatePlaybackUI();
      updateSyncStatusPill();
    });
    dom.player.addEventListener('canplay', () => {
      state.buffering = false;
      updateSyncStatusPill();
    });
    dom.player.addEventListener('stalled', () => {
      state.buffering = true;
      updateSyncStatusPill();
    });

    dom.player.addEventListener('ended', () => {
      state.ended = true;
      updatePlaybackUI();
      if (!isControlSuppressed()) {
        state.lastUserActionAt = Date.now();
        sendControl('ended', state.fileDuration || dom.player.currentTime);
      }
    });

    dom.player.addEventListener('error', () => {
      if (state.hasVideo && dom.player.error) {
        toast(t('视频播放出错了，尝试换一个格式（推荐 MP4 / H.264）'), 'error', 5000);
      }
    });

    dom.player.addEventListener('volumechange', updateVolumeIcon);

    dom.timeline.addEventListener('pointerdown', () => {
      if (!state.hasVideo) return;
      state.scrubbing = true;
      state.scrubbingTarget = (dom.timeline.valueAsNumber / 1000) * state.fileDuration;
      clearTimeout(state.controlsTimer);
    });

    dom.timeline.addEventListener('input', () => {
      if (!state.hasVideo) return;
      state.scrubbing = true;
      state.scrubbingTarget = (dom.timeline.valueAsNumber / 1000) * state.fileDuration;
      const percent = dom.timeline.valueAsNumber / 10;
      dom.timeline.style.setProperty('--played', `${percent}%`);
      dom.currentTime.textContent = formatTime(state.scrubbingTarget);
    });

    const commitScrub = () => {
      if (!state.scrubbing) return;
      state.scrubbing = false;
      seekTo(state.scrubbingTarget);
    };
    dom.timeline.addEventListener('change', commitScrub);
    dom.timeline.addEventListener('pointerup', commitScrub);
    dom.timeline.addEventListener('pointercancel', () => { state.scrubbing = false; });

    dom.timeline.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? -5 : 5;
        seekTo(mediaCurrentTime() + step);
      }
    });

    dom.backButton.addEventListener('click', () => seekBy(-10));
    dom.forwardButton.addEventListener('click', () => seekBy(10));
    dom.fullscreenButton.addEventListener('click', toggleFullscreen);

    dom.muteButton.addEventListener('click', () => {
      dom.player.muted = !dom.player.muted;
      if (!dom.player.muted && dom.player.volume === 0) dom.player.volume = 0.5;
      updateVolumeIcon();
    });

    dom.volume.addEventListener('input', () => {
      const value = dom.volume.valueAsNumber;
      dom.player.volume = value;
      dom.player.muted = value === 0;
      try { localStorage.setItem(VOLUME_KEY, String(value)); } catch { /* ignore */ }
      updateVolumeIcon();
    });

    dom.autoSyncToggle.addEventListener('change', () => {
      state.autoSync = dom.autoSyncToggle.checked;
      try { localStorage.setItem(AUTO_SYNC_KEY, state.autoSync ? 'on' : 'off'); } catch { /* ignore */ }
      addActivity(state.autoSync ? '开启了自动校准' : '暂停了自动校准', state.autoSync ? 'success' : 'neutral');
      toast(state.autoSync ? t('自动校准已开启，每 3 秒检测一次') : t('自动校准已暂停，仍可手动同步'), state.autoSync ? 'success' : '', 2600);
      updateSyncUI();
    });

    dom.manualSync.addEventListener('click', manualSync);
    dom.inlineSync.addEventListener('click', manualSync);

    dom.gesturePlay.addEventListener('click', async () => {
      state.needsGesture = false;
      await tryPlay({ broadcast: false });
    });

    dom.copyCodeTop.addEventListener('click', () => copyWithFeedback(ROOM_ID, t('房间码已复制')));
    dom.copyCode.addEventListener('click', () => copyWithFeedback(ROOM_ID, t('房间码已复制')));
    dom.copyLink.addEventListener('click', () => copyWithFeedback(roomUrl, t('邀请链接已复制')));
    dom.shareButton.addEventListener('click', shareInvite);
    dom.inviteButton.addEventListener('click', openInvite);
    dom.dialogCopyLink.addEventListener('click', () => copyWithFeedback(roomUrl, t('邀请链接已复制')));
    dom.dialogCopyCode.addEventListener('click', () => copyWithFeedback(ROOM_ID, t('房间码已复制')));
    dom.dialogShare.addEventListener('click', shareInvite);
    dom.helpButton.addEventListener('click', () => openModal(dom.helpModal));

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => closeModal($(button.dataset.closeModal)));
    });

    dom.entryForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = dom.entryName.value.trim();
      if (!name) {
        dom.entryError.textContent = t('留一个 TA 熟悉的昵称吧。');
        dom.entryName.focus();
        return;
      }
      state.selfName = name;
      nameStorage.set(name);
      dom.entryError.textContent = '';
      closeModal(dom.entryOverlay);
      connect();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (!dom.inviteModal.classList.contains('is-hidden')) closeModal(dom.inviteModal);
        else if (!dom.helpModal.classList.contains('is-hidden')) closeModal(dom.helpModal);
        else if (!dom.sourceModal.classList.contains('is-hidden')) closeModal(dom.sourceModal);
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      if (modalList().some((modal) => modal && !modal.classList.contains('is-hidden'))) return;
      if (!state.hasVideo) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-5);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(5);
      } else if (event.key.toLowerCase() === 'm') {
        dom.player.muted = !dom.player.muted;
        updateVolumeIcon();
      } else if (event.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.connected) {
        sendMessage({ type: 'heartbeat', position: mediaCurrentTime(), playing: !mediaPaused(), sentAt: Date.now() });
        revealControls();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (state.socket) {
        try { state.socket.close(1000, 'page closed'); } catch { /* ignore */ }
      }
    });

    dom.player.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(dom.player.duration)) state.fileDuration = dom.player.duration;
    });
  }

  function startHeartbeat() {
    window.setInterval(() => {
      if (!state.connected) return;
      sendMessage({
        type: 'heartbeat',
        position: state.hasVideo ? mediaCurrentTime() : 0,
        playing: state.hasVideo ? !mediaPaused() : false,
        sentAt: Date.now(),
      });
    }, HEARTBEAT_MS);
  }

  function initRoomIdentity() {
    dom.roomCodeLabel.textContent = ROOM_ID;
    dom.footerRoomCode.textContent = ROOM_ID;
    dom.inviteCode.textContent = ROOM_ID;
    dom.dialogRoomCode.textContent = ROOM_ID;
    dom.entryRoomCode.textContent = ROOM_ID;
    dom.inviteLinkInput.value = roomUrl;
    dom.roomDate.textContent = formatRoomDate();
    document.title = t('放映室 {code} · 同频', { code: ROOM_ID });

    state.autoSync = readAutoSync();
    dom.autoSyncToggle.checked = state.autoSync;
    const storedVolume = readVolume();
    dom.player.volume = storedVolume;
    dom.volume.value = String(storedVolume);
    updateVolumeIcon();
    updateSyncUI();
  }

  function renderTranslations() {
    dom.roomDate.textContent = formatRoomDate();
    document.title = t('放映室 {code} · 同频', { code: ROOM_ID });
    if (state.hasVideo) setVideoInfo();
    else resetVideoInfo();
    renderActivity();
    renderParticipants();
    updateVolumeIcon();
    updatePlaybackUI();
    updateSyncUI();
    dom.manualSyncSub.textContent = state.lastSyncAt
      ? t('已对齐到 {time}', { time: formatTime(projectState()) })
      : t('让两个人回到同一秒');
  }

  function init() {
    initRoomIdentity();
    wireEvents();
    resetVideoInfo();
    renderActivity();
    state.selfName = nameStorage.getSession();
    dom.entryName.value = state.selfName || nameStorage.getLocal();
    startHeartbeat();

    if (window.I18N) window.I18N.onChange(renderTranslations);

    if (state.selfName) {
      dom.entryOverlay.classList.add('is-hidden');
      connect();
    } else {
      openModal(dom.entryOverlay);
    }
  }

  init();
})();
