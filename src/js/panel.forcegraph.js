// panel.forcegraph.js
// Owns rendering of the two force-graph panels (Promotable and Scratch Pad) and the layout
// decision they share.
//
// panel._utils.js processGraphData() has always ended by calling
// window.Widgets.Panel.ForceGraph.showGraph(split), but this namespace was never written -
// the refactor that introduced the call (a60637b, "updatig graph processing to use split
// from api") deleted the old layout helper and left the call pointing at nothing. The
// resulting TypeError was swallowed by processGraphData's try/catch, so both panels stayed
// empty while the widget still reported "Graph data loaded successfully".
//
// The actual renderers live on Widgets.Panel.Promo and Widgets.Panel.Scratch. This module is
// the missing piece between them: it validates the split, decides which layout the promo
// simulation should use, and drives both panels.
window.Widgets.Panel.ForceGraph = {}

;(function ($, ns, panelUtilsNs, document, window) {
    "use strict";

    // ------------------------------------------------------------------------------------
    // Simulation lifecycle instrumentation
    //
    // The widget runs in an iframe on a different origin to its host page, so when it is
    // embedded neither its console nor its simulation state can be read from the outside.
    // That blindness is what made docs/issues/0016 (the Promotable graph never settling)
    // impossible to diagnose: every hypothesis about *what restarts the simulation* needs
    // to see restart/tick counts from inside the widget.
    //
    // Counts are always collected - they cost a increment per tick. Add ?debugSim=1 to the
    // widget URL to also draw them on screen, which is readable from a screenshot and so
    // works across the origin boundary.
    // ------------------------------------------------------------------------------------

    ns.DEBUG_SIM = /[?&]debugSim=1/.test(window.location.search);

    /** Per-panel lifecycle counters, keyed by panel name. */
    ns.simStats = {};

    /** showGraph call/outcome counters - a run that does not complete leaves a live simulation. */
    ns.showGraphRuns = { calls: 0, completed: 0, bailed: 0, lastError: null };

    /**
     * Count restart/stop/tick on a simulation so its lifecycle is observable.
     *
     * @param {string} name panel name
     * @param {object} sim d3 force simulation
     */
    ns.instrumentSim = function (name, sim) {
        if (!sim || sim.__instrumented) {
            return sim;
        }

        const stats = { ticks: 0, manualTicks: 0, restarts: 0, stops: 0, created: (ns.simStats[name] || {}).created + 1 || 1 };
        ns.simStats[name] = stats;

        const originalRestart = sim.restart;
        const originalStop = sim.stop;
        const originalTick = sim.tick;

        sim.restart = function () {
            stats.restarts += 1;
            return originalRestart.apply(sim, arguments);
        };
        sim.stop = function () {
            stats.stops += 1;
            return originalStop.apply(sim, arguments);
        };
        // simulation.tick() advances alpha without dispatching the "tick" event, so a direct
        // caller is invisible to the listener below. Count it separately - the difference
        // between manualTicks and ticks is exactly "who is advancing this simulation".
        sim.tick = function () {
            stats.manualTicks += 1;
            return originalTick.apply(sim, arguments);
        };

        // Namespaced listener so it cannot clobber the panel's own "tick" handler, which
        // settle() looks up as sim.on("tick").
        sim.on("tick.simstats", function () {
            stats.ticks += 1;
        });

        sim.__instrumented = true;
        console.log(`ForceGraph.instrumentSim: ${name} instrumented (simulation #${stats.created})`);
        return sim;
    };

    /** Draw the counters on screen. Only called when ?debugSim=1. */
    ns.renderSimDebug = function () {
        let el = document.getElementById("sim-debug-readout");
        if (!el) {
            el = document.createElement("div");
            el.id = "sim-debug-readout";
            el.setAttribute("style",
                "position:fixed;top:0;right:0;z-index:99999;background:rgba(0,0,0,.82);color:#0f0;" +
                "font:11px/1.35 monospace;padding:6px 8px;white-space:pre;pointer-events:none;");
            document.body.appendChild(el);
        }

        const lines = Object.keys(ns.simStats).map(function (name) {
            const s = ns.simStats[name];
            const panelNs = window.Widgets.Panel[name];
            const sim = panelNs && (panelNs.promotable_sim || panelNs.scratch_sim);
            const alpha = sim && typeof sim.alpha === "function" ? sim.alpha().toFixed(4) : "?";
            const target = sim && typeof sim.alphaTarget === "function" ? sim.alphaTarget() : "?";
            return `${name}: a=${alpha} tgt=${target} inst=${!!(sim && sim.__instrumented)} settle ${s.settleFrom}->${s.settleTo} evt=${s.ticks} man=${s.manualTicks} rst=${s.restarts} stp=${s.stops} sims=${s.created}`;
        });

        const r = ns.showGraphRuns;
        const header = `showGraph calls=${r.calls} completed=${r.completed} bailed=${r.bailed}` +
            (r.lastError ? ` lastError=${r.lastError}` : "");

        el.textContent = "sim debug\n" + header + "\n" + (lines.join("\n") || "(no simulations)");
    };

    ns.startSimDebug = function () {
        if (!ns.DEBUG_SIM || ns.simDebugTimer) {
            return;
        }
        console.log("ForceGraph: ?debugSim=1 present, drawing simulation counters");
        ns.simDebugTimer = window.setInterval(ns.renderSimDebug, 250);
    };

    /**
     * Does this node carry an authored layout position?
     *
     * panel.promo.js has two simulation modes: a positioned layout driven by
     * node.positionX/positionY, and a plain centred force graph. The positioned mode is only
     * usable when something has supplied those coordinates - with them undefined, forceX/forceY
     * resolve to NaN and the nodes are flung outside the visible panel, which reads as an empty
     * Promotable panel.
     *
     * @param {object} node graph node
     * @returns {boolean} true when the node has usable coordinates
     */
    ns.hasLayoutPosition = function (node) {
        return (
            node &&
            typeof node.positionX === "number" &&
            !isNaN(node.positionX) &&
            typeof node.positionY === "number" &&
            !isNaN(node.positionY)
        );
    };

    /**
     * Measure a panel so layout can be expressed in real pixels.
     *
     * panelUtilsNs.options.width/height are the CSS strings "100%", so the centred branch in
     * panel.promo.js computes d3.forceCenter("100%" / 2, ...) - NaN - and collapses every node
     * into a corner. Measuring the rendered SVG gives numbers that actually work.
     *
     * @param {string} selector panel SVG selector
     * @returns {{width: number, height: number}} measured size, falling back to sane defaults
     */
    ns.measurePanel = function (selector) {
        const svg = document.querySelector(selector);
        const box = svg && svg.getBoundingClientRect();
        const width = box && box.width ? box.width : 800;
        const height = box && box.height ? box.height : 280;

        // Logged because layout faults here are otherwise invisible: the graph simply appears in
        // the wrong place. Comparing this measurement against the panel size once the page has
        // settled is what tells you whether the centre was computed too early.
        console.log(
            `ForceGraph.measurePanel: ${selector} -> ${Math.round(width)}x${Math.round(height)}` +
            (box && box.height ? "" : " (FALLBACK - element not measurable yet)")
        );

        if (!box || !box.height) {
            console.warn(`ForceGraph.measurePanel: could not measure ${selector}, using fallback`);
        }
        return { width: width, height: height };
    };

    /**
     * Resize a panel's SVG to match the panel it lives in.
     *
     * panel.promo.js creates its SVG once during init with fixed pixel attributes taken from the
     * panel's size at that moment (`.attr('width', $component.width())`). Nothing updates them
     * afterwards, so when the panel ends up a different size - which it does inside the CMS
     * iframe, measured at panel 759x466 versus svg 841x283 - the SVG stays stale. Everything
     * below the stale height is clipped, and any layout measured from the SVG is anchored against
     * the wrong box.
     *
     * Syncing here keeps the fix in one place rather than reworking each panel's init.
     *
     * @param {string} panelSelector selector for the panel element
     * @returns {{width: number, height: number}|null} the panel size, or null if unavailable
     */
    ns.syncSvgToPanel = function (panelSelector) {
        const panel = document.querySelector(panelSelector);
        const svg = panel && panel.querySelector("svg");
        if (!panel || !svg) {
            return null;
        }

        const box = panel.getBoundingClientRect();
        if (!box.width || !box.height) {
            return null;
        }

        const width = Math.round(box.width);
        const height = Math.round(box.height);
        const currentWidth = Math.round(svg.getBoundingClientRect().width);
        const currentHeight = Math.round(svg.getBoundingClientRect().height);

        if (currentWidth === width && currentHeight === height) {
            // Cache here too: this is the common path once the panel has settled, and the clamp
            // would otherwise never see a refreshed size.
            ns.panelBounds[panelSelector] = { width: width, height: height };
            return { width: width, height: height };
        }

        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        console.log(
            `ForceGraph.syncSvgToPanel: ${panelSelector} svg ${currentWidth}x${currentHeight} ` +
            `-> ${width}x${height} (panel size)`
        );

        // The per-tick clamp reads these rather than measuring, so refresh them wherever the panel
        // size is established or changes (docs/issues/0065).
        ns.panelBounds[panelSelector] = { width: width, height: height };
        return { width: width, height: height };
    };

    /**
     * Cached panel bounds, so the per-tick clamp does not force a layout read 60 times a second.
     *
     * Refreshed by syncSvgToPanel, which already runs whenever the panel is drawn or resized -
     * so the cache cannot go stale in the one way that would matter.
     */
    ns.panelBounds = {};

    /**
     * Keep every node inside its panel.
     *
     * ⚠️ Nothing used to do this. applyLayout anchors nodes to the panel centre and lets the charge
     * and collide forces spread them out, and with ~29 Promotable nodes that spread runs past the
     * panel edges - measured at y = -46.68 (above the panel) and y = 386.6 (below it). A node out
     * there is invisible until the user thinks to pan, on a panel whose whole job is to show what is
     * available to work with (alpha-launch docs/issues/0065).
     *
     * ⚠️ This is *not* the fault behind docs/issues/0056 and 0058, which were both "the panel measured
     * its size once and never re-measured". syncSvgToPanel already fixed that, and it runs first here.
     * This is a separate, simpler gap: no containment at all.
     *
     * Clamping `d.x`/`d.y` rather than the rendered attributes keeps nodes, links and edge paths
     * consistent - they all read from the same coordinates in the tick handler.
     *
     * @param {Array<object>} nodes simulation nodes, mutated in place
     * @param {string} panelSelector selector for the panel element
     * @param {number} iconSize rendered node size, so a node is clamped by its edge not its centre
     * @returns {number} how many nodes had to be moved
     */
    ns.clampNodesToPanel = function (nodes, panelSelector, iconSize) {
        if (!nodes || !nodes.length) {
            return 0;
        }

        let bounds = ns.panelBounds[panelSelector];
        if (!bounds) {
            bounds = ns.syncSvgToPanel(panelSelector);
            if (!bounds) {
                return 0;
            }
            ns.panelBounds[panelSelector] = bounds;
        }

        // ⚠️ Clamp against the SVG's **rendered** box, not the panel's. syncSvgToPanel sets the svg's
        // width/height *attributes* from the panel, but CSS (the `max-width/height: 100%` clipping
        // added for docs/issues/0058) can render it smaller — measured panel 569x360 against svg
        // 567x358. Two pixels, but they are two pixels a node can sit in and be unclickable.
        const svg = document.querySelector(panelSelector + " svg");
        const svgBox = svg && svg.getBoundingClientRect();
        if (svgBox && svgBox.width && svgBox.height) {
            bounds = { width: Math.min(bounds.width, svgBox.width), height: Math.min(bounds.height, svgBox.height) };
        }

        // Keep the drawn square inside the panel, not the node's centre — and the drawn square is
        // **`iconSize + 5`**, not `iconSize`. The panes render
        //     .attr('x', d.x - iconSize / 2).attr('width', iconSize + 5)
        // so the box runs from `d.x - iconSize/2` to `d.x + iconSize/2 + 5`. A symmetric
        // `iconSize / 2` margin therefore holds the left and top edges in but lets the right and
        // bottom edges hang 5px over — measured 2026-08-10 as 3 of 38 Promotable nodes overhanging
        // while 0 were unclickable, which is exactly that 5px (alpha-launch docs/issues/0065).
        //
        // The bounds are asymmetric for the same reason. Clamping is cheap; being 5px wrong in the
        // direction of "node half off the edge" is the whole point of the function.
        const size = iconSize || 40;
        const drawn = size + 5;
        const minX = size / 2;
        const minY = size / 2;
        const maxX = Math.max(minX, bounds.width - (drawn - size / 2));
        const maxY = Math.max(minY, bounds.height - (drawn - size / 2));

        let moved = 0;
        const clampedToEdge = [];
        nodes.forEach(function (node) {
            if (typeof node.x !== "number" || typeof node.y !== "number") {
                return;
            }
            const x = Math.max(minX, Math.min(maxX, node.x));
            const y = Math.max(minY, Math.min(maxY, node.y));
            if (x !== node.x || y !== node.y) {
                node.x = x;
                node.y = y;
                moved += 1;
            }
            // Remember which nodes ended up ON a horizontal edge - they are the ones that stack.
            if (y === minY || y === maxY) {
                clampedToEdge.push(node);
            }
        });

        // ⚠️ alpha-launch docs/issues/0078 - clamping is MANY-TO-ONE: every out-of-range y maps onto
        // the same minY (or maxY), so the more nodes the simulation pushes out, the more land on the
        // identical coordinate and cover each other. Measured 2026-08-11: 6 of 58 Promotable nodes
        // were unclickable, every one at y=1 or y=319 - exactly these two values. The node on top
        // takes the pointer ("<image id=...> intercepts pointer events") and the one beneath cannot
        // be selected at all.
        //
        // 0065's fix stopped nodes being drawn OUTSIDE the pane; this stops the ones it pulled back
        // in from landing on top of each other. Containment still wins: nothing here moves a node
        // out of [minX, maxX], so P3-S1's containment invariant is unaffected.
        const byEdge = {};
        clampedToEdge.forEach(function (node) {
            const key = String(node.y);
            (byEdge[key] = byEdge[key] || []).push(node);
        });
        Object.keys(byEdge).forEach(function (key) {
            const row = byEdge[key].sort(function (a, b) {
                return a.x - b.x;
            });
            if (row.length < 2) {
                return;
            }
            // Spread left-to-right, then, if the edge runs out of room, pack back from the right.
            // A pass in one direction alone piles the overflow onto maxX - which is the same defect.
            for (let i = 1; i < row.length; i++) {
                const wanted = row[i - 1].x + drawn;
                if (row[i].x < wanted && wanted <= maxX) {
                    row[i].x = wanted;
                    moved += 1;
                }
            }
            for (let i = row.length - 2; i >= 0; i--) {
                const limit = row[i + 1].x - drawn;
                if (row[i].x > limit && limit >= minX) {
                    row[i].x = limit;
                    moved += 1;
                }
            }
        });

        // ⚠️ alpha-launch docs/issues/0078, second pass. The spreading above separates clamped nodes
        // from EACH OTHER, which leaves two gaps that P3-S9 fell through:
        //
        //   1. `row.length < 2` returns early, so a node that is the ONLY one on its edge is never
        //      considered - yet it can still land on an interior node.
        //   2. Even when spread, a node slid along the edge can come to rest on top of a nearby
        //      INTERIOR node, which the row grouping never looks at.
        //
        // The measured failure was exactly (2): identity--1c0f9a52 at y=302.97 (interior) covered by
        // relationship--c787f6b9 at y=318 (clamped to maxY). Collide cannot fix these - it runs
        // BEFORE the clamp each tick, so the clamp has the last word (negative result recorded in
        // panel.promo.js).
        //
        // So resolve each clamped node against EVERY node in the pane, not just its edge peers.
        // Bounded to a few passes: moving a node can land it on another, but looping until clean
        // risks never terminating on a crowded edge - better to improve and stop than to hang.
        const positioned = nodes.filter(function (n) {
            return n && typeof n.x === "number" && typeof n.y === "number";
        });
        const overlaps = function (node, other) {
            return other !== node && Math.abs(other.x - node.x) < drawn && Math.abs(other.y - node.y) < drawn;
        };
        // ⚠️ Counted SEPARATELY from `moved`, and deliberately not added to the return value.
        // `moved` means "how many nodes containment had to pull back in" - P3-S1 injects 4
        // out-of-bounds probes and asserts exactly that number. Folding de-overlap moves into it
        // made the function return 5 for 4 probes and turned P3-S1 red. Two different jobs, two
        // different counters.
        let separated = 0;
        clampedToEdge.forEach(function (node) {
            for (let pass = 0; pass < 4; pass++) {
                let hit = null;
                for (let i = 0; i < positioned.length; i++) {
                    if (overlaps(node, positioned[i])) {
                        hit = positioned[i];
                        break;
                    }
                }
                if (!hit) {
                    return;
                }
                // Slide away along x, and if that would leave the panel, try the other side.
                // Containment still wins: nothing here moves a node out of [minX, maxX], so
                // P3-S1's containment invariant is unaffected.
                const away = node.x >= hit.x ? 1 : -1;
                let target = hit.x + away * drawn;
                if (target > maxX || target < minX) {
                    target = hit.x - away * drawn;
                }
                target = Math.max(minX, Math.min(maxX, target));
                if (target === node.x) {
                    return; // no room on this edge; leave it rather than oscillate
                }
                node.x = target;
                separated += 1;
            }
        });
        if (separated) {
            ns.separatedLast = (ns.separatedLast || {});
            ns.separatedLast[panelSelector] = separated;
        }
        return moved;
    };

    /**
     * Give every promo node a usable layout position.
     *
     * panel.promo.js drives forceX/forceY from node.positionX/positionY. `/viz-data/unattached-split`
     * returns nodes without those fields, which resolves to NaN and throws the graph off-canvas -
     * this is why Promotable looked empty while Scratch Pad, which does not use those forces,
     * rendered correctly.
     *
     * Nodes that already carry coordinates - should the API ever supply the annotation-based
     * layout the old local helper used to compute - are left untouched. The rest are anchored to
     * the centre of the panel, letting the existing charge and collide forces spread them out.
     *
     * @param {object} promo promo side of the split
     * @returns {number} how many nodes were given a position
     */
    ns.applyLayout = function (promo) {
        const nodes = (promo && promo.nodes) || [];
        if (!nodes.length) {
            return 0;
        }

        const panel = ns.measurePanel("#promo_panel svg");
        const centreX = panel.width / 2;
        const centreY = panel.height / 2;

        let positioned = 0;
        nodes.forEach(function (node) {
            if (ns.hasLayoutPosition(node)) {
                node.positionAnchored = false;
                return;
            }
            node.positionX = centreX;
            node.positionY = centreY;
            // alpha-launch docs/issues/0171 — mark this as a FALLBACK anchor, not authored data.
            //
            // The comment above says these are anchored to the centre "letting the existing charge
            // and collide forces spread them out" — but panel.promo.js pins positionX/positionY with
            // forceX/forceY at STRENGTH 1, which is absolute. Charge cannot spread anything against
            // it, so all N unpositioned nodes sat on the one coordinate and the Promotable pane
            // rendered a small dense blob (measured: 8 nodes, cluster 197x210 in a 456x398 pane,
            // 23% fill, ~130px dead margin each side). The implementation defeated its own intent.
            //
            // Marking the anchor lets panel.promo.js pin AUTHORED coordinates exactly, as it must,
            // while letting fallback ones be a gentle hint the other forces can work against.
            node.positionAnchored = true;
            positioned += 1;
        });

        // The positioned branch is the one that works once coordinates are real numbers; the
        // centred branch is unusable while options.width is a CSS string.
        if (panelUtilsNs.options) {
            panelUtilsNs.options.promoSim = true;
        }

        console.log(
            `ForceGraph.applyLayout: anchored ${positioned} of ${nodes.length} promo node(s) ` +
            `to ${Math.round(centreX)},${Math.round(centreY)}`
        );
        return positioned;
    };

    /**
     * Render both force-graph panels from a promo/scratch split.
     *
     * @param {object} [split] the split to draw; defaults to whatever processGraphData stored
     */
    ns.showGraph = function (split) {
        console.group(`Widgets.Panel.ForceGraph.showGraph on ${window.location}`);
        ns.showGraphRuns.calls += 1;
        let completed = false;

        try {
            const data = split || panelUtilsNs.split;

            if (!data || !data.promo || !data.scratch) {
                console.warn("ForceGraph.showGraph: no promo/scratch split to draw", data);
                return;
            }

            // The panel renderers read from panelUtilsNs.split rather than taking an argument,
            // so make sure it reflects what we were asked to draw.
            panelUtilsNs.split = data;

            // Bring each SVG up to its panel's current size before anything measures or draws,
            // otherwise the layout is anchored against a stale box and clipped by it.
            ns.syncSvgToPanel("#promo_panel");
            ns.syncSvgToPanel("#scratch_panel");

            ns.applyLayout(data.promo);

            // Draw both panels independently - one failing should not take the other down.
            // The panel namespaces are resolved here rather than captured when this file loads:
            // the build concatenates src/js/**/*.js alphabetically, so panel.promo.js and
            // panel.scratch.js are still undefined at that point.
            ns.drawPanel("Promo", window.Widgets.Panel.Promo);
            ns.drawPanel("Scratch", window.Widgets.Panel.Scratch);

            // Instrument before settling so settle()'s own stop() is counted, and so any later
            // restart() - from a drag, a redraw, or something unaccounted for - is attributable.
            ns.instrumentSim("Promo", (window.Widgets.Panel.Promo || {}).promotable_sim);
            ns.instrumentSim("Scratch", (window.Widgets.Panel.Scratch || {}).scratch_sim);
            ns.startSimDebug();

            // Settle both layouts synchronously - see settle() for why waiting on the animation
            // timer is not enough.
            ns.settle("Promo", window.Widgets.Panel.Promo, "promotable_sim");
            ns.settle("Scratch", window.Widgets.Panel.Scratch, "scratch_sim");
            completed = true;

        } catch (error) {
            ns.showGraphRuns.lastError = String(error && error.message || error).slice(0, 90);
            console.error("ForceGraph.showGraph failed", error);
        } finally {
            if (completed) {
                ns.showGraphRuns.completed += 1;
            } else {
                // A run that does not reach settle() leaves the simulation it just restarted
                // running with no one to stop it - see docs/issues/0016.
                ns.showGraphRuns.bailed += 1;
                console.warn(`ForceGraph.showGraph did not complete (${ns.showGraphRuns.bailed} so far) - a simulation may be left running`);
            }
            console.groupEnd();
        }
    };

    /** How many steps to run when settling a layout synchronously. */
    ns.SETTLE_TICKS = 150;

    /**
     * Run a panel's force simulation to a settled layout, synchronously.
     *
     * `showGraph()` ends with `simulation.alpha(1).restart()` and then relies on d3's animation
     * timer to do the work. Measured here, that timer never runs: alpha sat at exactly 1.000 for
     * seconds on end and every node stayed on its initial phyllotaxis position around the origin,
     * which is what made Promotable look like a small clump jammed against the top of the panel.
     *
     * The forces themselves are correct - stepping the same simulation by hand moved the nodes
     * from (7,0) to a proper spread across the panel, centred on the anchor. So rather than
     * depending on an animation frame that may never be delivered (background tabs and automated
     * browsers both throttle rAF), step the simulation to completion here. These graphs are small
     * - tens of nodes - so this costs a few milliseconds.
     *
     * Interaction is unaffected: dragging still calls alphaTarget().restart() as before.
     *
     * @param {string} name panel name, for logging
     * @param {object} panelNs panel namespace holding the simulation
     * @param {string} simProperty property on that namespace holding the d3 simulation
     */
    ns.settle = function (name, panelNs, simProperty) {
        const sim = panelNs && panelNs[simProperty];
        if (!sim || typeof sim.tick !== "function") {
            return;
        }

        const stats = ns.simStats[name];
        const alphaBefore = sim.alpha();
        const decay = typeof sim.alphaDecay === "function" ? sim.alphaDecay() : null;

        try {
            for (let i = 0; i < ns.SETTLE_TICKS; i++) {
                sim.tick();
            }

            if (stats) {
                stats.settleFrom = +alphaBefore.toFixed(4);
                stats.settleTo = +sim.alpha().toFixed(4);
                stats.alphaDecay = decay;
            }

            // simulation.tick() advances the layout but deliberately does NOT dispatch the "tick"
            // event, so the SVG still shows the pre-settle positions. Invoke the panel's own tick
            // handler once to paint the final result.
            const onTick = sim.on("tick");
            if (typeof onTick === "function") {
                onTick.call(sim);
            } else {
                console.warn(`ForceGraph.settle: ${name} has no tick handler, layout not painted`);
            }

            // Stop it so the (possibly never-running) timer cannot re-heat and undo this.
            if (typeof sim.stop === "function") {
                sim.stop();
            }
            console.log(
                `ForceGraph.settle: ${name} settled over ${ns.SETTLE_TICKS} ticks ` +
                `(alpha now ${sim.alpha().toFixed(3)})`
            );
            ns.reportOverlaps(name, typeof sim.nodes === "function" ? sim.nodes() : null);
        } catch (error) {
            console.error(`ForceGraph.settle: ${name} failed to settle`, error);
        }
    };

    /**
     * Report how many settled nodes still overlap another node.
     *
     * alpha-launch docs/issues/0078. An occluded node is not a cosmetic problem: the node on top
     * takes the pointer, so the one beneath cannot be selected at all, and P3-S9 failed on exactly
     * that ("<image id=...> intercepts pointer events", 30s timeout). Until this was measured, the
     * only symptom was a click that never landed - several layers away from the cause.
     *
     * Overlap is judged on the DRAWN box (iconSize + 5, as the panes render it), so this reports
     * what a user can actually click, not what the simulation intended.
     *
     * @param {string} name panel name, for logging
     * @param {Array<object>} nodes settled simulation nodes
     * @returns {number} count of nodes overlapped by at least one other
     */
    ns.reportOverlaps = function (name, nodes) {
        if (!nodes || !nodes.length) {
            return 0;
        }
        const drawn = (panelUtilsNs && panelUtilsNs.options && panelUtilsNs.options.iconSize ? panelUtilsNs.options.iconSize : 40) + 5;
        const positioned = nodes.filter(function (n) {
            return n && typeof n.x === "number" && typeof n.y === "number";
        });
        const occluded = new Set();
        let worst = null;
        for (let i = 0; i < positioned.length; i++) {
            for (let j = i + 1; j < positioned.length; j++) {
                const a = positioned[i];
                const b = positioned[j];
                const dx = Math.abs(a.x - b.x);
                const dy = Math.abs(a.y - b.y);
                if (dx < drawn && dy < drawn) {
                    occluded.add(a.id).add(b.id);
                    const gap = Math.max(dx, dy);
                    if (worst === null || gap < worst.gap) {
                        worst = { gap: Math.round(gap), a: a.id, b: b.id };
                    }
                }
            }
        }
        if (occluded.size) {
            console.warn(
                `ForceGraph.overlaps: ${name} has ${occluded.size}/${positioned.length} nodes overlapping ` +
                `(drawn ${drawn}px; tightest pair ${worst.gap}px apart: ${worst.a} / ${worst.b}) - docs/issues/0078`
            );
        } else {
            console.log(`ForceGraph.overlaps: ${name} clean - 0/${positioned.length} nodes overlap`);
        }
        return occluded.size;
    };

    /**
     * Invoke one panel's renderer, isolating its failures.
     *
     * @param {string} name panel name, for logging
     * @param {object} panelNs the panel namespace, expected to expose showGraph()
     */
    ns.drawPanel = function (name, panelNs) {
        if (!panelNs || typeof panelNs.showGraph !== "function") {
            console.error(`ForceGraph.drawPanel: ${name} panel has no showGraph()`);
            return;
        }
        try {
            panelNs.showGraph();
        } catch (error) {
            console.error(`ForceGraph.drawPanel: ${name} panel failed to draw`, error);
        }
    };

})(
    window.jQuery,
    window.Widgets.Panel.ForceGraph,
    window.Widgets.Panel.Utils,
    document,
    window
);
