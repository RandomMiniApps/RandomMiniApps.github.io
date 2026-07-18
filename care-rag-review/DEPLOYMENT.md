# Deployment — CARE-RAG governance portal

## Existing process (unchanged)

The `githubWebsite` repo deploys from the branch root via GitHub Pages (**Deploy from a branch** → `/ (root)`). No bundler build step is required for the showcase or this portal.

The portal lives at `care-rag-review/` and is served as static HTML/CSS/JS.

## Publishing updates

1. Regenerate data from Cardiac Aftercare:

```bash
python3 scripts/build_care_rag_governance_portal.py --sync-github-website
```

2. Commit portal files in `githubWebsite`:

```bash
git add care-rag-review/
git commit -m "Update CARE-RAG Phase 4.4.2a governance review portal"
git push
```

## Base URL / asset paths

All assets use **relative** URLs (`styles.css`, `js/app.js`, `data/portal_bundle.json`). This works for:

- Project Pages: `https://<user>.github.io/<repo>/care-rag-review/`
- Or a dedicated Pages site whose root is this folder

Do not hard-code `localhost` or absolute filesystem paths.

## Required Pages change

None, unless Pages was previously misconfigured. Keep **Deploy from a branch** with folder `/ (root)`. Ensure `care-rag-review/data/portal_bundle.json` is committed (large but required).

## Security note

Static hosting cannot provide trusted clinical approval authority. Treat exports as preparation artefacts for offline/governance ingestion only.
