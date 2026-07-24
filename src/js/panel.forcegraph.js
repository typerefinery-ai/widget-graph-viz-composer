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

        if (!box || !box.height) {
            console.warn(`ForceGraph.measurePanel: could not measure ${selector}, using fallback`);
        }
        return { width: width, height: height };
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
                return;
            }
            node.positionX = centreX;
            node.positionY = centreY;
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

        try {
            const data = split || panelUtilsNs.split;

            if (!data || !data.promo || !data.scratch) {
                console.warn("ForceGraph.showGraph: no promo/scratch split to draw", data);
                return;
            }

            // The panel renderers read from panelUtilsNs.split rather than taking an argument,
            // so make sure it reflects what we were asked to draw.
            panelUtilsNs.split = data;

            ns.applyLayout(data.promo);

            // Draw both panels independently - one failing should not take the other down.
            // The panel namespaces are resolved here rather than captured when this file loads:
            // the build concatenates src/js/**/*.js alphabetically, so panel.promo.js and
            // panel.scratch.js are still undefined at that point.
            ns.drawPanel("Promo", window.Widgets.Panel.Promo);
            ns.drawPanel("Scratch", window.Widgets.Panel.Scratch);
        } catch (error) {
            console.error("ForceGraph.showGraph failed", error);
        } finally {
            console.groupEnd();
        }
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
