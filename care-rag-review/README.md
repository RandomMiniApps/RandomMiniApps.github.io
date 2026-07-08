# CARE-RAG Clinician Review Portal

Internal clinician review tool for synthetic Cardiac Aftercare CARE-RAG evaluation outputs.

**Live URL (unlisted):** https://randomminiapps.github.io/care-rag-review/

This folder is copied from the Cardiac Aftercare project. To refresh after a new eval export, from Cardiac Aftercare project root:

```bash
python3 scripts/build_care_rag_review_portal.py
python3 scripts/build_care_rag_review_portal.py --sync-github-website
```

Then commit and push this repo:

```bash
cd "/Users/hassan/Documents/Apps/githubWebsite"
git add care-rag-review/
git commit -m "Update CARE-RAG clinician review portal dataset"
git push
```

Do not link this page from the public app showcase unless clinicians are ready. Review data stays in the reviewer's browser until exported.
