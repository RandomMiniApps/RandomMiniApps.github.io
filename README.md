# Cliniq Labs and Logiq Labs

A static, multi-page website for independent apps by Hassan Chizari, hosted on the existing GitHub Pages site.

- `/` — two-brand gateway
- `/cliniq-labs/` — healthcare education and reading accessibility catalogue
- `/logiq-labs/` — digital confidence, utilities and creative apps
- `/<brand>/<app>/` — app overview, workflow, details, purchase information, support and privacy summary
- `/cliniq-labs/research/` — research summaries, separate from public apps
- `/international/` — retained earlier translated edition

Existing `/apps/<slug>/` and `/scamlens/` URLs still work. Their canonical URLs point to the branded app pages. Existing privacy URLs, app data feeds, `app-ads.txt` and the research review applications are preserved.

## Edit and build

The generated HTML is committed and can be served directly by GitHub Pages. Hosting needs no Python, package installation or server-side application.

Edit the source rather than individual generated pages:

| File | Purpose |
| --- | --- |
| `site/apps.json` | App facts, links, availability, features, original detail content and FAQs |
| `site/build.py` | Shared templates, brand pages and app-specific introductory copy |
| `site/health.py` | Professional Cliniq product layouts and app-specific scope information |
| `assets/brand/site.css` | Responsive shared design and brand themes |
| `assets/brand/site.js` | Navigation, catalogue filters, reading controls and practice examples |
| `assets/brand/icons/` | Optimised copies of the original app icons |

From this repository, run:

```sh
python3 site/build.py
python3 site/check.py
node site/check-interactions.cjs
```

Python uses only the standard library. Node is used only for the interaction checks. The build generates marketing pages and updates the sitemap and `llms.txt`. It does not overwrite legal policies, research apps or translated snapshots.

## Preview

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Use an HTTP preview: opening HTML directly from disk will not resolve root-relative assets correctly.

Check the gateway, both brand pages, NMC OSCE overview, Dyslexia workflow, app pricing/support and the mobile navigation. Browser visual QA was blocked in the implementation environment; automated route/content and interaction checks were completed.

## Publish with the existing GitHub Pages setup

Review the changes and push the intended files to the repository branch already configured for Pages. No deployment settings or custom domain were changed by this redesign. New brand domains can be introduced later with a deliberate redirect and research-origin plan.

Keep unrelated local files and the research materials out of an accidental broad commit. The branding implementation does not require publishing `New Materials`.

See `site/README.md` for content boundaries and remaining evidence to gather.
