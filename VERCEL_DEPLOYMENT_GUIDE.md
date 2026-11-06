# 🚀 Tripcelona (tripcelona.com) - Vercel Deployment Guide

This guide explains step-by-step how to deploy this Tripcelona Check-in & QR Code Pass Validator application to **Vercel** for free.

---

## Option 1: Deploy with Git (Recommended)

### Step 1: Push your code to GitHub, GitLab, or Bitbucket
1. Initialize a git repository if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Tripcelona Check-in App"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tripcelona.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in or sign up at [vercel.com](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository.
4. Vercel automatically detects **Vite**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**.
6. Within ~45 seconds, your application is live with free SSL!

---

## Option 2: Deploy directly via Vercel CLI (Fastest)

If you have Node.js installed on your computer:

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. In your project root directory, run:
   ```bash
   vercel
   ```
3. Follow the prompts (press Enter to accept default settings).
4. To deploy directly to production with your custom domain:
   ```bash
   vercel --prod
   ```

---

## Custom Domain Setup (tripcelona.com)

1. Go to your Vercel Project Dashboard.
2. Navigate to **Settings > Domains**.
3. Enter `tripcelona.com` or `checkin.tripcelona.com`.
4. Add the provided CNAME / A records in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.).
5. Vercel automatically generates and manages free SSL/TLS certificates.

---

## Separate Validation Link on Event Day

1. Open your live app URL (e.g. `https://tripcelona.com`).
2. Share this direct validation URL with the coach driver or check-in staff:
   - `https://tripcelona.com/?mode=validator`
3. Staff can open this link on any smartphone or tablet.
4. Tap **"Start Camera Scanner"** to scan passenger QR passes at boarding time or search by name.
