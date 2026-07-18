# Reviewer guide — CARE-RAG governance portal

## What this portal is for

Prepare and export human governance decisions for Phase 4.4.2a Clarification Depth review. You are reviewing **synthetic** evaluation evidence only.

## What it is not

- Not an authenticated clinical approval system
- Not a place where clicking “approve” makes a mapping clinically authorised
- Not a pilot or production enablement console

## Roles

1. **Clinician** — 202 active requirements (197 mapping, 1 wording, 2 pending-construct, 2 safety-net).
2. **Clinical Safety Officer** — 201 **conditional** candidates; final submission disabled until policy + regenerated requirements.
3. **Technical reviewer** — 2 evidence acknowledgements (never clinical approval).
4. **Governance panel** — 2 confirmations + 8 policy questions.
5. **Governance administrator** — provenance strategy + CSO participation policy (see admin guide).

## How to complete a task (fast path)

1. Set **Working as** to **Clinician**.
2. Open **My review queue**.
3. Click **Review a random case**.
4. Fill decision + rationale (your name/attestation carry forward to the next case).
5. Click **Save & next random case** — the next unreviewed case opens automatically.
6. Use **Skip — next random** to pass without deciding, or **Exit** to leave the loop.
7. When finished for the session, open **Export & validation** and download your decisions.

## How to complete a task (manual)

1. Set **Working as** to your role.
2. Open **My review queue**, filter as needed, open a requirement.
3. Read evidence, transcript, hashes, and decision questions.
4. Optionally **Save draft** (local only — labelled draft).
5. Fill all required fields and **Validate & prepare decision**.
6. Export from **Export & validation** and send the JSON through the authorised governance ingestion process.

## Rules

- Empty fields, page visits, and drafts are **never** approvals.
- `request_change` requires `requested_changes` text.
- Technical `acknowledge` ≠ clinical approve.
- Governance confirmation ≠ clinical mapping approval.
- Do not attempt to enable pilot/production from this UI (controls are disabled).
