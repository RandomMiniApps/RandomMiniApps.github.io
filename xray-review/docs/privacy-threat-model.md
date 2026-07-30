# Privacy threat model (summary)

Assumptions:

- the GitHub Pages site, JavaScript and encrypted `.ffenc` packages are publicly
  downloadable;
- the radiographs come from public research datasets and contain no private project
  patient information;
- package encryption is a low-friction access barrier, not strong confidentiality;
- dataset redistribution/licence approval remains an owner release prerequisite.

## Assets to protect

- Radiograph previews
- Reviewer annotations
- Admin / unblinded mappings
- Model predictions and sampling strata (must never appear in reviewer packages)

## Controls

| Threat | Control |
|---|---|
| Plaintext packages in git | Gitignore all ZIPs; host only `.ffenc` packages |
| Encrypted packages copied publicly | Accepted for approved public-source datasets; passwords are shared separately |
| Annotation exfiltration | No upload API or analytics; annotations remain in IndexedDB until explicit export |
| Path traversal in ZIP | Reject `..`, absolute paths, forbidden names |
| Tampered package | AES-GCM authentication plus whole-ZIP SHA-256 gate vs generated digests |
| Cross-reviewer mix-up | Session keyed by package + reviewer + freeze hash |
| Accidental PHI in notes | Instructions forbid provenance / PHI paste |

## Residual risk

Browser compromise or a malicious extension can read IndexedDB. A hosted ciphertext
can also be copied and subjected to password guessing; this is accepted only because
the approved inputs are public-source, non-private research radiographs. Do not use
this deployment model for Trust PACS images, private clinical images, identifiers, or
restricted/licence-incompatible datasets.
