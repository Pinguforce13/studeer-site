/* ═══════════════════════════════════════════════════════════
   STUDEER APP — app.js
   ═══════════════════════════════════════════════════════════ */

let currentUser = null;
let imageBase64 = null;
let selectedMode = 'uitgebreid';
let toetsType = 'zonder';
let toetsMinutes = 15;
let lastResult = null;

let quizData = [];
let quizIndex = 0;
let quizAnswered = false;

let flashcards = [];
let fcIndex = 0;
let fcFlipped = false;

let toetsData = [];
let toetsIndex = 0;
let toetsUserAnswers = [];
let toetsTimerInterval = null;
let toetsSecondsLeft = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  setupUpload();
  checkApiKey();
});

function loadUser() {
  const saved = localStorage.getItem('studeer_user');
  if (saved) { currentUser = JSON.parse(saved); showApp(); }
}

function checkApiKey() {
  const key = localStorage.getItem('studeer_api_key');
  const badge = document.getElementById('apiStatus');
  if (key) { badge.textContent = '✅ API'; badge.style.color = '#10b981'; }
  else { badge.textContent = '⚙️ API sleutel nodig'; badge.style.color = '#f59e0b'; }
}

// AUTH
function getUsers() { return JSON.parse(localStorage.getItem('studeer_users') || '{}'); }
function saveUsers(u) { localStorage.setItem('studeer_users', JSON.stringify(u)); }

function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  if (!name || !email || !pass) return showError('Vul alle velden in.');
  if (pass.length < 6) return showError('Wachtwoord moet minstens 6 tekens zijn.');
  const users = getUsers();
  if (users[email]) return showError('Er bestaat al een account met dit e-mailadres.');
  users[email] = { name, email, password: btoa(pass) };
  saveUsers(users);
  currentUser = { name, email };
  localStorage.setItem('studeer_user', JSON.stringify(currentUser));
  showApp();
}

function login() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) return showError('Vul je e-mailadres en wachtwoord in.');
  const users = getUsers();
  const user = users[email];
  if (!user || user.password !== btoa(pass)) return showError('Onjuist e-mailadres of wachtwoord.');
  currentUser = { name: user.name, email };
  localStorage.setItem('studeer_user', JSON.stringify(currentUser));
  showApp();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('studeer_user');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('authScreen').classList.add('active');
  toggleSidebar(false);
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('active');
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarEmail').textContent = currentUser.email;
  document.getElementById('sidebarAvatar').textContent = currentUser.name[0].toUpperCase();
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.classList.remove('hidden');
}
function showLogin() {
  document.getElementById('loginCard').classList.remove('hidden');
  document.getElementById('registerCard').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
}
function showRegister() {
  document.getElementById('loginCard').classList.add('hidden');
  document.getElementById('registerCard').classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
}

// NAVIGATION
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  const titles = { study: 'Studeren', history: 'Mijn sessies' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  if (page === 'history') loadHistory();
  toggleSidebar(false);
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const open = force !== undefined ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('hidden', !open);
}

// UPLOAD
function setupUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    imageBase64 = ev.target.result.split(',')[1];
    const preview = document.getElementById('previewImg');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('changePhoto').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function resetPhoto() {
  imageBase64 = null;
  document.getElementById('previewImg').classList.add('hidden');
  document.getElementById('uploadZone').style.display = '';
  document.getElementById('changePhoto').classList.add('hidden');
  document.getElementById('fileInput').value = '';
}

// MODE SELECTION
function selectMode(btn) {
  document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedMode = btn.dataset.mode;
  document.getElementById('toetsOptions').classList.toggle('hidden', selectedMode !== 'toets');
}

function selectToetsType(btn) {
  document.querySelectorAll('.toets-type').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  toetsType = btn.dataset.type;
  document.getElementById('timePicker').classList.toggle('hidden', toetsType !== 'met');
}

function updateTime(val) {
  toetsMinutes = parseInt(val);
  document.getElementById('timeLabel').textContent = val + ' min';
}

// API KEY
function showApiModal() {
  document.getElementById('apiKeyInput').value = localStorage.getItem('studeer_api_key') || '';
  document.getElementById('apiModal').classList.remove('hidden');
}
function closeApiModal() { document.getElementById('apiModal').classList.add('hidden'); }
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) localStorage.setItem('studeer_api_key', key);
  closeApiModal(); checkApiKey();
}

// AI CALL
async function callClaude(prompt, imageB64 = null) {
  const apiKey = localStorage.getItem('studeer_api_key');
  if (!apiKey) { showApiModal(); throw new Error('Geen API sleutel'); }
  const content = [];
  if (imageB64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } });
  content.push({ type: 'text', text: prompt });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content }] })
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'API fout'); }
  const data = await res.json();
  return data.content?.map(i => i.text || '').join('') || '';
}

// ANALYZE
async function analyze() {
  if (!imageBase64) { alert('Upload eerst een foto van je leerstof!'); return; }
  const subject = document.getElementById('subjectInput').value.trim();
  const vakTekst = subject ? ` voor het vak ${subject}` : '';
  const resultArea = document.getElementById('resultArea');
  const resultContent = document.getElementById('resultContent');
  const resultTitle = document.getElementById('resultTitle');
  resultArea.classList.remove('hidden');
  resultContent.innerHTML = '<div class="loading-box"><div class="spinner"></div> Bezig met analyseren...</div>';
  const modeLabels = { uitgebreid: '📚 Uitgebreide uitleg', efficient: '⚡ Efficiënte uitleg', flashcards: '🃏 Flashcards', quiz: '✏️ Quiz', toets: '📝 Toets', videos: '▶️ YouTube video\'s' };
  resultTitle.textContent = modeLabels[selectedMode];
  const prompts = {
    uitgebreid: `Je bent een gedetailleerde studeer-assistent. De student stuurt een foto van leerstof${vakTekst}. Lees alles zorgvuldig en leg HET VOLLEDIGE MATERIAAL heel uitgebreid en stap voor stap uit. Gebruik titels, opsommingen en voorbeelden. Schrijf in het Nederlands.`,
    efficient: `Je bent een efficiënte studeer-assistent. De student stuurt een foto van leerstof${vakTekst}. Geef ALLEEN de essentie: de kernbegrippen, definities en feiten die leerkrachten typisch op een toets vragen. Gebruik bullet points. Schrijf in het Nederlands.`,
    flashcards: `Je bent een studeer-assistent. De student stuurt een foto van leerstof${vakTekst}. Maak 10 tot 15 flashcards. Geef ALLEEN JSON zonder uitleg:\n[{"front":"term of vraag","back":"vertaling of antwoord"}]`,
    quiz: `Je bent een studeer-assistent. De student stuurt een foto van leerstof${vakTekst}. Maak 8 meerkeuzevragen. Geef ALLEEN JSON:\n[{"question":"vraag?","options":["A) optie","B) optie","C) optie","D) optie"],"answer":"A","explanation":"uitleg"}]`,
    toets: `Je bent een studeer-assistent. De student stuurt een foto van leerstof${vakTekst}. Maak 8 toetsvragen (mix mc en open). Geef ALLEEN JSON:\n[{"question":"vraag?","type":"mc","options":["A) optie","B) optie","C) optie","D) optie"],"answer":"A"},{"question":"open vraag?","type":"open","answer":"modelantwoord"}]`,
    videos: `Je bent een studeer-assistent. De student stuurt een foto van leerstof${vakTekst}.\nSAMENVATTING: [2-3 zinnen]\nZOEKTERMEN:\n- [NL term 1]\n- [EN term 1]\n- [NL term 2]\n- [EN term 2]\n- [NL term 3]\n- [EN term 3]`
  };
  try {
    const text = await callClaude(prompts[selectedMode], imageBase64);
    if (selectedMode === 'flashcards') renderFlashcardResult(text);
    else if (selectedMode === 'quiz') renderQuizResult(text);
    else if (selectedMode === 'toets') renderToetsResult(text);
    else if (selectedMode === 'videos') renderVideoResult(text);
    else resultContent.innerHTML = `<div class="result-text">${escHtml(text)}</div>`;
    lastResult = { text, mode: selectedMode, subject, imageBase64 };
  } catch (e) {
    resultContent.innerHTML = `<div class="result-text" style="color:var(--red)">Fout: ${e.message}</div>`;
  }
}

// RENDER RESULTS
function renderVideoResult(text) {
  const el = document.getElementById('resultContent');
  const summaryMatch = text.match(/SAMENVATTING:\s*([\s\S]*?)(?=ZOEKTERMEN:|$)/i);
  const termsMatch = text.match(/ZOEKTERMEN:\s*([\s\S]*)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : text;
  const terms = (termsMatch ? termsMatch[1].trim() : '').split('\n').map(t => t.replace(/^[-*•\d.]\s*/,'').trim()).filter(Boolean);
  let html = `<div class="result-text" style="margin-bottom:1rem">${escHtml(summary)}</div>`;
  terms.forEach((term, i) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(term);
    html += `<div class="video-item"><div class="video-num">${i+1}</div><div><div class="video-term">${escHtml(term)}</div><a class="video-link" href="${url}" target="_blank">Zoek op YouTube →</a></div></div>`;
  });
  el.innerHTML = html;
}

function renderFlashcardResult(text) {
  const el = document.getElementById('resultContent');
  try {
    flashcards = JSON.parse(text.replace(/```json|```/g,'').trim());
    el.innerHTML = `<div class="result-text">✅ ${flashcards.length} flashcards aangemaakt!</div><button class="btn-primary" style="margin-top:0.75rem" onclick="startFlashcards()">🃏 Start flashcards</button>`;
  } catch { el.innerHTML = `<div class="result-text">${escHtml(text)}</div>`; }
}

function renderQuizResult(text) {
  try {
    quizData = JSON.parse(text.replace(/```json|```/g,'').trim());
    quizIndex = 0; quizAnswered = false; renderQuizQuestion();
  } catch { document.getElementById('resultContent').innerHTML = `<div class="result-text">${escHtml(text)}</div>`; }
}

function renderQuizQuestion() {
  const el = document.getElementById('resultContent');
  if (quizIndex >= quizData.length) {
    el.innerHTML = `<div class="quiz-score"><div class="score-num">🎉</div><p>Quiz afgerond!</p><button class="quiz-next" onclick="quizIndex=0;renderQuizQuestion()">🔄 Opnieuw</button></div>`;
    return;
  }
  const q = quizData[quizIndex];
  quizAnswered = false;
  let html = `<div class="quiz-question"><div style="font-size:0.8rem;color:var(--text3);margin-bottom:0.5rem">Vraag ${quizIndex+1} van ${quizData.length}</div><div class="quiz-q-text">${escHtml(q.question)}</div><div class="quiz-options">`;
  q.options.forEach((opt, i) => {
    const letter = ['A','B','C','D'][i];
    html += `<button class="quiz-option" data-letter="${letter}" onclick="answerQuiz('${letter}',this)">${escHtml(opt)}</button>`;
  });
  html += `</div><div class="quiz-feedback" id="quizFeedback" style="display:none"></div><button class="quiz-next" id="quizNext" style="display:none" onclick="quizIndex++;renderQuizQuestion()">Volgende vraag →</button></div>`;
  el.innerHTML = html;
}

function answerQuiz(letter, btn) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = quizData[quizIndex];
  const correct = q.answer.startsWith(letter) || q.answer === letter;
  document.querySelectorAll('.quiz-option').forEach(b => { b.classList.add('disabled'); if (b.dataset.letter === q.answer[0]) b.classList.add('correct'); });
  if (!correct) btn.classList.add('wrong');
  const fb = document.getElementById('quizFeedback');
  fb.style.display = 'block';
  fb.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
  fb.textContent = (correct ? '✅ Juist! ' : '❌ Fout. ') + (q.explanation || '');
  document.getElementById('quizNext').style.display = 'block';
}

function renderToetsResult(text) {
  const el = document.getElementById('resultContent');
  try {
    toetsData = JSON.parse(text.replace(/```json|```/g,'').trim());
    toetsUserAnswers = new Array(toetsData.length).fill(null);
    el.innerHTML = `<div class="result-text">✅ ${toetsData.length} vragen klaar!</div><button class="btn-primary" style="margin-top:0.75rem" onclick="startToets()">📝 Start toets</button>`;
  } catch { el.innerHTML = `<div class="result-text">${escHtml(text)}</div>`; }
}

// FLASHCARDS
function startFlashcards() { fcIndex = 0; fcFlipped = false; document.getElementById('flashcardModal').classList.remove('hidden'); renderFlashcard(); }
function renderFlashcard() {
  const fc = flashcards[fcIndex];
  document.getElementById('fcProgress').textContent = `${fcIndex+1} / ${flashcards.length}`;
  document.getElementById('fcFront').textContent = fc.front;
  document.getElementById('fcBack').textContent = fc.back;
  document.getElementById('fcFront').classList.remove('hidden');
  document.getElementById('fcBack').classList.add('hidden');
  fcFlipped = false;
}
function flipCard() { fcFlipped = !fcFlipped; document.getElementById('fcFront').classList.toggle('hidden', fcFlipped); document.getElementById('fcBack').classList.toggle('hidden', !fcFlipped); }
function nextCard() { if (fcIndex < flashcards.length - 1) { fcIndex++; renderFlashcard(); } }
function prevCard() { if (fcIndex > 0) { fcIndex--; renderFlashcard(); } }
function closeFlashcards() { document.getElementById('flashcardModal').classList.add('hidden'); }

// TOETS
function startToets() {
  toetsIndex = 0;
  toetsUserAnswers = new Array(toetsData.length).fill(null);
  document.getElementById('toetsModal').classList.remove('hidden');
  if (toetsType === 'met') {
    toetsSecondsLeft = toetsMinutes * 60;
    document.getElementById('toetsTimer').classList.remove('hidden');
    updateTimerDisplay();
    toetsTimerInterval = setInterval(() => {
      toetsSecondsLeft--;
      updateTimerDisplay();
      if (toetsSecondsLeft <= 60) document.getElementById('toetsTimer').classList.add('urgent');
      if (toetsSecondsLeft <= 0) { clearInterval(toetsTimerInterval); finishToets(); }
    }, 1000);
  } else { document.getElementById('toetsTimer').classList.add('hidden'); }
  renderToetsVraag();
}

function updateTimerDisplay() {
  const m = Math.floor(toetsSecondsLeft / 60).toString().padStart(2,'0');
  const s = (toetsSecondsLeft % 60).toString().padStart(2,'0');
  document.getElementById('toetsTimer').textContent = `⏱ ${m}:${s}`;
}

function renderToetsVraag() {
  const q = toetsData[toetsIndex];
  document.getElementById('toetsVraagNum').textContent = `Vraag ${toetsIndex+1}/${toetsData.length}`;
  let html = `<div style="font-weight:500;font-size:1rem;margin-bottom:0.75rem;line-height:1.5">${escHtml(q.question)}</div>`;
  if (q.type === 'mc') {
    html += q.options.map(opt => `<button class="toets-mc-option${toetsUserAnswers[toetsIndex]===opt?' selected':''}" onclick="selectToetsMC(this,'${escAttr(opt)}')">${escHtml(opt)}</button>`).join('');
  } else {
    html += `<textarea class="toets-answer" placeholder="Schrijf jouw antwoord hier..." onchange="toetsUserAnswers[toetsIndex]=this.value">${escHtml(toetsUserAnswers[toetsIndex]||'')}</textarea>`;
  }
  document.getElementById('toetsContent').innerHTML = html;
  document.querySelector('.toets-nav .btn-secondary').style.display = toetsIndex === 0 ? 'none' : '';
  document.querySelector('.toets-nav .btn-primary').textContent = toetsIndex === toetsData.length - 1 ? 'Afronden ✓' : 'Volgende →';
}

function selectToetsMC(btn, val) {
  document.querySelectorAll('.toets-mc-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  toetsUserAnswers[toetsIndex] = val;
}

function prevToetsVraag() { if (toetsIndex > 0) { toetsIndex--; renderToetsVraag(); } }
function nextToetsVraag() { if (toetsIndex < toetsData.length - 1) { toetsIndex++; renderToetsVraag(); } else { finishToets(); } }

function finishToets() {
  clearInterval(toetsTimerInterval);
  let correct = 0;
  const mcCount = toetsData.filter(q => q.type === 'mc').length;
  const openCount = toetsData.filter(q => q.type === 'open').length;
  toetsData.forEach((q, i) => { if (q.type === 'mc' && (toetsUserAnswers[i]||'').charAt(0) === q.answer) correct++; });
  let html = `<div class="toets-results"><div class="big-score">${correct}/${mcCount}</div><p style="color:var(--text2);margin-bottom:1rem">meerkeuze correct${openCount>0?` · ${openCount} open vragen`:''}`;
  html += `</p><div style="text-align:left">`;
  toetsData.forEach((q, i) => {
    const userAns = toetsUserAnswers[i] || '(geen antwoord)';
    const icon = q.type === 'mc' ? ((userAns.charAt(0)===q.answer)?'✅':'❌') : '📝';
    html += `<div style="border-bottom:1px solid var(--border);padding:0.6rem 0"><div style="font-size:0.85rem;font-weight:500">${icon} ${escHtml(q.question)}</div>`;
    if (q.type === 'mc') html += `<div style="font-size:0.78rem;color:var(--text3)">Jouw: ${escHtml(userAns)} · Juist: ${escHtml(q.answer)}</div>`;
    else html += `<div style="font-size:0.78rem;color:var(--text3)">Jouw antwoord: ${escHtml(userAns)}</div><div style="font-size:0.78rem;color:var(--accent3)">Modelantwoord: ${escHtml(q.answer||'')}</div>`;
    html += `</div>`;
  });
  html += `</div></div>`;
  document.getElementById('toetsContent').innerHTML = html;
  document.querySelector('.toets-nav').style.display = 'none';
  document.getElementById('toetsVraagNum').textContent = 'Resultaten';
}

function closeToets() { clearInterval(toetsTimerInterval); document.getElementById('toetsModal').classList.add('hidden'); document.querySelector('.toets-nav').style.display = ''; }

// SAVE SESSION
function saveSession() {
  if (!lastResult || !currentUser) return;
  const key = 'studeer_sessions_' + currentUser.email;
  const sessions = JSON.parse(localStorage.getItem(key) || '[]');
  sessions.unshift({ id: Date.now(), date: new Date().toLocaleDateString('nl-BE',{day:'numeric',month:'long',year:'numeric'}), mode: lastResult.mode, subject: lastResult.subject || 'Geen vak', text: lastResult.text, imageBase64: lastResult.imageBase64 });
  if (sessions.length > 50) sessions.splice(50);
  localStorage.setItem(key, JSON.stringify(sessions));
  document.querySelector('.save-btn').textContent = '✅ Opgeslagen!';
  setTimeout(() => { document.querySelector('.save-btn').textContent = '💾 Opslaan'; }, 2000);
}

// HISTORY
function loadHistory() {
  if (!currentUser) return;
  const sessions = JSON.parse(localStorage.getItem('studeer_sessions_' + currentUser.email) || '[]');
  const list = document.getElementById('sessionList');
  if (!sessions.length) { list.innerHTML = `<div class="empty-state"><div>📂</div><p>Nog geen opgeslagen sessies</p><small>Analyseer leerstof en sla het op!</small></div>`; return; }
  const modeLabels = { uitgebreid:'📚 Uitgebreid', efficient:'⚡ Efficiënt', flashcards:'🃏 Flashcards', quiz:'✏️ Quiz', toets:'📝 Toets', videos:'▶️ Video\'s' };
  list.innerHTML = sessions.map(s => `<div class="session-card" onclick="openSession(${s.id})">${s.imageBase64?`<img class="session-thumb" src="data:image/jpeg;base64,${s.imageBase64}" />`:`<div class="session-thumb-placeholder">📖</div>`}<div class="session-info"><div class="session-title">${escHtml(s.subject)}</div><div class="session-meta">${s.date}</div></div><div class="session-mode-badge">${modeLabels[s.mode]||s.mode}</div></div>`).join('');
}

function openSession(id) {
  const sessions = JSON.parse(localStorage.getItem('studeer_sessions_' + currentUser.email) || '[]');
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  const modeLabels = { uitgebreid:'📚 Uitgebreide uitleg', efficient:'⚡ Efficiënte uitleg', flashcards:'🃏 Flashcards', quiz:'✏️ Quiz', toets:'📝 Toets', videos:'▶️ YouTube video\'s' };
  document.getElementById('sessionDetail').innerHTML = `<h3 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:0.25rem">${escHtml(s.subject)}</h3><p style="color:var(--text3);font-size:0.82rem;margin-bottom:1rem">${s.date} · ${modeLabels[s.mode]||s.mode}</p>${s.imageBase64?`<img class="session-detail-img" src="data:image/jpeg;base64,${s.imageBase64}" />`''}<div class="session-detail-content">${escHtml(s.text)}</div>`;
  document.getElementById('sessionModal').classList.remove('hidden');
}

function closeSessionModal() { document.getElementById('sessionModal').classList.add('hidden'); }

// UTILS
function escHtml(str) { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(str) { return (str||'').replace(/'/g,"\\'"); }
