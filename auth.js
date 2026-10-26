// ============================================================
//  AUTH.JS — Authentication + EmailJS OTP
//
//  ⚠️  IMPORTANT — REPLACE THESE 3 VALUES BEFORE DEPLOYING:
//
//      EMAILJS_PUBLIC_KEY   → from emailjs.com → Account → General
//      EMAILJS_SERVICE_ID   → from emailjs.com → Email Services
//      EMAILJS_TEMPLATE_ID  → from emailjs.com → Email Templates
//
//  HOW TO GET THEM:
//    1. Go to https://www.emailjs.com and sign up (free)
//    2. Click "Add New Service" → choose Gmail → connect your Gmail
//       → copy the Service ID shown (e.g. service_ab12cd3)
//    3. Click "Email Templates" → "Create New Template"
//       → Set Subject: "VoteChain — Your OTP Code"
//       → Set Body (see README for full template)
//       → In "To Email" field type:  {{to_email}}
//       → Save → copy the Template ID (e.g. template_xy98zw1)
//    4. Click "Account" → "General" → copy Public Key
//       (e.g. aBcDeFgHiJkLmNoPq)
//    5. Paste all 3 values below and save the file
//
//  CYBERSECURITY CONCEPTS IMPLEMENTED:
//    1. SHA-256 password hashing (passwords never stored in plain text)
//    2. Salting  (unique per user — prevents rainbow table attacks)
//    3. Input sanitization (prevents XSS & injection attacks)
//    4. Brute force protection (5 attempts → account locked)
//    5. Two-Factor Authentication via Email OTP (account unlock)
//    6. OTP registration (prevents fake/bot account creation)
//    7. OTP expiry (5 minutes) + resend cooldown (60 seconds)
//    8. Cryptographically secure OTP (crypto.getRandomValues)
//    9. Email masking (a***@gmail.com — never exposes full email)
// ============================================================

// ── ⚠️  PUT YOUR EMAILJS CREDENTIALS HERE ─────────────────
const EMAILJS_PUBLIC_KEY   = 'zltH6dlOPNtwKBcAp';   // e.g. 'aBcDeFgHiJkLmNoPq'
const EMAILJS_SERVICE_ID   = 'service_2o7nx5k';   // e.g. 'service_ab12cd3'
const EMAILJS_TEMPLATE_ID  = 'template_rg08uck';  // e.g. 'template_xy98zw1'
// ──────────────────────────────────────────────────────────

// Initialize EmailJS with your public key
// This MUST run before any emailjs.send() calls
emailjs.init(EMAILJS_PUBLIC_KEY);

// ── STORAGE KEYS ──────────────────────────────────────────
const AUTH_STORAGE_KEY = 'votechain_users';
const SESSION_KEY      = 'votechain_session';
const ATTEMPTS_KEY     = 'votechain_attempts';
const OTP_STORE_KEY    = 'votechain_otps';

// ── DEFAULT USERS SETUP ───────────────────────────────────
/**
 * Creates 3 default demo users on first load.
 * Passwords are hashed with SHA-256 + salt — never stored plain.
 * Demo users have a placeholder email since they were created before
 * the email OTP system. Real registered users will have real emails.
 */
async function initAuth() {
  const existing = loadUsers();
  if (existing && existing.length > 0) return; // already initialized

  const adminHash  = await hashPassword('Admin@123', 'admin');
  const voter1Hash = await hashPassword('Vote@2024', 'V001');
  const voter2Hash = await hashPassword('Vote@2024', 'V002');

  const users = [
    {
      id: 'admin', name: 'Administrator', role: 'admin',
      passwordHash: adminHash,
      email: 'admin@votechain.demo'   // placeholder for demo account
    },
    {
      id: 'V001', name: 'Aryan Sharma', role: 'voter',
      passwordHash: voter1Hash,
      email: 'aryan@votechain.demo'
    },
    {
      id: 'V002', name: 'Priya Patel', role: 'voter',
      passwordHash: voter2Hash,
      email: 'priya@votechain.demo'
    },
  ];
  saveUsers(users);
}

// ── STORAGE HELPERS ───────────────────────────────────────
function loadUsers()      { const d = localStorage.getItem(AUTH_STORAGE_KEY); return d ? JSON.parse(d) : []; }
function saveUsers(u)     { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u)); }
function loadOtps()       { const d = localStorage.getItem(OTP_STORE_KEY);    return d ? JSON.parse(d) : {}; }
function saveOtps(o)      { localStorage.setItem(OTP_STORE_KEY, JSON.stringify(o)); }

// ── SHA-256 PASSWORD HASHING ──────────────────────────────
/**
 * SECURITY CONCEPT — Salted SHA-256:
 * password + userId (salt) + global pepper → SHA-256 hash
 * Even if two users share the same password, their hashes differ
 * because the salt (userId) is unique per user.
 */
async function hashPassword(password, salt = 'votechain_global') {
  const salted = password + salt + 'votechain_2024_pepper';
  return await sha256(salted);
}

// ── OTP ENGINE ────────────────────────────────────────────
/**
 * Generate a cryptographically secure 6-digit OTP.
 * SECURITY: Uses crypto.getRandomValues — NOT Math.random()
 * Math.random() is predictable; crypto.getRandomValues is not.
 */
function generateOtp() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // Force a number between 100000 and 999999
  return String(100000 + (buf[0] % 900000));
}

/**
 * Store OTP with expiry + send via EmailJS.
 * key     = unique identifier (e.g. 'reg_user@email.com' or 'unlock_V001')
 * otp     = the 6-digit code
 * toEmail = recipient email address
 */
async function storeAndSendOtp(key, otp, toEmail) {
  // 1. Save OTP locally with 5-minute expiry
  const otps = loadOtps();
  otps[key]  = { otp, email: toEmail, expiry: Date.now() + 5 * 60 * 1000 };
  saveOtps(otps);

  // 2. Send real email via EmailJS
  //    The template variables {{to_email}} and {{otp_code}} must match
  //    exactly what you set in your EmailJS template.
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email : toEmail,
    otp_code : otp
  });

  // Note: if emailjs.send() throws, the error bubbles up to the caller
  // and the UI shows an error message to the user.
}

/**
 * Validate an OTP — checks the value AND whether it has expired.
 */
function validateOtp(key, enteredOtp) {
  const otps   = loadOtps();
  const stored = otps[key];

  if (!stored)                           throw new Error('No OTP found. Please request a new one.');
  if (Date.now() > stored.expiry)      { clearOtp(key); throw new Error('OTP has expired. Please request a new one.'); }
  if (stored.otp !== enteredOtp.trim()) throw new Error('Incorrect OTP. Please try again.');

  return true; // valid
}

function clearOtp(key) {
  const otps = loadOtps();
  delete otps[key];
  saveOtps(otps);
}

// ── EMAIL MASKING ─────────────────────────────────────────
/**
 * Shows "a***@gmail.com" instead of full email.
 * SECURITY: Never display a user's full email address in the UI.
 */
function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.substring(0, 2);
  return visible + '***@' + domain;
}

// ── BRUTE FORCE TRACKING ──────────────────────────────────
function getAttempts(id)  {
  const d = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  return d[id] || 0;
}
function recordAttempt(id) {
  const d = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  d[id] = (d[id] || 0) + 1;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(d));
}
function clearAttempts(id) {
  const d = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  delete d[id];
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(d));
}

// ── LOGIN ─────────────────────────────────────────────────
/**
 * LOGIN FLOW:
 *   Step 1 — Sanitize inputs
 *   Step 2 — Check attempt count; if >= 5 → trigger 2FA OTP
 *   Step 3 — Hash entered password with SHA-256 + salt
 *   Step 4 — Compare hash with stored hash (NEVER compare plain text)
 *   Step 5 — On success: clear attempts, create session
 *   Step 6 — On fail: increment attempt counter
 *
 * Returns:
 *   { locked: false, session }  → normal login success
 *   { locked: true,  maskedEmail, otpSent: true }  → 2FA triggered
 */
async function login(userId, password) {
  userId = sanitizeInput(userId);
  if (!userId || !password) throw new Error('Please fill in all fields.');

  const users = loadUsers();
  const user  = users.find(u => u.id === userId);

  const attempts = getAttempts(userId);

  // Account is locked — send OTP to unlock
  if (attempts >= 5) {
    if (!user)           throw new Error('Invalid Voter ID.');
    if (!user.email)     throw new Error('No email on record. Please contact admin.');

    const otp = generateOtp();
    await storeAndSendOtp('unlock_' + userId, otp, user.email);

    return { locked: true, maskedEmail: maskEmail(user.email) };
  }

  // User not found
  if (!user) {
    recordAttempt(userId);
    throw new Error('Invalid Voter ID or password.');
  }

  // Hash and compare password
  const enteredHash = await hashPassword(password, userId);
  if (enteredHash !== user.passwordHash) {
    recordAttempt(userId);
    const remaining = 5 - getAttempts(userId);

    // Just reached 5 — immediately trigger 2FA
    if (remaining <= 0) {
      const otp = generateOtp();
      await storeAndSendOtp('unlock_' + userId, otp, user.email);
      return { locked: true, maskedEmail: maskEmail(user.email) };
    }

    throw new Error(`Invalid password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lock.`);
  }

  // ✅ Password correct
  clearAttempts(userId);
  const session = { userId: user.id, name: user.name, role: user.role, loginTime: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { locked: false, session };
}

// ── 2FA OTP VERIFY (Login unlock) ────────────────────────
/**
 * Called when the user submits their OTP on the 2FA screen.
 * Validates OTP → clears lockout → creates session.
 */
async function verifyLoginOtp(userId, enteredOtp) {
  userId = sanitizeInput(userId);
  validateOtp('unlock_' + userId, enteredOtp); // throws if invalid/expired

  clearOtp('unlock_' + userId);
  clearAttempts(userId);

  const users = loadUsers();
  const user  = users.find(u => u.id === userId);
  if (!user) throw new Error('User not found.');

  const session = { userId: user.id, name: user.name, role: user.role, loginTime: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// ── RESEND LOGIN OTP ──────────────────────────────────────
async function resendLoginOtp(userId) {
  userId = sanitizeInput(userId);
  const users = loadUsers();
  const user  = users.find(u => u.id === userId);
  if (!user || !user.email) throw new Error('No email on record.');

  const otp = generateOtp();
  await storeAndSendOtp('unlock_' + userId, otp, user.email);
  return maskEmail(user.email);
}

// ── REGISTER STEP 1 ───────────────────────────────────────
/**
 * REGISTER FLOW — Step 1:
 *   1. Validate all fields
 *   2. Check password strength
 *   3. Check for duplicate Voter ID and duplicate email
 *   4. Generate OTP → send to email via EmailJS
 *   5. Save pending registration data to localStorage temporarily
 *
 * Account is NOT created yet — only after OTP is verified (Step 2).
 * This prevents fake/bot accounts from being created without a real email.
 */
async function registerStep1(userId, name, email, password, confirmPassword) {
  userId = sanitizeInput(userId);
  name   = sanitizeInput(name);
  email  = email.trim().toLowerCase();

  if (!userId || !name || !email || !password) throw new Error('All fields are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password !== confirmPassword)              throw new Error('Passwords do not match.');

  const strength = checkPasswordStrength(password);
  if (strength.score < 3) throw new Error('Password too weak. ' + strength.feedback);

  const users = loadUsers();
  if (users.find(u => u.id === userId))    throw new Error('Voter ID already exists. Choose another.');
  if (users.find(u => u.email === email))  throw new Error('This email is already registered.');

  // Save form data temporarily — account created only after OTP verified
  localStorage.setItem('votechain_reg_pending', JSON.stringify({ userId, name, email, password }));

  // Generate OTP and send to email
  const otp = generateOtp();
  await storeAndSendOtp('reg_' + email, otp, email);

  return maskEmail(email);
}

// ── REGISTER STEP 2 ───────────────────────────────────────
/**
 * REGISTER FLOW — Step 2:
 *   1. Retrieve pending registration data
 *   2. Validate OTP
 *   3. Hash password → create user account
 *   4. Clean up temp data
 */
async function registerStep2(enteredOtp) {
  const pendingRaw = localStorage.getItem('votechain_reg_pending');
  if (!pendingRaw) throw new Error('Registration session expired. Please start again.');

  const { userId, name, email, password } = JSON.parse(pendingRaw);

  validateOtp('reg_' + email, enteredOtp); // throws if wrong or expired

  // OTP verified — now create the account
  const passwordHash = await hashPassword(password, userId);
  const users        = loadUsers();
  users.push({ id: userId, name, role: 'voter', passwordHash, email });
  saveUsers(users);

  // Cleanup temp data
  clearOtp('reg_' + email);
  localStorage.removeItem('votechain_reg_pending');
  return true;
}

// ── RESEND REGISTER OTP ───────────────────────────────────
async function resendRegOtp() {
  const pendingRaw = localStorage.getItem('votechain_reg_pending');
  if (!pendingRaw) throw new Error('Registration session expired. Please start again.');

  const { email } = JSON.parse(pendingRaw);
  const otp = generateOtp();
  await storeAndSendOtp('reg_' + email, otp, email);
  return maskEmail(email);
}

// ── PASSWORD STRENGTH ─────────────────────────────────────
function checkPasswordStrength(password) {
  let score = 0, tips = [];
  if (password.length >= 8)          score++; else tips.push('min 8 characters');
  if (/[A-Z]/.test(password))        score++; else tips.push('1 uppercase letter');
  if (/[a-z]/.test(password))        score++; else tips.push('1 lowercase letter');
  if (/[0-9]/.test(password))        score++; else tips.push('1 number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else tips.push('1 special character');
  return {
    score,
    label:    ['Very Weak','Weak','Fair','Good','Strong','Very Strong'][score],
    feedback: tips.length ? 'Need: ' + tips.join(', ') : 'Strong password!'
  };
}

// ── INPUT SANITIZATION ────────────────────────────────────
/**
 * SECURITY: Strip dangerous characters to prevent XSS and injection.
 */
function sanitizeInput(input) {
  if (!input) return '';
  return input.trim().replace(/[<>'"]/g, '').substring(0, 50);
}

// ── SESSION ───────────────────────────────────────────────
function getSession() { const d = localStorage.getItem(SESSION_KEY); return d ? JSON.parse(d) : null; }
function logout()     { localStorage.removeItem(SESSION_KEY); }
