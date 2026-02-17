# Fix GitHub Pages 404 – "There isn't a GitHub Pages site here"

Follow these steps **on GitHub.com** (in your browser).

---

## 1. Enable GitHub Pages

1. Open your repository on GitHub.
2. Click **Settings** (tab at the top).
3. In the left sidebar, click **Pages** (under "Code and automation").
4. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
5. Under **Branch**:
   - Branch: select **main** (or **master** if that’s your default).
   - Folder: select **/ (root)**.
6. Click **Save**.

---

## 2. Use the correct URL

GitHub serves your site at a URL that depends on your repo name.

| Repo name              | Your site URL                          |
|------------------------|----------------------------------------|
| `YOUR_USERNAME.github.io` | **https://YOUR_USERNAME.github.io**    |
| Anything else (e.g. `githubWebsite`) | **https://YOUR_USERNAME.github.io/githubWebsite/** |

- Replace **YOUR_USERNAME** with your GitHub username.
- For a project repo, the path **must** include the repo name and usually a trailing slash, e.g.  
  `https://s2115563.github.io/githubWebsite/`

---

## 3. Wait 1–2 minutes

After saving, GitHub builds the site. Wait a minute, then refresh the correct URL (and try with a trailing `/` if you get 404).

---

## 4. Check that `index.html` is at the repo root on GitHub

On your repo’s **Code** tab you should see **index.html** in the **root** list (same level as README), not inside a folder. If index.html is only inside a folder (e.g. `main/`), the site will 404. In that case, move or push `index.html` so it’s in the repo root and push again.

---

**Summary:** Enable Pages from branch **main**, folder **/ (root)**, then open the URL that matches your repo name (and add the repo name in the path if it’s not `username.github.io`).
