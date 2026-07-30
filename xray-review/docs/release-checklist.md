# Release checklist

- [x] `tests/index.html` all PASS on a local static server (23/23, 2026-07-30)
- [ ] Manual phone QA complete for fixture
- [ ] Only approved public-source v3 `.ffenc` packages are included; no plaintext
      X-rays, legacy packages, returned annotations, passwords or admin mappings
- [ ] CSP present; no CDN scripts on review route
- [ ] `noindex` meta present
- [ ] Doctor guide and privacy pages linked
- [x] Expected ZIP digests match all 10 current v3 packages; encrypt/decrypt/hash
      round-trip verified (2026-07-30)
- [x] Double-review assignment audit: 1,240 units × two different doctors
- [x] Progress-backup restore validation covered by automated tests
- [x] Completed-case correction navigation implemented
- [ ] Dataset redistribution/licence approval recorded by owner
- [x] Owner confirmed five-doctor distribution plan
- [ ] **Pause:** await explicit deploy approval before push

## Decision

- LOCAL build ready for phone QA: **YES**
- Deploy: **NOT YET** (per plan)
