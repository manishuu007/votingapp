// ============================================================
//  APP.JS — Main Application Logic
//  Handles: page routing, login/register OTP flow,
//           voting, admin dashboard, blockchain visualizer
// ============================================================

// ── ELECTION DATA ─────────────────────────────────────────
const ELECTION_DATA = {
  college: {
    title: 'College Captain', icon: '🎓',
    candidates: [
      { id:'c1', name:'Aarav Mehta',   tagline:'Innovation & Growth',   color:'#6366f1' },
      { id:'c2', name:'Diya Kapoor',   tagline:'Unity & Progress',      color:'#ec4899' },
      { id:'c3', name:'Rohan Verma',   tagline:'Voice of Students',     color:'#14b8a6' },
      { id:'c4', name:'Sneha Joshi',   tagline:'Change Begins Here',    color:'#f59e0b' },
      { id:'c5', name:'Karan Singh',   tagline:'Lead With Purpose',     color:'#8b5cf6' },
    ]
  },
  sports: {
    title: 'Sports Captain', icon: '⚽',
    candidates: [
      { id:'s1', name:'Vikram Nair',   tagline:'Champion Mindset',      color:'#ef4444' },
      { id:'s2', name:'Ananya Roy',    tagline:'Train Hard, Win Harder',color:'#f97316' },
      { id:'s3', name:'Arjun Patel',   tagline:'Team Spirit First',     color:'#10b981' },
      { id:'s4', name:'Riya Sharma',   tagline:'Dedication Wins',       color:'#06b6d4' },
      { id:'s5', name:'Dev Gupta',     tagline:'Stronger Together',     color:'#8b5cf6' },
    ]
  },
  house: {
    title: 'House Captain', icon: '🏠',
    candidates: [
      { id:'h1', name:'Aditi Red House',   tagline:'Red House — Courage & Fire',  color:'#ef4444' },
      { id:'h2', name:'Rahul Blue House',  tagline:'Blue House — Calm & Steady',  color:'#3b82f6' },
      { id:'h3', name:'Priya Green House', tagline:'Green House — Growth & Life', color:'#22c55e' },
      { id:'h4', name:'Sam Yellow House',  tagline:'Yellow House — Joy & Energy', color:'#eab308' },
    ]
  },
  cultural: {
    title: 'Cultural Captain', icon: '🎭',
    candidates: [
      { id:'cu1', name:'Meera Pillai',  tagline:'Art Speaks Louder',        color:'#a855f7' },
      { id:'cu2', name:'Nikhil Das',    tagline:'Celebrate Every Culture',  color:'#ec4899' },
      { id:'cu3', name:'Tara Singh',    tagline:'Express, Inspire, Unite',  color:'#f59e0b' },
      { id:'cu4', name:'Aditya Bose',   tagline:'Culture Is Our Identity',  color:'#14b8a6' },
      { id:'cu5', name:'Lakshmi R.',    tagline:'Heritage Meets Future',    color:'#6366f1' },
    ]
  }
};

// ── STATE ─────────────────────────────────────────────────
let currentVotes        = {};
let currentSession      = null;
let lockedUserId        = '';   // stores voter ID when 2FA is triggered
let otpTimerInterval    = null;
let resendCoolInterval  = null;

// ── INIT ──────────────────────────────────────────────────
window.onload = async () => {
  await blockchain.init();
  await initAuth();

  // Password strength listener
  const regPassEl = document.getElementById('regPass');
  if (regPassEl) {
    regPassEl.addEventListener('input', () => {
      const r      = checkPasswordStrength(regPassEl.value);
      const colors = ['#ef4444','#f97316','#eab308','#22c55e','#10b981','#6366f1'];
      document.getElementById('passStrength').innerHTML =
        `<div class="strength-bar" style="width:${r.score*20}%;background:${colors[r.score]}"></div>
         <span style="color:${colors[r.score]}">${r.label}: ${r.feedback}</span>`;
    });
  }

  // Route based on existing session
  const session = getSession();
  if (session) {
    currentSession = session;
    if (session.role === 'admin') { showPage('page-admin'); loadAdminDashboard(); }
    else                          { showPage('page-vote');  loadVotePage(); }
  } else {
    showPage('page-login');
  }
  updateBlockCounts();
};

// ── PAGE NAVIGATION ───────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function togglePass(id) {
  const el = document.getElementById(id);
  el.type  = el.type === 'password' ? 'text' : 'password';
}

// ── LOGIN ─────────────────────────────────────────────────
async function handleLogin() {
  const id   = document.getElementById('loginId').value;
  const pass = document.getElementById('loginPass').value;
  setLoginError('');
  setLoginSuccess('');
  setLoginLoading(true);

  try {
    const result = await login(id, pass);

    if (result.locked) {
      // Account locked — show 2FA OTP panel
      lockedUserId = id.trim();
      showTwoFaPanel(result.maskedEmail);
    } else {
      // Normal success
      currentSession = result.session;
      setLoginSuccess(`✅ Welcome, ${result.session.name}! Redirecting...`);
      setTimeout(() => {
        if (result.session.role === 'admin') { showPage('page-admin'); loadAdminDashboard(); }
        else                                 { showPage('page-vote');  loadVotePage(); }
      }, 900);
    }
  } catch (e) {
    setLoginError('❌ ' + e.message);
  } finally {
    setLoginLoading(false);
  }
}

// ── 2FA PANEL ─────────────────────────────────────────────
function showTwoFaPanel(maskedEmail) {
  document.getElementById('login-step1').classList.add('hidden');
  document.getElementById('login-step2').classList.remove('hidden');
  document.getElementById('twofa-email-hint').textContent =
    `Your account has been locked after 5 failed attempts. A 6-digit OTP has been sent to ${maskedEmail}. Enter it below to unlock your account.`;
  startOtpTimer('otpTimerDisplay', 300);
  startResendCooldown('resendBtn', 'resendCooldown', 60);
}

function cancelTwoFa() {
  clearAllTimers();
  document.getElementById('login-step1').classList.remove('hidden');
  document.getElementById('login-step2').classList.add('hidden');
  document.getElementById('loginOtp').value = '';
  document.getElementById('login-error').classList.add('hidden');
  lockedUserId = '';
}

async function handleVerifyLoginOtp() {
  const otp = document.getElementById('loginOtp').value.trim();
  setLoginError('');
  document.getElementById('loginOtpBtn').disabled    = true;
  document.getElementById('loginOtpBtn').textContent = '⏳ Verifying...';

  try {
    const session = await verifyLoginOtp(lockedUserId, otp);
    clearAllTimers();
    currentSession = session;
    setLoginSuccess(`✅ Identity verified! Welcome, ${session.name}.`);
    setTimeout(() => {
      if (session.role === 'admin') { showPage('page-admin'); loadAdminDashboard(); }
      else                          { showPage('page-vote');  loadVotePage(); }
    }, 900);
  } catch (e) {
    setLoginError('❌ ' + e.message);
    document.getElementById('loginOtpBtn').disabled    = false;
    document.getElementById('loginOtpBtn').textContent = '✅ Verify & Unlock Account';
  }
}

async function handleResendLoginOtp() {
  try {
    const masked = await resendLoginOtp(lockedUserId);
    document.getElementById('twofa-email-hint').textContent =
      `A new OTP has been sent to ${masked}.`;
    startOtpTimer('otpTimerDisplay', 300);
    startResendCooldown('resendBtn', 'resendCooldown', 60);
  } catch (e) {
    setLoginError('❌ ' + e.message);
  }
}

// ── REGISTER STEP 1 ───────────────────────────────────────
async function handleRegisterStep1() {
  const name    = document.getElementById('regName').value;
  const id      = document.getElementById('regId').value;
  const email   = document.getElementById('regEmail').value;
  const pass    = document.getElementById('regPass').value;
  const confirm = document.getElementById('regConfirm').value;
  const errEl   = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ Sending OTP...';

  try {
    const maskedEmail = await registerStep1(id, name, email, pass, confirm);

    // Switch to OTP card
    document.getElementById('reg-card-step1').classList.add('hidden');
    document.getElementById('reg-card-step2').classList.remove('hidden');
    document.getElementById('reg-email-display').textContent =
      `A 6-digit OTP has been sent to ${maskedEmail}. Check your inbox (and spam folder).`;

    startOtpTimer('regOtpTimerDisplay', 300);
    startResendCooldown('regResendBtn', 'regResendCooldown', 60);

  } catch (e) {
    errEl.textContent = '❌ ' + e.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled    = false;
    btn.textContent = '📧 Send OTP to Verify Email';
  }
}

// ── REGISTER STEP 2 ───────────────────────────────────────
async function handleRegisterStep2() {
  const otp   = document.getElementById('regOtp').value.trim();
  const errEl = document.getElementById('reg-otp-error');
  const sucEl = document.getElementById('reg-otp-success');
  errEl.classList.add('hidden');

  try {
    await registerStep2(otp);
    clearAllTimers();
    sucEl.textContent = '✅ Account created! Redirecting to login...';
    sucEl.classList.remove('hidden');
    setTimeout(() => { backToRegStep1(); showPage('page-login'); }, 1800);
  } catch (e) {
    errEl.textContent = '❌ ' + e.message;
    errEl.classList.remove('hidden');
  }
}

async function handleRegResendOtp() {
  try {
    const masked = await resendRegOtp();
    document.getElementById('reg-email-display').textContent =
      `A new OTP has been sent to ${masked}.`;
    startOtpTimer('regOtpTimerDisplay', 300);
    startResendCooldown('regResendBtn', 'regResendCooldown', 60);
  } catch (e) {
    document.getElementById('reg-otp-error').textContent = '❌ ' + e.message;
    document.getElementById('reg-otp-error').classList.remove('hidden');
  }
}

function backToRegStep1() {
  clearAllTimers();
  document.getElementById('reg-card-step1').classList.remove('hidden');
  document.getElementById('reg-card-step2').classList.add('hidden');
  document.getElementById('reg-otp-error').classList.add('hidden');
  document.getElementById('reg-otp-success').classList.add('hidden');
  document.getElementById('regOtp').value = '';
}

// ── OTP TIMER ─────────────────────────────────────────────
/**
 * Counts down from totalSeconds on the given display element.
 * Shows MM:SS format. Turns red and shows "Expired" at 0.
 */
function startOtpTimer(displayId, totalSeconds) {
  if (otpTimerInterval) clearInterval(otpTimerInterval);
  let remaining = totalSeconds;
  const el      = document.getElementById(displayId);

  const tick = () => {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.style.color = remaining <= 30 ? '#ef4444' : '';
    if (remaining <= 0) {
      clearInterval(otpTimerInterval);
      el.textContent = 'Expired';
      el.style.color = '#ef4444';
    }
    remaining--;
  };
  tick();
  otpTimerInterval = setInterval(tick, 1000);
}

/**
 * Disables the resend button for `seconds` with a live countdown.
 * Re-enables when countdown hits 0.
 */
function startResendCooldown(btnId, spanId, seconds) {
  if (resendCoolInterval) clearInterval(resendCoolInterval);
  const btn  = document.getElementById(btnId);
  const span = document.getElementById(spanId);
  btn.disabled = true;
  let remaining = seconds;

  const tick = () => {
    span.textContent = `(${remaining}s)`;
    if (remaining <= 0) {
      clearInterval(resendCoolInterval);
      btn.disabled     = false;
      span.textContent = '';
    }
    remaining--;
  };
  tick();
  resendCoolInterval = setInterval(tick, 1000);
}

function clearAllTimers() {
  if (otpTimerInterval)   clearInterval(otpTimerInterval);
  if (resendCoolInterval) clearInterval(resendCoolInterval);
}

// ── LOGIN UI HELPERS ──────────────────────────────────────
function setLoginError(msg) {
  const el = document.getElementById('login-error');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else      { el.classList.add('hidden'); }
}
function setLoginSuccess(msg) {
  const el = document.getElementById('login-success');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else      { el.classList.add('hidden'); }
}
function setLoginLoading(on) {
  const btn = document.querySelector('#login-step1 .btn-primary');
  if (!btn) return;
  btn.disabled    = on;
  btn.textContent = on ? '⏳ Verifying...' : 'Login Securely';
}

// ── VOTING PAGE ───────────────────────────────────────────
async function loadVotePage() {
  document.getElementById('voterDisplay').textContent = `Voter: ${currentSession.userId}`;
  currentVotes = {};

  const voterHash   = await sha256(currentSession.userId + 'salt_votechain_2024');
  const votedHashes = blockchain.getVotedHashes();

  if (votedHashes.includes(voterHash)) {
    document.getElementById('already-voted-msg').classList.remove('hidden');
    document.getElementById('vote-sections').style.opacity      = '0.4';
    document.getElementById('vote-sections').style.pointerEvents = 'none';
    document.getElementById('submitBtn').disabled    = true;
    document.getElementById('submitBtn').textContent = '✅ Already Voted';
  } else {
    document.getElementById('already-voted-msg').classList.add('hidden');
    document.getElementById('vote-sections').style.opacity      = '1';
    document.getElementById('vote-sections').style.pointerEvents = 'auto';
    document.getElementById('submitBtn').disabled    = false;
    document.getElementById('submitBtn').textContent = '🔐 Submit Votes to Blockchain';
  }

  for (const [category, data] of Object.entries(ELECTION_DATA)) {
    renderCandidates(category, data.candidates);
  }
  updateProgress();
  updateBlockCounts();
}

function renderCandidates(category, candidates) {
  const grid = document.getElementById(`candidates-${category}`);
  if (!grid) return;
  grid.innerHTML = candidates.map(c => `
    <div class="candidate-card" id="card-${category}-${c.id}"
         onclick="selectCandidate('${category}','${c.id}')">
      <div class="candidate-avatar"
           style="background:${c.color}22; border:2px solid ${c.color}40">
        <span style="color:${c.color}; font-size:1.6rem">${getInitials(c.name)}</span>
      </div>
      <div class="candidate-info">
        <div class="candidate-name">${c.name}</div>
        <div class="candidate-tagline">${c.tagline}</div>
      </div>
      <div class="candidate-select-indicator"
           style="border-color:${c.color}" id="ind-${category}-${c.id}"></div>
    </div>`).join('');
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function selectCandidate(category, candidateId) {
  document.querySelectorAll(`#candidates-${category} .candidate-card`)
          .forEach(c => c.classList.remove('selected'));
  document.getElementById(`card-${category}-${candidateId}`).classList.add('selected');
  currentVotes[category] = candidateId;
  document.getElementById(`check-${category}`).classList.remove('hidden');
  updateProgress();
}

function updateProgress() {
  const total = Object.keys(ELECTION_DATA).length;
  const voted = Object.keys(currentVotes).length;
  document.getElementById('voteProgress').style.width   = `${(voted / total) * 100}%`;
  document.getElementById('progressText').textContent   = `${voted} of ${total} categories voted`;
}

async function submitVotes() {
  const missing = Object.keys(ELECTION_DATA).filter(c => !currentVotes[c]);
  if (missing.length) {
    document.getElementById('submit-warning').classList.remove('hidden');
    missing.forEach(c => {
      const s = document.getElementById(`section-${c}`);
      s.classList.add('shake');
      setTimeout(() => s.classList.remove('shake'), 600);
    });
    return;
  }

  document.getElementById('submit-warning').classList.add('hidden');
  const btn       = document.getElementById('submitBtn');
  btn.disabled    = true;
  btn.textContent = '⏳ Mining Block...';

  try {
    // Convert candidate IDs to names for storage
    const namedVotes = {};
    for (const [cat, candId] of Object.entries(currentVotes)) {
      const candidate  = ELECTION_DATA[cat].candidates.find(c => c.id === candId);
      namedVotes[cat]  = candidate ? candidate.name : candId;
    }
    await blockchain.addVoteBlock(currentSession.userId, namedVotes);
    btn.textContent      = '✅ Vote Recorded on Blockchain!';
    btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
    updateBlockCounts();
    setTimeout(() => loadVotePage(), 1500);
  } catch (e) {
    btn.textContent = '❌ Error: ' + e.message;
    btn.disabled    = false;
  }
}

// ── LOGOUT ────────────────────────────────────────────────
function handleLogout() {
  logout();
  clearAllTimers();
  currentSession = null;
  currentVotes   = {};
  lockedUserId   = '';
  showPage('page-login');
}

// ── BLOCK COUNTS ─────────────────────────────────────────
function updateBlockCounts() {
  const count = blockchain.chain.length;
  const e1    = document.getElementById('blockCount');
  const e2    = document.getElementById('adminBlockCount');
  if (e1) e1.textContent = count;
  if (e2) e2.textContent = count;
}

// ── ADMIN DASHBOARD ───────────────────────────────────────
function loadAdminDashboard() {
  updateBlockCounts();
  const tally       = blockchain.tallyVotes();
  const totalVoters = blockchain.getTotalVoters();

  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${totalVoters}</div>
      <div class="stat-label">Total Votes Cast</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${blockchain.chain.length}</div>
      <div class="stat-label">Blockchain Blocks</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${Object.keys(ELECTION_DATA).length}</div>
      <div class="stat-label">Election Posts</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">✅</div>
      <div class="stat-label">Chain Verified</div>
    </div>`;

  document.getElementById('adminResults').innerHTML =
    Object.entries(ELECTION_DATA).map(([category, data]) => {
      const catTally = tally[category] || {};
      const maxVotes = Math.max(...data.candidates.map(c => catTally[c.name] || 0), 1);
      return `
        <div class="result-card">
          <div class="result-header">
            <span class="result-icon">${data.icon}</span>
            <h3>${data.title}</h3>
            <span class="total-votes-badge">
              ${Object.values(catTally).reduce((a,b)=>a+b,0)} votes
            </span>
          </div>
          ${data.candidates.map(c => {
            const votes    = catTally[c.name] || 0;
            const pct      = (votes / maxVotes) * 100;
            const isWinner = votes === maxVotes && votes > 0;
            return `
              <div class="result-row ${isWinner ? 'winner' : ''}">
                <div class="result-avatar"
                     style="background:${c.color}22; color:${c.color}">
                  ${getInitials(c.name)}
                </div>
                <div class="result-name">${c.name} ${isWinner ? '👑' : ''}</div>
                <div class="result-bar-wrap">
                  <div class="result-bar"
                       style="width:${pct}%; background:${c.color}"></div>
                </div>
                <div class="result-count" style="color:${c.color}">${votes}</div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('');

  renderBlockchainVisual();
}

function renderBlockchainVisual() {
  document.getElementById('blockchainVisual').innerHTML =
    blockchain.chain.map((block, i) => `
      <div class="block-node">
        <div class="block-box">
          <div class="block-index">#${block.index}</div>
          <div class="block-type">${block.data.type || 'DATA'}</div>
          <div class="block-hash"  title="${block.hash}">
            ${block.hash.substring(0,12)}...
          </div>
          <div class="block-prev" title="${block.previousHash}">
            ${block.previousHash.substring(0,8)}...
          </div>
        </div>
        ${i < blockchain.chain.length - 1 ? '<div class="block-arrow">→</div>' : ''}
      </div>`).join('');
}

async function verifyChain() {
  const valid = await blockchain.isChainValid();
  alert(valid
    ? '✅ Chain is VALID! All blocks are intact and untampered.'
    : '❌ Chain is COMPROMISED! Tampering detected!');
}

function resetElection() {
  if (confirm('⚠️ This will ERASE all votes and reset the blockchain. Are you sure?')) {
    blockchain.reset();
    localStorage.removeItem('votechain_users');
    blockchain.init().then(() =>
      initAuth().then(() => {
        loadAdminDashboard();
        alert('Election has been reset successfully.');
      })
    );
  }
}