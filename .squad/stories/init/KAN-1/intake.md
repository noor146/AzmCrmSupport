> **Fetched from jira:** [KAN-1](https://nourhanali2910.atlassian.net/browse/KAN-1)  
> *Fetched 2026-08-25T21:38:21.161Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** As a Sales Rep, I want to create and track leads so that I never miss a potential customer.  
**Type:** Story  
**Status:** To Do

### Description

a sales representative, I want to be able to capture new leads manually or automatically so that all inquiries are central in the system.

	Acceptance Criteria:
	
		Can manually create a Lead with fields: Name, Email, Phone, Company, Source, Priority, and Status (New, Contacted, Qualified, Lost).

		System checks for duplicate leads based on Email/Phone and alerts the user.

		Can filter and search leads by Source and Status.

### Attachments

None.

---
> **Title hint (from CLI):** As a Sales Rep, I want to create and track leads so that I never miss a potential customer.

# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/init/KAN-1/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `init`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** (used in filenames and plan tables; leave blank if tracker type is `none`)
- **Work item type:** Story / Bug / Task / Chore / …

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim.)*

```

```

---

## Description

*(Paste the full work item description, including any formatting you rely on.)*

```

```

---

## Acceptance criteria

*(Paste the acceptance criteria — checklist, bullets, Gherkin, whatever the tracker stores.)*

```

```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| *(e.g. `attachments/flow.png`)* | *(e.g. UX flow)* |

*(Add rows per file. If none, write "None.")*

---

## Dependencies

- **Blocked by / related ids:** (tracker ids only; optional short note)
- **Depends on code areas or other stories:**

## Extra notes (optional)

- Anything not captured above (e.g. chat context) — keep short.

## Technical hints (optional)

- APIs, screens, services already discussed. Repos/roots: `.`. Primary language: `en`.

## Out of scope

- What this story explicitly does **not** cover:
