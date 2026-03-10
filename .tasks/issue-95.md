---
issue_number: 95
title: "Fix Widget left-select / Form open behaviour so Form data is filled, by sending form-ready data objects"
state: OPEN
author: Brett Forbes
created_at: 2026-02-06T03:01:40Z
updated_at: 2026-03-10T03:55:15Z
labels:
  - bug
url: https://github.com/os-threat/os-threat-alpha-1-program/issues/95
source_repo: os-threat/os-threat-alpha-1-program
source_issue_number: 95
---

## Summary

Widget left-select opens a form but does not fill it because the payload is an uncategorised JSON object. The Form expects an object with four categories: `base_required`, `base_optional`, `object`, and `extensions`. A filter function must categorise the raw node data into these four dicts before sending it to the form.

## Steps to Reproduce

1. Go to widget
2. Left-select an object (node)
3. Form appears but does not fill

## Expected Behavior

Form should fill with the selected object’s data, structured for the form.

## Actual Behavior

Form does not fill.

## Background

In `src/js/panel._utils.js`, `ns.leftclick(event, d)` runs on left-click of a node. It:

1. Adds a coloured outline (selection styling) around the icon.
2. Sends an event to open the form by calling `ns.openForm(formId, formData, payloadOptions)` (around line 285).

Currently `formData` is set to `d.original` (line 276) — the uncategorised data object. That same object is passed into `eventsNs.compileEventData(formData, ...)` inside `ns.openForm` and then raised to the parent. The Form (parent app) expects a **categorised** object with four keys: `base_required`, `base_optional`, `object`, `extensions`.

## Problem

The data sent to the form is `d.original` (uncategorised). The form expects property names (and values) to be grouped into four categories according to the logic in the issue pseudocode. Without this categorisation, the form does not fill.

## Solution (scope)

Implement a function that takes the uncategorised data object (e.g. `d.original`) and returns a categorised object with the four keys, using the logic below. Call this function in `ns.leftclick` before passing data to `ns.openForm`, so that `formData` is the categorised result.

### Categorisation logic (from source issue pseudocode)

- **base_required**: `["id", "type", "spec_version", "created", "modified"]`
- **Exception**: If property is in `["created", "modified"]` **and** `dataObject.type` is in `["process", "file", "network-traffic", "x-oca-asset", "x-oca-event"]`, put that property in **object**, not base_required.
- **base_optional**: `["created_by_ref", "revoked", "labels", "confidence", "lang", "external_references", "object_marking_refs", "granular_markings"]`
- **extensions**: The property whose name is exactly `"extensions"` (value goes into `rearrangedData.extensions`).
- **object**: Any other property (including those in the exception case above) goes into `rearrangedData.object`.

Result shape:

```javascript
{
  base_required: { /* ... */ },
  base_optional: { /* ... */ },
  object:       { /* ... */ },
  extensions:   { /* ... */ }  // or the value of the "extensions" property
}
```

## Acceptance Criteria

- [ ] A function exists that accepts an uncategorised data object and returns an object with keys `base_required`, `base_optional`, `object`, `extensions` per the logic above.
- [ ] `ns.leftclick` uses this function to convert `d.original` to categorised form data before calling `ns.openForm`.
- [ ] The event sent to the parent (form) contains this categorised object so the form can fill.
- [ ] No change to selection/outline behaviour; only the payload passed to `openForm` changes.
- [ ] Existing tests pass; new/updated tests cover the categorisation behaviour as required by project TDD.

## Additional Context

- Reference: [os-threat/os-threat-alpha-1-program#95](https://github.com/os-threat/os-threat-alpha-1-program/issues/95)
- Code: `ns.leftclick` and `ns.openForm` in `src/js/panel._utils.js` (e.g. lines 266–291, 593–612).

---

## Incremental Updates

- 2026-03-10: Task created from external issue #95; scenario (background, problem, solution) and acceptance criteria documented. Author set to Brett Forbes (personal profile).
- 2026-03-10: Implemented `ns.categoriseFormData` in `panel._utils.js`; wired categorised `formData` into `ns.leftclick`; added `cypress/e2e/form-fill.cy.js` for categorisation and form payload tests.
