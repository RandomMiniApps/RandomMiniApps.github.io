# Governance administrator guide

## Immediate blockers

1. **Source-control provenance strategy** (`#/admin`)  
   - Current: status `unversioned`, gate `blocked`, unresolved mode `plan_only`.  
   - `plan_only` is **not** offered as an approval outcome.  
   - Allowed strategies: `existing_repository`, `new_dedicated_repository`, `accepted_non_git_provenance_policy`, `defer`, `reject`, `request_change`.

2. **CSO participation classification** (`gpr_cso_participation_classification`)  
   - Define which item classes need individual CSO review, sampled oversight, clinician-only, escalation, or deferral.  
   - Exporting a policy decision **does not** activate the 201 conditional CSO requirements in the browser.  
   - After authorised ingestion, **regenerate** the decision-requirements package; only then may `mandatory_active` CSO requirements be loaded.

## Export and ingestion

Prepared decisions are browser-local until exported. Authoritative effect requires package/role/scope/hash validation and governance ingestion. Do not treat GitHub Pages as the system of record.

## Pilot / production

Leave release controls disabled. Clinical review completion does not enable pilot. Separate explicit governance decisions are required later — outside this portal’s enablement surface.
