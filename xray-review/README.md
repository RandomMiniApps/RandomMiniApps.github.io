# X-ray anatomy review (Phase 8C)

Static, **client-only** mobile wizard for blinded anatomy / router-target review.

- **URL (after deploy):** https://randomminiapps.github.io/xray-review/
- **Distribution:** GitHub Pages hosts the app plus password-encrypted packages
  generated from public-source research X-rays. Encryption is a convenience barrier,
  not a clinical confidentiality claim.
- Five doctors each receive two non-overlapping 248-case parts. Every case is reviewed
  once in arm A and once in arm B by two different doctors.
- Doctors choose their ID and part, enter one password, and work in IndexedDB.
- Progress backups can be restored after loading the matching part, including on a
  different device.

## Local preview

```bash
cd /Users/hassan/Documents/Apps/githubWebsite/xray-review
python3 -m http.server 8765
# open http://127.0.0.1:8765/
# tests: http://127.0.0.1:8765/tests/
```

Use the synthetic fixture at `fixtures/phase8c_webapp_fixture_package.zip` for
software checks. Plaintext doctor packages live in FractureFlow
`phase8c_portable_export/v1/doctor_double_review_shards/` and remain gitignored.

## Deploy

Commit the app, fixture, docs, `packages/manifest.json`, and only the current v3
`.ffenc` packages. Never commit plaintext ZIPs, owner passwords, administrator
mappings, or returned annotations. Do not link from the marketing homepage. Keep
`noindex`.

Run these commands from the parent GitHub Pages repository:

```bash
cd /Users/hassan/Documents/Apps/githubWebsite
git add xray-review
git status --short
git commit -m "Add five-doctor X-ray review workflow"
git push origin main
```

Before committing, the status should list 10 `portable_v3.ffenc` files and must not
list `OWNER_PACKAGE_PASSWORDS.txt`, plaintext doctor ZIPs, or legacy
`doctor??_portable_v1.ffenc` packages.

## Docs

- [Doctor guide](docs/doctor-guide.html)
- [Owner / distribution](docs/owner-guide.md)
- [Privacy](docs/privacy.html)
- [Phone QA](docs/manual-qa.md)
- [Release checklist](docs/release-checklist.md)
