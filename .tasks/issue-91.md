---
issue_number: 91
title: "Composer Widget Does not Delete data in the promo or scratch DOM before new data is loaded"
state: OPEN
author: Brett Forbes
created_at: 2026-01-28T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
labels:
  - bug
url: https://github.com/os-threat/os-threat-alpha-1-program/issues/91
source_repo: os-threat/os-threat-alpha-1-program
---

## Summary

Composer Widget does not clear existing data in the Promo and Scratch force-graph SVG DOM before loading new data, so new data is drawn on top of old data when refresh runs (e.g. radio button change or RMB menu return).

## Steps to Reproduce

1. Run Composer Widget
2. Watch data get loaded twice in the Promo/Scratch SVGs, once on loading and once on loading the tree

## Expected Behavior

Composer deletes the items in the DOM before loading the new data for Promo and Scratch.

## Actual Behavior

Composer writes the same data multiple times (new data on top of old).

## Background

The widget loads data through both `init()` and a refresh function, which runs on:
- Changing the tree type radio button
- Return data from an RMB (context) menu event

## Problem

- **panel.tree.js** has a `clearData()` function that clears the tree view SVG DOM before new data is loaded.
- **panel.promo.js** and **panel.scratch.js** do **not** have a `clearData()` (or equivalent) that removes current force-graph DOM before new data is loaded.
- Result: when refresh runs, new data loads on top of the old data in Promo and Scratch.

## Solution (scope)

1. Add a `clearData()` (or equivalent) to **panel.promo.js** that removes existing force-graph SVG elements (nodes, links, edge paths, edge labels) from the promo SVG root before new data is drawn.
2. Add a `clearData()` (or equivalent) to **panel.scratch.js** that does the same for the scratch SVG root.
3. Ensure the clear runs before new data is rendered (e.g. at the start of `showGraph()` in each panel, or from `widget.loadData()` before calling `showGraph()`).
4. Restart the simulation after clearing so the force graph runs with the new data.

## Acceptance Criteria

- [ ] Promo panel clears existing force-graph DOM (nodes, links, edge paths, edge labels) before rendering new data
- [ ] Scratch panel clears existing force-graph DOM (nodes, links, edge paths, edge labels) before rendering new data
- [ ] Simulation is restarted after clearing so the force graph runs with new data
- [ ] Refresh (radio change or DATA_REFRESH / RMB return) no longer draws new data on top of old data in Promo or Scratch
- [ ] No regression in tree panel or init/load flow

## Additional Context

- Reference: [os-threat/os-threat-alpha-1-program#91](https://github.com/os-threat/os-threat-alpha-1-program/issues/91)
- Tree implementation reference: `ns.clearData` in `src/js/panel.tree.js` (lines ~1126–1139) and tree SVG clear in `loadData` / `getDataFromUrl` (`ns.tree_svg.selectAll("*").remove()`).

---

## Incremental Updates

- 2026-02-18: Task created from external issue #91; scenario (background, problem, solution) and acceptance criteria documented.
- 2026-02-18: Implemented clearData() in panel.promo.js and panel.scratch.js; call at start of showGraph(); restart simulation with alpha(1).restart() after setup.
