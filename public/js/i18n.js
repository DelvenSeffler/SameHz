'use strict';

/**
 * 同频 · SameHz — 中英文双语运行时
 *
 * 设计要点：
 *  - 字典以「中文原文」为键，英文为目标。中文模式下 t() 原样返回，零风险。
 *  - 静态标记（HTML）通过 apply() 翻译文本节点与占位符属性，切换语言时可精确还原。
 *  - 动态文案（JS）统一走 t('中文模板', { 变量 })，切换语言后由各页面重新渲染。
 */
(() => {
  const STORAGE_KEY = 'tp:lang';
  const SUPPORTED = ['zh', 'en'];

  const EN = {
    /* ---------------- 通用 ---------------- */
    '同频': 'SameHz',
    '同频首页': 'SameHz home',
    '返回同频首页': 'Back to SameHz home',
    '返回首页': 'Back to home',
    '放映室': 'Screening room',
    '复制房间码': 'Copy room code',
    '复制邀请链接': 'Copy invite link',
    '邀请 TA': 'Invite them',
    '使用说明': 'How it works',
    '等待 TA': 'Waiting for them',
    '静音': 'Mute',
    '取消静音': 'Unmute',
    '播放': 'Play',
    '暂停': 'Pause',
    '全屏': 'Fullscreen',
    '音量': 'Volume',
    '播放进度': 'Playback progress',
    '一键同步': 'Sync now',
    '同步中': 'In sync',
    '自动': 'Auto',
    '手动': 'Manual',
    '暂停（校准）': 'Paused',
    '尚未校准': 'Not yet',
    '等待同步': 'Waiting for sync',
    '进度已对齐': 'Progress aligned',
    '已复制': 'Copied',
    '你': 'You',
    '同频 · 私人放映室': 'SameHz · Private screening room',
    '来和我一起看电影吧，房间码 {code}': "Come watch a film with me — room code {code}",
    '放映室 {code} · 同频': 'Room {code} · SameHz',
    '自动校准了 {seconds} 秒偏差': 'Auto-corrected {seconds}s of drift',
    '播放链接': 'Play this link',
    '复制失败，请手动选择复制': 'Copy failed — please copy it manually',
    '邀请链接已复制': 'Invite link copied',
    '房间码已复制': 'Room code copied',

    /* ---------------- 首页 ---------------- */
    '同频 · 隔着山海，一起看同一帧': 'SameHz · The same frame, wherever you are',
    '同频，一间只属于两个人的同步放映室。各自打开本地片源，播放、暂停、进度实时同步，不压缩画质，不上传影片。':
      'SameHz is a private sync cinema for two. Each of you loads the same film — play, pause and progress stay in sync, with no compression and no uploads.',
    '主导航': 'Main navigation',
    '产品特点': 'Highlights',
    '如何放映': 'How it works',
    '同步原理': 'How sync works',
    '开始使用': 'Get started',
    '进入放映室': 'Enter the room',
    '隔着山海，': 'Across any distance,',
    '一起看同一帧。': 'on the very same frame.',
    '一间只属于你们的同步放映室。各自打开设备里的同一部电影，播放、暂停与进度实时同频——高清原片不压缩，影片也永远不会离开你的设备。':
      'A private screening room for just the two of you. Each of you opens the same film on your own device, while play, pause and progress stay in sync — full quality, no compression, and the file never leaves your device.',
    '影片不上传': 'Nothing uploaded',
    '每 3 秒自动校准': 'Resyncs every 3s',
    '原画质播放': 'Original quality',
    'ADMIT TWO · 只此二人': 'ADMIT TWO · JUST YOU TWO',
    '今晚，看点什么？': 'What are we watching tonight?',
    '开一间放映室，或者用房间码赴约。': 'Open a room, or join with a room code.',
    '选择操作': 'Choose an action',
    '创建放映室': 'Create a room',
    '加入房间': 'Join a room',
    '怎么称呼你': 'What should we call you?',
    '例如：小满': 'e.g. Yuki',
    '六位房间码': 'Six-character room code',
    '例如：K7M2Q9': 'e.g. K7M2Q9',
    '创建今晚的放映室': "Create tonight's room",
    '视频只在你和 TA 的设备上打开，不会经过服务器': 'The video only opens on your devices — it never touches the server',
    '进度，总在': 'Always on the',
    '同一秒。': 'same second.',
    '任何一方播放、暂停或拖动进度，另一块屏幕都会跟上。系统每隔 3 秒核对一次进度，悄悄抹平网络造成的错位。':
      'Whoever hits play, pause or scrub, the other screen follows. Every 3 seconds the room compares both timelines and quietly irons out network drift.',
    '看看它是怎么工作的': 'See how it works',
    '你的屏幕': 'Your screen',
    'TA 的屏幕': 'Their screen',
    '本地原片 · 4K': 'Local file · 4K',
    '一次放映，只需要三步': 'Three steps to one screening',
    '不用注册，不用上传，不压缩画质。两个人都准备好同一部片，就可以开场。':
      'No sign-up, no upload, no compression. Once you both have the same film, the show can start.',
    '开一间放映室': 'Open a screening room',
    '取一个昵称，一键创建。把邀请链接或六位房间码发给 TA。':
      'Pick a nickname and create a room in one tap, then send the link or six-character code to your other half.',
    '各自放入同一部片': 'Load the same film',
    '从手机或电脑选择本地视频。影片留在设备里，只同步播放状态。':
      'Pick a local video, or paste a direct video link. The film stays on your device — only playback state is synced.',
    '一起按下播放': 'Press play together',
    '任何一方操作都会实时同步；每 3 秒自动校准，也能一键对齐。':
      'Either of you can control playback in real time. Auto-correction runs every 3 seconds, and one tap realigns you both.',
    '距离会拉开时间，': 'Distance stretches time,',
    '但不会拉开我们。': 'but it never stretches us.',
    '— 同频放映室': '— SameHz Cinema',
    '原片直读': 'Straight from the file',
    '不转码、不压缩。你看到什么画质，TA 就看到什么画质，只取决于你们各自的原片。':
      'No transcoding, no compression. What you see is exactly what they see — limited only by the file you both loaded.',
    '秒级同频': 'Sync to the second',
    '播放状态通过轻量连接传输，操作即刻抵达；定时心跳检测，自动修正累积误差。':
      'Playback state travels over a lightweight connection, so actions land instantly; timed heartbeats correct any accumulated drift.',
    '片源核对': 'Source check',
    '自动比对文件指纹与时长，确保你们看的确实是同一部片，不会各看各的。':
      'Fingerprints and durations are compared automatically, so you can be sure it is the same film on both screens.',
    '两个人的房间': 'A room for two',
    '六个字符的私人房间码，最多两席。没有观众，没有弹幕，只有你们和电影。':
      'A six-character private code, only ever two seats. No audience, no comments scrolling past — just you two and the film.',
    '今晚，和 TA 看同一部电影。': 'Watch the same film tonight.',
    '只同步进度，不搬运你的电影。': 'We sync the progress, never your film.',

    /* ---------------- 首页 · 动态 ---------------- */
    '正在点亮放映室…': 'Lighting up the room…',
    '正在寻找放映室…': 'Finding the room…',
    '先告诉 TA，该怎么称呼你。': 'Let them know what to call you.',
    '房间码是 6 位字符，再检查一下邀请信息。': 'The room code is 6 characters — check the invite again.',
    '放映室没有创建成功，请稍后再试。': 'The room could not be created. Please try again.',
    '没有找到这间放映室，房间码可能过期了。': 'No such room — the code may have expired.',
    '暂时无法加入，请稍后再试。': 'Cannot join right now. Please try again.',
    '放映室已经满员了，只容得下两个人。': 'This room is full — it only holds two.',
    '网络似乎走神了，请再试一次。': 'The network wandered off. Please try again.',

    /* ---------------- 放映室 · 静态 ---------------- */
    '放映室 · 同频': 'Screening room · SameHz',
    '同频私人同步放映室。两个人，同一部电影，同一秒。':
      'SameHz private sync cinema. Two people, one film, one second.',
    '同步放映区': 'Screening stage',
    'YOUR LOCAL COPY': 'YOUR COPY OF THE FILM',
    '把今晚的电影': "Load tonight's",
    '放进来。': 'film here.',
    '选择你设备里的视频文件，或者粘贴一个视频链接。它不会被上传，只在这里播放；TA 需要在自己那边打开同一部片。':
      'Pick a video from your device, or paste a direct video link. Nothing is uploaded — your partner loads the same source on their side.',
    '选择本地视频': 'Choose a local video',
    '粘贴视频链接': 'Paste a video link',
    '也可以把文件拖到这里': 'or drop a file here',
    '影片只留在你的设备 · 支持 MP4 / WebM / MOV': 'Stays on your device · MP4 / WebM / MOV',
    '正在读取片源…': 'Reading the source…',
    '只在本地处理，不会上传': 'Processed locally, never uploaded',
    '等待片源': 'Waiting for source',
    '更换片源': 'Change source',
    '继续同步播放': 'Continue playback',
    '浏览器需要一次点击才能播放声音': 'Browsers need one tap before sound can start',
    '松手，放进今晚的放映室': "Drop it into tonight's room",
    '文件只在本机读取': 'Read locally, never uploaded',
    '尚未选择片源': 'No source yet',
    '本地播放': 'Local playback',
    '今晚的放映，还差一部电影': "Tonight's screening still needs a film",
    '选择影片后，会和 TA 自动核对是否为同一片源。':
      'Once you load a film, we check that you both have the same source.',
    '等待双方片源': 'Waiting for both sources',
    '各自打开同一部电影': 'Each of you opens the same film',
    '只属于你们的房间': 'A room for just you two',
    '分享邀请': 'Share invite',
    '把链接发给 TA，输入昵称就能坐到你身边。':
      'Send the link — they enter a nickname and take the seat beside you.',
    '同场的人': 'In the room',
    '同步校准': 'Sync calibration',
    '当前误差': 'Current offset',
    '检测频率': 'Check interval',
    '每 3 秒': 'Every 3s',
    '上次校准': 'Last check',
    '自动校准': 'Auto-correct',
    '检测到偏差时自动对齐': 'Realign automatically when drift is detected',
    '一键同步进度': 'Sync progress',
    '让两个人回到同一秒': 'Bring both of you back to the same second',
    '以放映室记录的基准时间为准，双方会同时对齐。':
      "Both sides jump to the room's reference time at once.",
    '放映动态': 'Activity',
    '等一束光，等一个人。': 'Waiting for the light, waiting for someone.',
    '同频 · PRIVATE CINEMA': 'SameHz · PRIVATE CINEMA',
    '只同步进度，不搬运电影': 'We sync progress, never your film',
    '双人专场': 'A SCREENING FOR TWO',
    '今晚，一起看场电影。': "Let's watch a film tonight.",
    '你收到了一张私人放映邀请。取一个 TA 熟悉的昵称，坐到同一块银幕前。':
      "You've been invited to a private screening. Pick a name they'll recognise and take your seat.",
    '你的昵称': 'Your name',
    '坐进放映室': 'Take your seat',
    '无需注册，影片不会被上传': 'No sign-up · your film is never uploaded',
    '邀请 TA，坐到同一块银幕前。': 'Invite them to the same screen.',
    '把链接或房间码发给 TA。打开后输入昵称，就能一起开场。':
      "Send the link or the room code. They open it, enter a nickname, and you're both in.",
    '房间码': 'Room code',
    '邀请链接': 'Invite link',
    '复制': 'Copy',
    '这间放映室只有两个座位，先到先得。': 'Only two seats in this room — first come, first served.',
    '两个人，同一部电影，同一秒。': 'Two people, one film, one second.',
    '各自载入同一部片': 'Load the same film on both sides',
    '你们可以在各自设备上打开同一个本地文件，或者粘贴同一个视频链接。影片不会上传或转码。':
      'You can each open the same local file, or paste the same video link. Nothing is uploaded or transcoded.',
    '片源自动核对': 'Source check',
    '同频会比对文件指纹与时长。确认一致后，同步会更可靠。':
      'SameHz compares fingerprint and duration. Once they match, syncing is far more reliable.',
    '任意一方操作，双方同步': 'One controls, both follow',
    '播放、暂停、拖动进度都会实时同步；每 3 秒还会自动检测并校准偏差。':
      'Play, pause and scrubbing all sync in real time, and drift is detected and corrected every 3 seconds.',
    '如果画面不同步，点击「一键同步进度」，两边会同时对齐到基准时间。':
      'If the two screens drift apart, tap "Sync progress" and both jump to the reference time together.',
    '知道了': 'Got it',
    '这束光暂时灭了。': 'The light just went out.',
    '放映室可能已经结束，或者链接不完整。': 'This room may have ended, or the link is incomplete.',
    '关闭': 'Close',

    /* ---------------- 放映室 · 动态 ---------------- */
    '连接中': 'Connecting',
    '正在重连': 'Reconnecting',
    '已连接': 'Connected',
    '连接中断': 'Disconnected',
    '已离开': 'Left the room',
    '在线片源已就绪': 'Online source ready',
    '本地片源已就绪': 'Local file ready',
    '在线片源': 'Online source',
    'TA 在线': 'They are here',
    'TA 离线': 'They are away',
    '正在连接…': 'Connecting…',
    '暂时离线': 'Away',
    '正在选择片源…': 'Choosing a source…',
    '离线': 'Away',
    '未选片': 'No source',
    '已就位': 'Ready',
    '匹配': 'Matched',
    '不同': 'Different',
    '就位': 'Ready',
    '等待另一个人入座': 'Waiting for the other seat',
    '把邀请链接发给 TA': 'Send them the invite link',
    '空座': 'Empty',
    '等待你的片源': 'Waiting for your source',
    '从本地选择一部电影': 'Choose a film from your device',
    '等待 TA 的片源': 'Waiting for their source',
    '等待 TA 入座': 'Waiting for them to join',
    '片源匹配成功': 'Sources match',
    '片源时长不一致': 'Lengths do not match',
    '片源不一致': 'Sources differ',
    '你们打开的可能不是同一个文件': 'You may have opened different files',
    '同一部电影': 'Same film',
    'TA 暂时离线': 'They stepped away',
    '等待点击播放': 'Waiting for a tap to play',
    '缓冲中': 'Buffering',
    '同步播放中': 'Playing in sync',
    '已暂停 · 同步中': 'Paused · in sync',
    '片源不同': 'Different sources',
    '时长未知': 'Unknown length',
    '正在核对片源指纹…': 'Checking the source fingerprint…',
    '正在准备播放器…': 'Preparing the player…',
    '片源已就绪，只在你本机播放': 'Source ready — it plays only on your device',
    '无法读取这个视频文件': 'Could not read this video file',
    '请选择视频文件，例如 MP4、WebM 或 MOV': 'Please choose a video file, e.g. MP4, WebM or MOV',
    '这个文件是空的，换一个视频试试': 'This file is empty — try another video',
    '这个视频格式无法在当前浏览器中播放': 'This browser cannot play that video format',
    '读取视频信息超时，请换一个文件试试': 'Timed out reading the video — try another file',
    '无法识别视频时长，请尝试 MP4 或常规 WebM 文件': 'Could not read the duration — try an MP4 or a standard WebM file',
    '无法读取视频时长': 'Could not read the video duration',
    '当前浏览器不支持全屏，试试用浏览器菜单进入全屏': 'This browser blocked fullscreen — use the browser menu instead',
    '连接中断了，正在尝试重连': 'Connection lost — trying to reconnect',
    '先选择你的本地片源，才能同步进度': 'Load your source first, then you can sync',
    '双方片源不一致，时间可以对齐，但画面可能不同': 'Sources differ — time can align, but the picture may not',
    '请求没有发出去，请检查网络连接': 'Request not sent — check your connection',
    '视频播放出错了，尝试换一个格式（推荐 MP4 / H.264）': 'Playback failed — try another format (MP4 / H.264 works best)',
    '自动校准已开启，每 3 秒检测一次': 'Auto-correct on — checked every 3 seconds',
    '自动校准已暂停，仍可手动同步': 'Auto-correct paused — manual sync still works',
    '开启了自动校准': 'Auto-correct enabled',
    '暂停了自动校准': 'Auto-correct paused',
    '留一个 TA 熟悉的昵称吧。': 'Leave a name they will recognise.',
    '双方片源核对一致': 'Both sources verified',
    '检测到片源不一致': 'Sources do not match',
    '片源匹配成功，可以一起开始了': 'Sources match — you can start together',
    '你们选择的片源不一致，建议换成同一个文件': 'Your sources differ — use the same file or link',
    '已经重新连上放映室': 'Reconnected to the room',
    '重新连接了放映室': 'Reconnected to the room',
    '片源不一致，自动校准会暂停；请双方换成同一个文件。':
      'Sources differ, so auto-correct is paused. Please use the same file or link.',
    '这间放映室已经满员了。': 'This room is full.',
    '两个座位都已经有人了。如果这是你的房间，请刷新原窗口，或回到首页创建新的放映室。':
      'Both seats are taken. If this is your room, refresh the original window or create a new one from the home page.',
    '没有找到这间放映室。': 'Room not found.',
    '房间码可能已经过期，或者链接不完整。回到首页，重新开一间只属于你们的放映室吧。':
      'The code may have expired, or the link is incomplete. Head back home and open a new room.',
    '这个身份已在另一个窗口连接。': 'This identity is already connected in another window.',
    '同一间放映室不能打开两个相同的身份。请关闭其他窗口，再重新刷新这一页。':
      'A room cannot hold the same identity twice. Close the other window, then refresh this page.',
    '自动校准了播放状态': 'Auto-corrected playback state',

    /* ---------------- 在线链接 ---------------- */
    '载入在线视频': 'Load an online video',
    '粘贴一个可以直接播放的视频链接，比如 MP4、WebM 或 HLS（m3u8）。两个人粘贴同一个链接，就能同步观看。':
      'Paste a link that plays directly, such as MP4, WebM or HLS (m3u8). Paste the same link on both sides and you are in sync.',
    '粘贴视频网站链接，或直接粘贴视频文件链接。支持 YouTube、Bilibili、Vimeo 以及 MP4 / WebM / HLS 直链。':
      'Paste a video platform link, or a direct video file link. YouTube, Bilibili, Vimeo and MP4 / WebM / HLS are supported.',
    '视频链接': 'Video link',
    '例如：https://example.com/movie.mp4': 'e.g. https://example.com/movie.mp4',
    '例如：https://www.youtube.com/watch?v=…': 'e.g. https://www.youtube.com/watch?v=…',
    '支持 YouTube · Bilibili · Vimeo · 视频直链': 'YouTube · Bilibili · Vimeo · direct video links',
    'YouTube · 支持完整同步': 'YouTube · full sync',
    'Bilibili · 仅嵌入，用「一起开始」对齐': 'Bilibili · embed only, align with “Start together”',
    'Vimeo · 仅嵌入，用「一起开始」对齐': 'Vimeo · embed only, align with “Start together”',
    '视频直链 · 支持完整同步': 'Direct link · full sync',
    '网页视频 · 服务器尝试解析直链': 'Web page · server will try to find a stream',
    '正在解析网页里的视频…': 'Looking for a video stream in that page…',
    '没能解析这个网页里的视频，可以换一个来源或使用直链。':
      'No video stream found in that page. Try another source or a direct link.',
    '该地址可能需要 Referer 校验，直接播放可能失败': 'This URL may require a Referer header — playback could fail',
    '没能解析这个网页里的视频': 'Could not parse a video from that page',
    '解析得太频繁了，请稍后再试': 'Too many lookups — please try again shortly',
    'YouTube 支持完整同步；Bilibili 等平台只能嵌入播放，用「一起开始」倒计时对齐。':
      'YouTube syncs fully. Bilibili and similar platforms can only be embedded — use the “Start together” countdown to line up.',
    '支持 MP4 / WebM / HLS 直链；网页地址（如 YouTube）暂不支持。':
      'Direct MP4 / WebM / HLS links only — page URLs such as YouTube are not supported.',
    '从设备选择文件': 'Choose a file from this device',
    '请输入视频链接': 'Please enter a video link',
    '链接格式不对，请粘贴 http 或 https 开头的地址': 'That link looks wrong — it should start with http or https',
    '这是一个网页地址，不是视频文件。请粘贴 .mp4 / .webm / .m3u8 直链。':
      'That is a web page, not a video file. Paste a direct .mp4 / .webm / .m3u8 link.',
    '没有识别出 YouTube 视频 ID，请粘贴完整的视频链接。': 'No YouTube video ID found — paste the full video link.',
    'b23.tv 短链无法直接识别，请先在浏览器打开，再复制完整的 Bilibili 视频链接。':
      'b23.tv short links cannot be parsed. Open it in a browser first, then copy the full Bilibili video link.',
    '没有识别出 Bilibili 视频号，请粘贴含 BV 号或 av 号的视频链接。':
      'No Bilibili video ID found — paste a link containing the BV or av number.',
    '没有识别出 Vimeo 视频 ID，请粘贴完整的视频链接。': 'No Vimeo video ID found — paste the full video link.',
    '暂不支持这个网站：它使用 DRM 加密，浏览器不允许第三方播放或解析。':
      'That site is not supported: it uses DRM encryption, which browsers do not allow third parties to play or parse.',
    '暂不支持这个网站。可以粘贴 YouTube、Bilibili、Vimeo 视频链接，或 MP4 / WebM / M3U8 直链。':
      'That site is not supported. Paste a YouTube, Bilibili or Vimeo link, or a direct MP4 / WebM / M3U8 link.',
    '正在连接 YouTube…': 'Connecting to YouTube…',
    'YouTube 片源已载入': 'YouTube source loaded',
    'YouTube 视频': 'YouTube video',    '无法载入这个 YouTube 视频：可能是网络限制、地区限制或被禁止嵌入。':
      'Could not load this YouTube video — network or region restrictions, or embedding is disabled.',
    '{platform} 片源已载入。该平台不支持自动同步，请用「一起开始」倒计时对齐。':
      '{platform} source loaded. This platform cannot be synced automatically — use the “Start together” countdown.',
    '该平台不支持自动校准': 'This platform cannot auto-sync',
    '一起开始': 'Start together',
    '这个平台不支持跳转，请用「一起开始」对齐进度': 'This platform does not allow seeking — use “Start together” to line up.',
    '同时播放': 'Playing together',
    '现在一起按下播放': 'Press play together now',
    '一起按下播放': 'Press play together',
    '发起了「一起开始」倒计时': 'started a “Start together” countdown',
    '{actor} 发起了「一起开始」倒计时': '{actor} started a “Start together” countdown',
    '先载入片源，才能一起开始': 'Load a source first, then you can start together',
    '正在连接在线片源…': 'Connecting to the online source…',
    '在线片源已载入': 'Online source loaded',
    '无法载入这个链接：可能是防盗链、跨域限制或格式不支持。':
      'Could not load that link — it may be hotlink-protected, cross-origin blocked, or unsupported.',
    'TA 正在使用在线片源，已为你同步载入': 'They are using an online source — loaded for you',
    '载入 TA 的在线片源': "Load their online source",
    '在线播放': 'Online playback',

    /* ---------------- 模板（带变量） ---------------- */
    '{actor}播放了影片': '{actor} started the film',
    '{actor}暂停了影片': '{actor} paused the film',
    '{actor}调整了进度': '{actor} changed the position',
    '{actor}看完了影片': '{actor} finished the film',
    '{actor}更新了播放状态': '{actor} updated playback',
    '{actor} 按下了播放': '{actor} pressed play',
    '{actor} 暂停了影片': '{actor} paused the film',
    '{actor} 发起了同步校准': '{actor} started a resync',
    'TA 把进度对齐了': 'They realigned the progress',
    '{actor} 放入了《{title}》': '{actor} loaded “{title}”',
    '{actor} 放入了片源': '{actor} loaded a source',
    '{name} 连接了放映室': '{name} joined the room',
    '{name} 暂时离线了': '{name} stepped away',
    '{actor} 自动校准了 {seconds} 秒偏差': 'Auto-corrected {seconds}s of drift',
    '你载入了《{title}》': 'You loaded “{title}”',
    '你载入了在线片源《{title}》': 'You loaded the online source “{title}”',
    'TA 载入了《{title}》': '{name} loaded “{title}”',
    '已对齐到 {time}': 'Aligned to {time}',
    '误差 {value}s': 'offset {value}s',
    '偏差 {value}s': 'drift {value}s',
    '相差 {value} 秒，建议重新选择': '{value}s apart — please pick the same source',
    '同一部电影 · {duration}': 'Same film · {duration}',
    '指纹 {fingerprint} · {duration} · 仅在本机读取': 'Fingerprint {fingerprint} · {duration} · read locally',
    '在线链接 · {duration} · 直接在浏览器播放': 'Online link · {duration} · streamed in the browser',
    '{duration} · {fingerprint}': '{duration} · {fingerprint}',
    '{hours} 小时 {minutes} 分': '{hours}h {minutes}m',
    '{minutes} 分钟': '{minutes} min',
    '{seconds} 秒': '{seconds}s',
    '时长未知': 'Unknown length',
  };

  const WEEKDAYS = {
    zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };
  const MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };

  const ATTRS = ['placeholder', 'title', 'aria-label', 'content', 'alt'];
  const SKIP_SELECTOR = '[data-i18n-skip]';

  const normalize = (value) => String(value).replace(/\s+/g, ' ').trim();

  const EN_NORMALIZED = new Map();
  const EN_COMPACT = new Map();
  for (const [zh, en] of Object.entries(EN)) {
    EN_NORMALIZED.set(normalize(zh), en);
    const compact = normalize(zh).replace(/\s+/g, '');
    if (!EN_COMPACT.has(compact)) EN_COMPACT.set(compact, en);
  }

  /** 查找英文译文：先精确匹配，再忽略空白匹配（应对 HTML 换行造成的断句）。 */
  function lookup(key) {
    const normalized = normalize(key);
    const direct = EN_NORMALIZED.get(normalized);
    if (direct !== undefined) return direct;
    return EN_COMPACT.get(normalized.replace(/\s+/g, ''));
  }

  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();

  function readLang() {
    try {
      const fromQuery = new URLSearchParams(location.search).get('lang');
      if (fromQuery && SUPPORTED.includes(fromQuery)) {
        localStorage.setItem(STORAGE_KEY, fromQuery);
        return fromQuery;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch {
      // Storage may be unavailable.
    }
    const nav = String(navigator.language || 'zh').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  let lang = readLang();
  const listeners = new Set();

  function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  /** 翻译一段文案。中文模式原样返回模板。 */
  function t(template, params) {
    const key = String(template == null ? '' : template);
    if (lang !== 'en') return interpolate(key, params);
    const translated = lookup(key);
    return interpolate(translated === undefined ? key : translated, params);
  }

  function isEnglish() {
    return lang === 'en';
  }

  function locale() {
    return lang === 'en' ? 'en-US' : 'zh-CN';
  }

  function weekday(date) {
    return WEEKDAYS[lang === 'en' ? 'en' : 'zh'][date.getDay()];
  }

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    if (lang === 'en') return `${MONTHS.en[date.getMonth()]} ${date.getDate()} · ${weekday(date)}`;
    return `${String(date.getMonth() + 1).padStart(2, '0')} 月 ${day} 日 · ${weekday(date)}`;
  }

  function withSurrounding(original) {
    const leading = (original.match(/^\s*/) || [''])[0];
    const trailing = (original.match(/\s*$/) || [''])[0];
    return { leading, trailing };
  }

  function applyToNode(node) {
    const current = node.nodeValue;
    const stored = textOriginals.get(node);
    const storedEnglish = stored === undefined ? undefined : lookup(stored);
    const currentIsStoredEnglish = storedEnglish !== undefined && normalize(current) === normalize(storedEnglish);

    if (lang === 'en') {
      const direct = lookup(current);
      if (direct !== undefined) {
        // 当前仍是中文：记住原文后翻译（JS 更新过的动态文案也会被覆盖为最新原文）
        textOriginals.set(node, current);
        const { leading, trailing } = withSurrounding(current);
        node.nodeValue = `${leading}${direct}${trailing}`;
        return;
      }
      if (currentIsStoredEnglish) {
        const { leading, trailing } = withSurrounding(current);
        node.nodeValue = `${leading}${storedEnglish}${trailing}`;
      }
      return;
    }

    if (currentIsStoredEnglish) {
      node.nodeValue = stored;
      return;
    }
    // 内容已被 JS 改写成别的语言：丢弃旧记忆，避免还原成过期文案
    textOriginals.delete(node);
  }

  function applyToAttributes(element) {
    let stored = attrOriginals.get(element);
    if (!stored) {
      stored = {};
      attrOriginals.set(element, stored);
    }
    for (const attr of ATTRS) {
      if (!element.hasAttribute(attr)) continue;
      const current = element.getAttribute(attr);
      const original = stored[attr];
      const originalEnglish = original === undefined ? undefined : lookup(original);
      const currentIsOriginalEnglish = originalEnglish !== undefined && normalize(current) === normalize(originalEnglish);

      if (lang === 'en') {
        const direct = lookup(current);
        if (direct !== undefined) {
          stored[attr] = current;
          element.setAttribute(attr, direct);
          continue;
        }
        if (currentIsOriginalEnglish) element.setAttribute(attr, originalEnglish);
        continue;
      }

      if (currentIsOriginalEnglish) element.setAttribute(attr, original);
      else delete stored[attr];
    }
  }

  /** 翻译整棵静态 DOM。动态区域用 data-i18n-skip 标记后会被跳过。 */
  function apply(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (node.closest && node.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
        if (!normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) applyToNode(node);
      else applyToAttributes(node);
    }

    if (root === document.body) {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
      const titleNode = document.querySelector('title');
      if (titleNode) applyToNode(titleNode.firstChild || titleNode.appendChild(document.createTextNode('')));
    }
  }

  function syncToggleButtons() {
    document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      button.textContent = lang === 'en' ? '中文' : 'EN';
      button.setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
      button.setAttribute('title', lang === 'en' ? '切换到中文' : 'Switch to English');
    });
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next) || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    apply(document.body);
    syncToggleButtons();
    listeners.forEach((listener) => {
      try { listener(lang); } catch (error) { console.error('[i18n]', error); }
    });
  }

  function toggleLang() {
    setLang(lang === 'en' ? 'zh' : 'en');
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function wireToggles(root = document) {
    root.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      if (button.dataset.langBound === '1') return;
      button.dataset.langBound = '1';
      button.addEventListener('click', toggleLang);
    });
    syncToggleButtons();
  }

  window.I18N = {
    t,
    apply,
    setLang,
    toggleLang,
    onChange,
    getLang: () => lang,
    isEnglish,
    locale,
    formatDate,
    weekday,
    wireToggles,
  };
  window.t = t;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      apply(document.body);
      wireToggles();
    }, { once: true });
  } else {
    apply(document.body);
    wireToggles();
  }
})();
