---
paths:
  - "app/**/*.tsx"
  - "app/api/**/*.ts"
---

# Agent isolation — never cross these boundaries

- TMF360: documents, audit_trail, demo_requests, tmf_config, intake_items, document_tasks, placeholders, findings, …
- Site360: sites, site_members, site360_demo_requests, site360_signup_tokens, …
- ISF (/site360/isf): isf_documents, isf_audit_trail, isf_queries, isf_config, isf_artifact_config
- Participant360: instruments, participant_responses, participant_activities, …
- Shared: organizations, user_roles, studies, participants

NEVER
- Site360 → demo_requests (use site360_demo_requests).
- ISF → documents (use isf_documents).
- TMF360 → site360_* tables.
- Any agent writing another agent's tables.
