# Issue 95 – Implementation Plan and Instructions (for approval)

**Branch:** `formFill`  
**Source:** [os-threat/os-threat-alpha-1-program#95](https://github.com/os-threat/os-threat-alpha-1-program/issues/95)  
**Task files:** `.tasks/issue-95.json`, `.tasks/issue-95.md`

---

## 1. Plan summary

| Step | Action | File(s) |
|------|--------|--------|
| 1 | Add a categorisation function that maps uncategorised object → `{ base_required, base_optional, object, extensions }` per issue logic | `src/js/panel._utils.js` |
| 2 | In `ns.leftclick`, replace `formData = d.original` with `formData = ns.categoriseFormData(d.original)` (or equivalent name) before calling `ns.openForm` | `src/js/panel._utils.js` |
| 3 | Add/update tests: E2E for “left-click → form receives categorised payload”; unit-style tests for the categorisation function | `cypress/e2e/` and/or test for categorisation logic |

No other behaviour changes: selection/outline and rest of `leftclick` stay the same; only the payload passed to `openForm` becomes categorised.

---

## 2. Proposed changes (detail)

### 2.1 New function: categorise form data

- **Name:** `ns.categoriseFormData(dataObject)` (or `categoriseForForm` – to be decided).
- **Location:** `src/js/panel._utils.js`, in the same IIFE as `ns.leftclick`, e.g. immediately before `ns.leftclick`.
- **Input:** Single argument – the uncategorised object (e.g. `d.original`). If `dataObject` is null/undefined, return an object with four empty objects `{ base_required: {}, base_optional: {}, object: {}, extensions: {} }`.
- **Output:** One object with exactly four keys: `base_required`, `base_optional`, `object`, `extensions`. Each key is an object (plain key–value). The `extensions` key holds the value of the `"extensions"` property from the input (if any); otherwise `{}`.

**Logic (align with issue pseudocode):**

- **Constants:**
  - `base_required` list: `["id", "type", "spec_version", "created", "modified"]`
  - `exception` list: `["created", "modified"]`
  - `exceptionType` list: `["process", "file", "network-traffic", "x-oca-asset", "x-oca-event"]`
  - `base_optional` list: `["created_by_ref", "revoked", "labels", "confidence", "lang", "external_references", "object_marking_refs", "granular_markings"]`
- **Iteration:** Over enumerable own properties of `dataObject` (e.g. `Object.keys(dataObject).forEach` or equivalent).
- **Per property:**
  1. If `propertyName` is in `exception` **and** `dataObject.type` is in `exceptionType` → assign to `result.object`.
  2. Else if `propertyName` is in `base_required` → assign to `result.base_required`.
  3. Else if `propertyName` is in `base_optional` → assign to `result.base_optional`.
  4. Else if `propertyName === "extensions"` → set `result.extensions` to the **value** of that property (or `{}` if missing).
  5. Else → assign to `result.object`.

Implementation must use the same namespace/style as the rest of the file (IIFE, `ns.*`, no ES modules).

### 2.2 Change in `ns.leftclick`

- **Location:** `src/js/panel._utils.js`, around lines 275–276.
- **Current:** `const formData = d.original;`
- **New:**  
  - Compute categorised data: e.g. `const formData = ns.categoriseFormData(d.original || {});`  
  - Keep the rest unchanged: same `formId`, `payloadOptions`, and `ns.openForm(formId, formData, payloadOptions)` call.

No change to selection logic, `ns.selection`, or DOM styling.

### 2.3 Tests (TDD)

- **E2E (Cypress):** Add or extend a spec so that when the user left-clicks a node, the event payload sent to the parent (e.g. via `compileEventData`/`raiseEvent`) contains an object with `base_required`, `base_optional`, `object`, and `extensions`. Exact file can be a new `form-fill.cy.js` or an existing user-interaction/local-mode spec, per project layout.
- **Categorisation logic:** Add tests that call the categorisation function with sample objects and assert the four buckets (e.g. known `type` + exception keys go to `object`, base_required keys to `base_required`, etc.). If the project has a unit test runner for `src/js`, use it; otherwise use Cypress or a small test harness that loads the bundle and invokes the function.

---

## 3. Instructions for implementation (after approval)

1. **Create GitHub issue** in the **widget-graph-viz-composer** repo (if not already created) for “Form fill: categorise node data for form payload” and reference this plan and `.tasks/issue-95.*`.
2. **TDD – Red:** Add E2E test that left-clicks a node and asserts the raised event payload has categorised shape; add unit tests for `categoriseFormData` with 2–3 inputs (e.g. object with base_required + exception type, object with base_optional, object with `extensions`). Run tests; expect failures.
3. **Implement categorisation:** In `panel._utils.js`, add `ns.categoriseFormData` with the constants and per-property logic above. Handle null/undefined input.
4. **Wire into leftclick:** Replace `formData = d.original` with `formData = ns.categoriseFormData(d.original || {});` in `ns.leftclick`.
5. **TDD – Green:** Run E2E and categorisation tests; fix until they pass.
6. **Refactor if needed:** Keep behaviour identical; improve names or structure only.
7. **Regression:** Run full E2E suite; ensure no regressions.
8. **Commit:** Message format `#[issue-number] fix(panel): categorise form data for left-select form fill` with body referencing issue 95 and this plan.
9. **Push** branch `formFill` and open PR or mark ready for review as per workflow.

---

## 4. Files to touch

| File | Change |
|------|--------|
| `src/js/panel._utils.js` | Add `ns.categoriseFormData`; in `ns.leftclick` set `formData = ns.categoriseFormData(d.original \|\| {})` |
| `cypress/e2e/*.cy.js` (or new file) | E2E: left-click node → event payload has categorised form data |
| Test file for categorisation | Unit-style tests for `categoriseFormData` |

---

## 5. Out of scope

- Changing how the parent form consumes the payload.
- Changing selection/outline behaviour.
- Adding new dependencies.
- Supporting non–own properties or prototype chains (iterate only over own keys of the data object).

---

*Do not implement until this plan and instructions are approved.*
