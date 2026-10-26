## EmailJS configuration status

The supplied Public Key, Service ID, and Template ID have already been entered in `auth.js` in this ZIP. Before testing, confirm your EmailJS template has **To Email** set to `{{to_email}}` and uses `{{otp_code}}` for the OTP value.

# VoteChain — Personal EmailJS + GitHub Pages Setup

This project uses plain HTML, CSS, and JavaScript. This guide helps you connect **your own EmailJS account** and publish the demo on GitHub Pages.

## 1. Create your own EmailJS account

1. Visit https://www.emailjs.com/ and sign up with an email account you control.
2. Open **Email Services** → **Add New Service** and connect your own email provider. Copy the Service ID.
3. Open **Email Templates** → create a template.
4. Configure the template with:
   - **To Email:** `{{to_email}}`
   - **Subject:** `VoteChain — Your OTP Code`
   - **Body:** `Your VoteChain verification code is {{otp_code}}. It expires in 5 minutes. If you did not request this code, ignore this email.`
5. Save the template and copy its Template ID.
6. Open **Account** → **General** and copy your Public Key.

The template variable names must match exactly: `to_email` and `otp_code`.

## 2. Add your own EmailJS details

1. Open `auth.js` in VS Code.
2. Near the top, find these three constants:
   ```js
   const EMAILJS_PUBLIC_KEY   = '';
   const EMAILJS_SERVICE_ID   = '';
   const EMAILJS_TEMPLATE_ID  = '';
   ```
3. Paste your own values between the quotes. Do not use your friend's service/template IDs.
4. Save and test registration with an email address you can access.

The EmailJS **Public Key** is intended for browser use, but service/template identifiers are still tied to your account. Do not put email-provider passwords, private keys, or other secrets in this project.

## 3. Run it locally first

- Open the `votechain-main` folder in VS Code.
- Install the **Live Server** extension, then right-click `index.html` → **Open with Live Server**.
- Try registering with your own email address and confirm the OTP arrives.
- If it fails, check the browser Console and EmailJS dashboard's email/service logs.

## 4. Publish on GitHub Pages

1. Sign in at https://github.com/ and create a **new repository** (for example, `votechain-demo`).
2. Choose whether the repository is public or private. GitHub Pages availability depends on your plan and repository settings; for the simplest setup, a public repository is usually easiest.
3. In VS Code, open the terminal in the `votechain-main` folder and run:
   ```bash
   git init
   git add .
   git commit -m "Set up my VoteChain demo"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/votechain-demo.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `votechain-demo` with your actual GitHub username and repository name. If Git says your identity is unknown, configure `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
4. On GitHub, open your repository → **Settings** → **Pages**.
5. Under build/deployment, select **Deploy from a branch**, choose branch `main` and folder `/ (root)`, then save.
6. Wait for deployment to finish. Your site URL will normally be:
   `https://YOUR_USERNAME.github.io/votechain-demo/`

## Important security limits

- This is a **front-end demo**, not a secure real-world election platform. Users, sessions, OTP records, votes, and blockchain data are stored in each browser's `localStorage`; users can modify or clear that data. The browser-side OTP storage also means this implementation should not be used to protect real accounts.
- Do not use this project for actual elections or sensitive personal information without a trusted backend, server-side OTP verification, a database, proper authorization, and independent security review.
- The default demo accounts are for demonstration only. Change/remove demo credentials before sharing the site.
- Anyone can inspect public website source code. Never put private API keys, passwords, or email-provider credentials in frontend files.
