# GitHub Pages – App Store showcase

A single-page site for showcasing your App Store apps, designed to run on **GitHub Pages**.

## Connect to GitHub and go live

1. **Create a repo**  
   On GitHub: **New repository** → name it e.g. `username.github.io` (replace `username` with your GitHub username) for a *user* site, or any name (e.g. `githubWebsite`) for a *project* site.

2. **Push this folder**  
   In this folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: App Store showcase page"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

3. **Turn on GitHub Pages**  
   In the repo: **Settings** → **Pages** → under **Source** choose **Deploy from a branch** → Branch: **main** (or **master**) → folder: **/ (root)** → Save.

4. **Open the site**  
   - User site: `https://YOUR_USERNAME.github.io`
   - Project site: `https://YOUR_USERNAME.github.io/YOUR_REPO`

## Customize the page

- **Title and tagline**  
  Edit the `<h1>` and `.tagline` in `index.html`.

- **Add an app**  
  Copy one full `<a class="app-card">…</a>` block. Then:
  - Set `href` to your App Store link (e.g. `https://apps.apple.com/app/id1234567890`).
  - Use a real app icon: put the image in this repo and use `<img src="your-icon.png" alt="App Name">` inside `.app-icon` (remove the emoji `<span>`).
  - Update **App Name**, description, and meta (e.g. `iOS · Free`).

- **Footer**  
  Change the GitHub link in the footer to your profile.

No build step required—GitHub Pages will serve `index.html` as-is.
