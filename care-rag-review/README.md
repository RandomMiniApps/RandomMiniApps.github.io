# CARE-RAG Governance Review Portal (Phase 4.4.2a)

Internal human-review and approval **preparation** portal for the CARE-RAG Clarification Depth governance package.

**Live URL (unlisted):** https://randomminiapps.github.io/care-rag-review/

---

## Authority notice (read first)

> **This portal prepares and exports human governance decisions.**  
> **A browser interaction is not by itself authoritative approval.**  
> **Authoritative decisions must pass package, role, scope and hash validation  
> and be ingested through the approved governance process.**

- GitHub Pages is a **static** site: there is **no** authenticated clinical approval backend.
- Browser `localStorage` drafts are **not** authoritative records.
- Typed names / attestations are **not** cryptographic signatures.
- Exported JSON must be ingested through the approved governance process.

---

## Current package facts (must remain visible)

| Fact | Value |
|------|--------|
| Evidence | synthetic only — no real patient data |
| Clinical review | not started |
| Decisions recorded | none pre-populated |
| Clinical approvals | none |
| Source-control provenance status | `unversioned` |
| Source-control provenance gate | `blocked` |
| Reviewer requirement policy | `pending` |
| Human-review package readiness | `blocked` |
| Pilot / production readiness | `blocked` |
| `enableClarificationRoutingV2` | `false` |
| `enableDeviceClarificationPackV1` | `false` |

This package is **not** described as approved, clinically safe, ready for pilot, or ready for production.

---

## Routes

| Route | Purpose |
|-------|---------|
| `#/overview` | Package status, blockers, counts, hashes |
| `#/queue` | Filterable requirement queue |
| `#/item/<requirement_id>` | Evidence + decision form |
| `#/admin` | Provenance strategy + CSO classification policy |
| `#/cso` | Conditional CSO candidates (submission disabled) |
| `#/technical` | Two technical acknowledgements |
| `#/governance` | Two governance confirmations |
| `#/policy` | Eight governance-policy questions |
| `#/register` | Locally prepared / imported decisions |
| `#/export` | Validate, export, import JSON |
| `#/release` | Read-only; pilot/production controls disabled |
| `legacy-cases.html` | Previous clinician case review tool |

---

## Refresh portal data

From the **Cardiac Aftercare** project root:

```bash
python3 scripts/build_care_rag_governance_portal.py
python3 scripts/build_care_rag_governance_portal.py --sync-github-website
```

Then commit and push this repo:

```bash
cd "/Users/hassan/Documents/Apps/githubWebsite"
git add care-rag-review/
git commit -m "Update CARE-RAG Phase 4.4.2a governance review portal"
git push
```

### Tests

```bash
cd "/Users/hassan/Documents/Apps/Cardiac Aftercare"
python3 -m pytest tests/test_care_rag_governance_portal.py -q
```

No separate JS bundler build is required: GitHub Pages serves static files from the branch root (or project Pages base path). Relative asset paths (`styles.css`, `js/…`, `data/…`) work under the configured base URL.

---

## Documentation

- [REVIEWER_GUIDE.md](REVIEWER_GUIDE.md)
- [GOVERNANCE_ADMIN_GUIDE.md](GOVERNANCE_ADMIN_GUIDE.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

Do not link this page from the public app showcase unless reviewers are ready.
