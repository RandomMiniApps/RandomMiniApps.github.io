# Owner distribution guide

## Website packages (encrypted)

Encrypted doctor packages live in:

`githubWebsite/xray-review/packages/*_arm_[ab]_portable_v3.ffenc`

There are 10 files: two non-overlapping 248-case parts for each of 5 doctors.

Passwords (owner only, **gitignored**):

`FractureFlow AI/phase8c_portable_export/v1/doctor_double_review_shards/OWNER_PACKAGE_PASSWORDS.txt`

### What to send each doctor

1. Review URL (after deploy): `https://randomminiapps.github.io/xray-review/`
2. Their doctor ID (`doctor01` … `doctor05`)
3. **Their password** (from the owner passwords file) — one password opens both parts

### Doctor steps

1. Open the site → **Load my review** → choose their doctor ID.
2. Complete Part A (248 cases) and export its final feedback ZIP.
3. Complete Part B (248 different cases) and export its final feedback ZIP.
4. Return both final ZIPs.

Across the cohort, every case is reviewed once in arm A and once in arm B by
different doctors. A doctor never sees the same case in both parts.

### Rebuild encrypted packages

```bash
python3 scripts/build_double_review_doctor_shards.py
python3 scripts/encrypt_doctor_shards_for_pages.py
```

The build script updates `js/expected_digests.json` and
`js/expected_digests.js` automatically.

### Notes

- Encryption is a simple access barrier for approved public-source research images,
  not hard security.
- Confirm that every source dataset permits this redistribution before deployment.
- Do not commit `OWNER_PACKAGE_PASSWORDS.txt` to GitHub.
- Commit only the v3 arm-A/arm-B `.ffenc` files and `packages/manifest.json`.
- Do not commit plaintext ZIPs, legacy single-review packages, returned feedback, or
  administrator mappings.

### Return and merge

Place the 10 returned final ZIPs in one intake directory, quarantine them as required,
then run:

```bash
python3 scripts/merge_double_review_returns.py /path/to/quarantined_returns
```

The tool validates all assignments and produces two authoritative 1,240-row files
(`reviewer1` and `reviewer2`) plus a separate unit-to-doctor provenance file. It
rejects missing parts, duplicate/unknown units, invalid annotations, or any case
reviewed twice by the same doctor.
