# Data sources and schema

## Authoritative Phase 4.4.2a artefacts

Loaded from Cardiac Aftercare `docs/evidence_generation/` (not older 4.4 / 4.4.1 / 4.4.2 files):

- `clarification_depth_phase4_4_2a_review_queue.json`
- `clarification_depth_phase4_4_2a_review_views.json`
- `clarification_depth_phase4_4_2a_decision_requirements.json`
- `clarification_depth_phase4_4_2a_decision_schema.json`
- `clarification_depth_phase4_4_2a_governance_policy_register.json`
- `clarification_depth_phase4_4_2a_empty_clinical_decisions.json`
- `clarification_depth_phase4_4_2a_empty_cso_decisions.json`
- `clarification_depth_phase4_4_2a_empty_technical_acknowledgements.json`
- `clarification_depth_phase4_4_2a_empty_governance_confirmations.json`
- `clarification_depth_phase4_4_2a_release_readiness.json`
- `clarification_depth_phase4_4_2a_finalisation_status.json`
- `clarification_depth_phase4_4_2a_delivery_manifest.json`
- `clarification_depth_phase4_4_2a_terminal_delivery_verification.json`
- `clarification_depth_phase4_4_2a_final_verification.json` (technical status)

## Generated browser data

Command:

```bash
python3 scripts/build_care_rag_governance_portal.py [--sync-github-website]
```

Outputs:

- `docs/care_rag_governance_portal/data/portal_bundle.json`
- `docs/care_rag_governance_portal/data/portal_manifest.json`
- Synced copies under `githubWebsite/care-rag-review/data/`

The generator validates package ID consistency, counts (204 / 407 / 206 / 201), binds `expected_protected_hashes` from empty templates, and fails on sealed hash mismatches.

## Decision schema

Decision records follow `clarification_depth_phase4_4_2a_decision_schema.json` (`schema_version` 4). Human fields remain null until explicit submission. Lifecycle: `unreviewed`, `active`, `superseded`, `withdrawn`, `inactive_pending_policy`. Replacements use `supersedes_decision_id` without mutating the prior record.
