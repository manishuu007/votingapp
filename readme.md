# ⛓ VoteChain — Blockchain-Based Secure Voting System

A professional, secure, blockchain-based voting system built with **pure HTML, CSS, and JavaScript** — no backend, no database, no frameworks needed!

---

## 🚀 Quick Start (VS Code, New Laptop)

### Step 1 — Install Required Software
1. Download **VS Code**: https://code.visualstudio.com/
2. Install the **Live Server** extension in VS Code:
   - Open VS Code → Click Extensions (left sidebar)
   - Search: `Live Server` by Ritwick Dey → Install

### Step 2 — Open the Project
1. Open VS Code
2. File → Open Folder → Select the `blockchain-voting` folder
3. Right-click `index.html` → **"Open with Live Server"**
4. Browser opens at `http://127.0.0.1:5500`

### Step 3 — Login Credentials
| Role  | ID      | Password   |
|-------|---------|------------|
| Admin | `admin` | `Admin@123`|
| Voter | `V001`  | `Vote@2024`|
| Voter | `V002`  | `Vote@2024`|

> You can also register new voters from the login page!

---

## 📁 Project Structure

```
blockchain-voting/
├── index.html      ← All pages (Login, Register, Vote, Admin Dashboard)
├── style.css       ← Professional dark-theme UI
├── blockchain.js   ← Core blockchain implementation
├── auth.js         ← Authentication with password hashing
├── app.js          ← Main app logic & election data
└── README.md       ← This file
```

---

## 🗳 Election Posts

| Post             | Candidates |
|------------------|------------|
| 🎓 College Captain   | 5 candidates |
| ⚽ Sports Captain    | 5 candidates |
| 🏠 House Captain     | Red, Blue, Green, Yellow |
| 🎭 Cultural Captain  | 5 candidates |

> **All posts are mandatory** — voters must vote in all 4 categories before submitting.

---

## 🔐 Cybersecurity Implementation (For Exams!)

### 1. Password Hashing (SHA-256)
- Passwords are **never stored in plain text**
- Every password is converted to a 64-character hash using SHA-256
- Example: `Admin@123` → `5e884898da28047...` (irreversible)
- Even if someone reads localStorage, they only see hashes
- **File:** `auth.js` → `hashPassword()` function

### 2. Salting
- A unique "salt" (the user's ID) is added to each password before hashing
- This means two users with the same password get **different hashes**
- Prevents **rainbow table attacks** (pre-computed hash lookups)
- **File:** `auth.js` → `hashPassword(password, salt)`

### 3. Input Sanitization (XSS Prevention)
- All user inputs are sanitized: `<`, `>`, `'`, `"` characters are stripped
- Prevents **Cross-Site Scripting (XSS)** and **injection attacks**
- **File:** `auth.js` → `sanitizeInput()` function

### 4. Brute Force Protection
- After 5 failed login attempts, the account is **locked**
- Attempts are tracked in localStorage per user ID
- **File:** `auth.js` → `recordAttempt()`, `getAttempts()`

### 5. Password Strength Enforcement
- Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Real-time strength indicator shown during registration
- **File:** `auth.js` → `checkPasswordStrength()`

### 6. Blockchain Immutability
- Every vote is stored as an immutable **Block**
- Each block contains the **hash of the previous block** (chain linkage)
- If any block is altered, ALL subsequent hashes break → tampering detected
- **File:** `blockchain.js` → `Block` class, `isChainValid()`

### 7. Proof of Work (PoW)
- Before adding a vote block, the system must find a hash starting with `00` (difficulty=2)
- This makes it computationally expensive to tamper with blocks
- Same concept used in **Bitcoin**!
- **File:** `blockchain.js` → `mineBlock(difficulty)`

### 8. Voter Anonymity (Hash-based)
- Voter IDs are **hashed** before storing in the blockchain
- The chain records `sha256(voterId + salt)`, not the real voter ID
- Prevents double voting while preserving anonymity
- **File:** `blockchain.js` → `addVoteBlock()`

### 9. Chain Integrity Verification
- Admin can click "Verify Chain Integrity" to validate all blocks
- System recalculates every block's hash and checks chain linkage
- **File:** `blockchain.js` → `isChainValid()`

### 10. Session Management
- Login creates a session object stored in localStorage
- Session includes: userId, name, role, loginTime
- On page load, session is checked to auto-redirect users
- **File:** `auth.js` → `getSession()`, `logout()`

---

## ⛓ How the Blockchain Works (For Exams!)

```
[Genesis Block]  →  [Vote Block #1]  →  [Vote Block #2]  →  ...
 hash: "00abc..."    hash: "00def..."    hash: "00ghi..."
 prevHash: "0"       prevHash: "00abc"  prevHash: "00def"
```

**Key concepts:**
- **Block** = A container storing vote data + metadata + hashes
- **Genesis Block** = First block (no previous block, prevHash="0")
- **previousHash** = Creates the "chain" — blocks are linked
- **SHA-256** = The cryptographic hash function used
- **Proof of Work** = Mining difficulty (hash must start with "00")
- **Immutability** = Change one block → all subsequent hashes break

---

## 🌐 Hosting on GitHub Pages

### Step 1 — Create GitHub Account
Go to https://github.com and sign up (free)

### Step 2 — Install Git
Download from https://git-scm.com/downloads and install

### Step 3 — Create a Repository
1. On GitHub, click **"New repository"**
2. Name it: `blockchain-voting`
3. Set to **Public**
4. Click **"Create repository"**

### Step 4 — Push Your Code

Open **Git Bash** or **VS Code Terminal** and run:

```bash
cd path/to/blockchain-voting

git init
git add .
git commit -m "Initial commit: VoteChain Blockchain Voting System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/blockchain-voting.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 5 — Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under "Source" → Select **"Deploy from a branch"**
4. Branch: **main** → Folder: **/ (root)**
5. Click **Save**

### Step 6 — Get Your Live URL
Wait 2-3 minutes, then visit:
```
https://YOUR_USERNAME.github.io/blockchain-voting
```

🎉 Your voting system is now live on the internet!

---

## 👑 Admin Dashboard Features

- **Real-time vote count** for all candidates across all posts
- **Winner highlighted** with 👑 crown and visual bar chart
- **Total voters** and **blockchain blocks** counter
- **Blockchain ledger visual** — see every block in the chain
- **Verify Chain Integrity** — detect any tampering
- **Reset Election** — clear all votes and start fresh

---

## 🛡 Security Summary Table (Exam Ready)

| Attack Type        | Defense Used                        | Where in Code    |
|--------------------|-------------------------------------|------------------|
| Password Theft     | SHA-256 Hashing                     | `auth.js`        |
| Rainbow Table      | Salting (userId as salt)            | `auth.js`        |
| XSS Injection      | Input Sanitization                  | `auth.js`        |
| Brute Force        | Attempt Limiting (max 5)            | `auth.js`        |
| Weak Passwords     | Strength Checker                    | `auth.js`        |
| Vote Tampering     | Blockchain Immutability             | `blockchain.js`  |
| Double Voting      | Voter Hash Check                    | `blockchain.js`  |
| Identity Exposure  | Anonymized Voter ID (hashed)        | `blockchain.js`  |
| Block Forgery      | Proof of Work (mining)              | `blockchain.js`  |
| Chain Manipulation | Hash Linkage Validation             | `blockchain.js`  |

---

## 📝 Notes

- **No database needed** — all data stored in browser's `localStorage`
- **No server needed** — pure frontend, works as a static site
- **No frameworks** — vanilla HTML/CSS/JS only
- Works offline after first load
- Data persists between browser sessions