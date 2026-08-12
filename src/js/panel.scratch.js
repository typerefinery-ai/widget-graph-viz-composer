// panel.scratch.js
//define context menu functions
window.Widgets.Panel.Scratch = {}

;(function ($, ns, d3, panelUtilsNs, eventsNs, document, window) {

    ns.selectorComponent = '#scratch_panel';

    ns.options = {};

    /**
     * Clear scratch force-graph DOM elements before loading new data
     */
    ns.clearData = function() {
        console.log("Clearing scratch force-graph DOM");

        if (!ns.scratch_svg_root) {
            console.warn("scratch_svg_root not initialized, skipping clear");
            return;
        }

        ns.scratch_svg_root.selectAll('.slinks').remove();
        ns.scratch_svg_root.selectAll('.sedgepath').remove();
        ns.scratch_svg_root.selectAll('.sedgelabel').remove();
        ns.scratch_svg_root.selectAll('.snodes').remove();
        // docs/issues/0159 — the node labels must be torn down with everything else.
        //
        // ⚠️ Measured while adding them: omitting this line left the previous generation of labels in
        // the DOM, and the pane re-renders on each load event, so a fresh set was drawn over the old
        // one. Two generations settle at different positions, and the result reads as interleaved
        // nonsense — `Sockmalwarection` — which looks like a font or collision problem and is neither.
        // Every class this panel creates has to appear in this teardown; a new one is easy to forget.
        ns.scratch_svg_root.selectAll('.snode-label').remove();
        ns.scratch_svg_root.selectAll('#scratch_node_labels').remove();

        if (ns.scratch_sim) {
            ns.scratch_sim.stop();
            ns.scratch_sim = null;
        }
    };

    ns.menuItems = [
        {
            label: "Create SRO",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => {
                // Delegate to the Promo panel's implementation. Both panels operate on the SAME
                // shared selection tracker (panelUtilsNs.selection), so the action is identical
                // wherever the user right-clicks - which is the point: this panel used to carry
                // its own simplified copy that skipped the relationship-types lookup and sent the raw selection
                // array instead of {object:{source_ref,target_ref,...}}, so its modal opened
                // completely empty. That divergence is what os-threat#93 was reporting.
                // See alpha-launch docs/issues/0015.
                window.Widgets.Panel.Promo.actionCreateSRO();
            },
        },
        {
            label: "Create Connection",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => {
                // Delegate to the Promo panel's implementation. Both panels operate on the SAME
                // shared selection tracker (panelUtilsNs.selection), so the action is identical
                // wherever the user right-clicks - which is the point: this panel used to carry
                // its own simplified copy that skipped the connection-types lookup and sent the raw selection
                // array instead of {object:{source_ref,target_ref,...}}, so its modal opened
                // completely empty. That divergence is what os-threat#93 was reporting.
                // See alpha-launch docs/issues/0015.
                window.Widgets.Panel.Promo.actionCreateConnection();
            },
        },
        {
            label: "Remove",
            icon: '<i class="fa-solid fa-broom"></i>',
            // Same path as Promo — one implementation, so the two panes cannot drift again the way
            // Create SRO / Create Connection did (alpha-launch docs/issues/0015).
            action: () => window.Widgets.Panel.Promo.actionRemoveObject(),
        },
    ];


    
    ns.simGraph = function() {
        console.group(`Widgets.Panel.Scratch.simGraph on ${window.location}`);

        if (!panelUtilsNs.split || !panelUtilsNs.split.scratch || !panelUtilsNs.split.scratch.edges) {
            console.error('No data to show');
            console.groupEnd();            
            return
        }

        console.log("panelUtilsNs.split.scratch.nodes->", panelUtilsNs.split.scratch.nodes);      
        
        // first the variables centreStrength
        ns.sforceNode = d3.forceManyBody();

        ns.sforceLink = d3
            .forceLink(panelUtilsNs.split.scratch.edges)
            .id(panelUtilsNs.getLinkId)
            .distance(4 * ns.options.iconSize);

        ns.sforceCentre = d3.forceCenter(
            ns.options.working_width / 2,
            ns.options.svg_height / 4,
        );
        

        if (ns.options.nodeStrength !== undefined) {
            ns.sforceNode.strength(ns.options.nodeStrength);
        }

        if (ns.options.linkStrength !== undefined) {
            ns.sforceLink.strength(ns.options.linkStrength);
        }

        if (ns.options.centreStrength !== undefined) {
            ns.sforceCentre.strength(ns.options.centreStrength);
        }

        ns.scratch_sim = d3
            .forceSimulation(panelUtilsNs.split.scratch.nodes)
            .force("link", d3.forceLink() // This force provides links between nodes
                            .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
                            .strength(20)
            ) 
            .force("charge", d3.forceManyBody().strength(-60)) // This adds repulsion (if it's negative) between nodes.
            .force("center", d3.forceCenter(ns.options.width / 2, ns.options.height / 2)) // This force attracts nodes to the center of the svg area
            /**
             * Keep Scratch nodes far enough apart that their LABELS are readable — docs/issues/0159.
             *
             * ⚠️ This pane had **no collide force at all**, only `charge(-20)` and `center`, so its
             * nodes settled almost on top of one another. That was invisible while nodes were
             * unlabelled icons; the moment labels were added the pane rendered
             * `UsSoctbolised PtoduFanultce Team Lead` — five overlapping names, illegible.
             *
             * 🔑 **The fix is separation, not hiding.** The Overview's answer to the same problem was
             * `declutterLabels()` — drop any label that would overlap one already drawn — which is
             * right for **28** nodes where spreading them is impossible. Scratch holds ~5 and
             * `image5.png` shows them **spread across the pane**, so spacing them is both achievable
             * and what the design actually depicts; hiding names would defeat the point of adding them.
             *
             * Radius is `iconSize * 2` rather than `iconSize` (the Overview's value, docs/issues/0155):
             * a node's footprint here includes the text under it, so an icon-sized radius still let
             * labels touch. At radius 70 the centres end up ≥140px apart, which clears a label of up
             * to ~140px — comfortably more than the 28-character cap `nodeLabel` applies.
             *
             * ⚠️ **`collide` does the work; do not reach for a big charge.** Measured while building
             * this: raising `charge` from -20 to **-400** to spread the nodes threw two of the five
             * *outside the pane's visible area* (docs/issues/0065's failure mode) and still left two
             * labels overlapping. Charge is nudged -20 → -60 only to help the layout settle apart;
             * the guaranteed minimum spacing comes from the collide radius, which cannot overshoot.
             *
             * ⚠️ If Scratch ever holds many more objects, spacing alone will stop being enough and
             * this should gain the Overview's declutter pass rather than an ever-larger radius.
             */
            .force("collide", d3.forceCollide(ns.options.iconSize * 2));

        console.groupEnd();

    };

    ns.showGraph = function() {
        console.group(`Widgets.Panel.Scratch.showGraph on ${window.location}`);

        ns.clearData();

        if (!panelUtilsNs.split || !panelUtilsNs.split.scratch || !panelUtilsNs.split.scratch.edges) {
            console.error('No data to show');
            console.groupEnd();            
            return
        }

        if (!ns.scratch_sim) {
            console.warn('Simulation not found, creating new one');
            ns.simGraph(); 
        }


        console.log("panelUtilsNs.split.scratch.nodes->", JSON.stringify(panelUtilsNs.split.scratch.nodes));
        console.log("panelUtilsNs.split.scratch.edges->", JSON.stringify(panelUtilsNs.split.scratch.edges));

        ns.scratchLink = ns.scratch_svg_root
            .selectAll('.slinks')
            .data(panelUtilsNs.split.scratch.edges)
            .join('line')
            .attr('class', 'slinks')
            .attr('source', (d) => d.source)
            .attr('target', (d) => d.target)
            .attr('stroke-width', 0.75)
            .attr('stroke', 'grey')
            .attr('marker-end', 'url(#sarrowhead)'); //The marker-end attribute defines the arrowhead or polymarker that will be drawn at the final vertex of the given shape.

        console.log("ns.scratchLink->", ns.scratchLink);

        ns.scratchEdgepaths = ns.scratch_svg_root
            .selectAll('.sedgepath') //make path go along with the link provide position for link labels
            .data(panelUtilsNs.split.scratch.edges)
            .join('path')
            .attr('class', 'sedgepath')
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', function(d, i) {
                return 'sedgepath' + i;
            })
            .style('pointer-events', 'none');

        console.log("ns.scratchEdgepaths->", ns.scratchEdgepaths);

        ns.scratchEdgelabels = ns.scratch_svg_root
            .selectAll('.sedgelabel')
            .data(panelUtilsNs.split.scratch.edges)
            .join('text')
            .style('pointer-events', 'none')
            .attr('class', 'sedgelabel')
            .attr('id', function(d, i) {
                return 'sedgelabel' + i;
            })
            .style('font-size', ns.options.edgeFontSize)
            .style('font-family', ns.options.edgeFontFamily)
            .attr('fill', panelUtilsNs.theme.edges);

        console.log("ns.scratchEdgelabels->", ns.scratchEdgelabels);

        ns.scratchEdgelabelsText = ns.scratchEdgelabels
            .append('textPath') //To render text along the shape of a <path>, enclose the text in a <textPath> element that has an href attribute with a reference to the <path> element.
            .attr('xlink:href', function(d, i) {
                return '#sedgepath' + i;
            })
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .attr('startOffset', '50%')
            .text((d) => d.name);

        console.log("ns.scratchEdgelabelsText->", ns.scratchEdgelabelsText);

        // for scratch
        ns.scratchNode = ns.scratch_svg_root
            .append('g')
            .selectAll('snodes')
            .data(panelUtilsNs.split.scratch.nodes)
            .join('image')
            .attr('class', 'snodes')
            .attr("id", (d) => d.id)
            .attr('xlink:href', function(d) {
                return (
                    ns.options.prefix + ns.options.shape + d.icon + '.svg'
                );
            })
            .attr('width', ns.options.iconSize + 5)
            .attr('height', ns.options.iconSize + 5)
            .attr('cursor', 'pointer')
            .attr('pointer-events', 'all')
            .on('mouseover.tooltip', panelUtilsNs.mouseover)
            .on("mousemove", panelUtilsNs.mousemove)
            .on("mouseout.tooltip", panelUtilsNs.mouseleave)
            .on('contextmenu', panelUtilsNs.contextmenu)
            .on('click', panelUtilsNs.leftclick)
    		.on('dblclick', ns.releasenode)  
            .call(
              d3
                .drag() //sets the event listener for the specified typenames and returns the drag behavior.
                .on('start', ns.dragstarted) //start - after a new pointer becomes active (on mousedown or touchstart).
                .on('drag', ns.dragged) //drag - after an active pointer moves (on mousemove or touchmove).
                .on('end', ns.dragended), //end - after an active pointer becomes inactive (on mouseup, touchend or touchcancel).
            );

        console.log("ns.scratchNode->", ns.scratchNode);

        /**
         * Name every Scratch object under its icon — alpha-launch docs/issues/0159.
         *
         * ⚠️ Scratch had **no text on screen at all**. Its objects are unconnected by definition, so
         * the pane's only `.text()` — an edge label on a `textPath` — never rendered anything, and
         * nodes were never labelled. `image5.png` shows all three Scratch objects named
         * (*Unauthorised Process*, *Socket Connection*, *malware*), so this was a plain
         * design-likeness gap, not a density trade-off: this pane holds ~5 objects and cannot collide.
         *
         * ⚠️ `pointer-events: none` is **required, not tidiness**. The label sits over the icon's
         * click target, and P3-S5 (*left-select opens that object's Update form*) is Act 3's headline
         * step — a label that swallowed the click would break it. The neighbouring pane already
         * intercepted Promo's clicks once (docs/issues/0058), so this failure mode is not theoretical.
         *
         * Appended AFTER the images so text draws on top, and positioned in the tick handler
         * alongside the icons.
         */
        ns.scratchNodeLabel = ns.scratch_svg_root
            .append('g')
            .attr('id', 'scratch_node_labels')
            .selectAll('text')
            .data(panelUtilsNs.split.scratch.nodes)
            .join('text')
            .attr('class', 'snode-label')
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .style('text-anchor', 'middle')
            .style('fill', panelUtilsNs.theme.svgName)
            .attr('font-size', panelUtilsNs.LABEL_PX)
            .text(panelUtilsNs.nodeLabel);

        console.log(
            'scratch node labels ->',
            panelUtilsNs.split.scratch.nodes.length,
            'node(s):',
            panelUtilsNs.split.scratch.nodes.map(panelUtilsNs.nodeLabel).join(' · '),
        );

        console.log("panelUtilsNs.split.scratch.nodes->",panelUtilsNs.split.scratch.nodes);
        console.log("panelUtilsNs.split.scratch.edges->",panelUtilsNs.split.scratch.edges);
        console.log("slinks->", ns.scratch_svg_root.selectAll('.slinks'));

        // ns.scratch_sim = d3
        //     .forceSimulation(panelUtilsNs.split.scratch.nodes)
        //     .force("x", d3.forceX(ns.options.width / 2)) 
        //     .force("y", d3.forceY(ns.options.height / 2))
        //     .force("link", d3.forceLink() // This force provides links between nodes
        //         .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
        //     )
        // ns.scratch_sim.stop()
        //     .tick(10)
            
            // set new nodes for simulation
            //.nodes(panelUtilsNs.split.scratch.nodes)
        
        ns.scratch_sim
            .nodes(panelUtilsNs.split.scratch.nodes)
            .on('tick', function() {
            // console.log("tick event",  ns.scratch_svg_root.selectAll('.slinks'));

                // Same containment as the Promotable panel — keep nodes inside their panel before
                // anything reads their coordinates (alpha-launch docs/issues/0065). Scratch holds
                // fewer nodes so it overflows less often, but the panel is smaller too.
                // `this.nodes()` for the same reason as the Promotable panel — the namespace's split
                // is reassigned on refresh, the simulation's array is not.
                window.Widgets.Panel.ForceGraph.clampNodesToPanel(
                    this.nodes(),
                    '#scratch_panel',
                    ns.options.iconSize
                );

                ns.scratch_svg_root
                    .selectAll('.slinks')
                    .attr('x1', function(d) { 
                        if (d.source && d.source.x) {
                         return d.source.x;
                        } else {
                            return 0;
                        }
                    })
                    .attr('y1', function(d) { 
                        if (d.source && d.source.y) {
                         return d.source.y;
                        } else {
                            return 0;
                        }
                    })
                    .attr('x2', function(d) { 
                        if (d.target && d.target.x) {
                         return d.target.x;
                        } else {
                            return 0;
                        }
                    })
                    .attr('y2', function(d) { 
                        if (d.target && d.target.y) {
                         return d.target.y;
                        } else {
                            return 0;
                        }
                    });
        
                ns.scratch_svg_root
                    .selectAll('.snodes')
                    .attr('x', function(d) { 
                        if (d.x && isNaN(d.x) === false) {
                         return d.x - ns.options.iconSize / 2;
                        } else {
                            return ns.options.iconSize / 2;
                        }
                    }) 
                    .attr('y', function(d) { 
                        if (d.y && isNaN(d.y) === false) {
                         return d.y - ns.options.iconSize / 2;
                        } else {
                            return ns.options.iconSize / 2;
                        }
                    })
        
                // docs/issues/0159 — keep each label under its own icon. Centred on the node's x
                // (text-anchor: middle) and offset below the icon's bottom edge, so it tracks the
                // node for the whole settling animation rather than only its final position.
                ns.scratch_svg_root
                    .selectAll('.snode-label')
                    .attr('x', function(d) {
                        return (d.x && isNaN(d.x) === false) ? d.x : ns.options.iconSize / 2;
                    })
                    .attr('y', function(d) {
                        const cy = (d.y && isNaN(d.y) === false) ? d.y : ns.options.iconSize / 2;
                        return cy + ns.options.iconSize / 2 + panelUtilsNs.LABEL_GAP_PX;
                    })

                ns.scratch_svg_root.selectAll('.sedgepath').attr(
                    'd',
                    function(d) {

                        if (d.source && d.target
                            && d.source.x && d.source.y
                            && d.target.x && d.target.y) {

                        return (
                            'M ' +
                            d.source.x +
                            ' ' +
                            d.source.y +
                            ' L ' +
                            d.target.x +
                            ' ' +
                            d.target.y
                        );
                        } else {
                            return 'M 0 0 L 0 0';
                        }
                    },
                );
            }); //use simulation.on to listen for tick events as the simulation runs.

        // This function is run at each iteration of the force algorithm, updating the nodes position (the nodes data array is directly manipulated).
        // ns.scratch_sim.force("link")
        //     .links(panelUtilsNs.split.scratch.edges)
        //     .distance(function() {return 6 * ns.options.iconSize;});

        ns.scratch_sim.alpha(1).restart();

        //create zoom handler  for each
        // ns.zoom_handler = d3.zoom().on('zoom', function(event, d) { 
        //     ns.scratch_svg_root.attr('transform', event.transform);
        // });


        console.groupEnd();
        
    };


    //The simulation is temporarily “heated” during interaction by setting the target alpha to a non-zero value.
    ns.dragstarted = function(event, d) {
        if (!event.active) {
            ns.scratch_sim.alphaTarget(0.3).restart(); //sets the current target alpha to the specified number in the range [0,1].
        }
        d.fy = d.y; //fx - the node’s fixed x-position. Original is null.
        d.fx = d.x; //fy - the node’s fixed y-position. Original is null.
    }

    //When the drag gesture starts, the targeted node is fixed to the pointer
    ns.dragged = function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    //the targeted node is released when the gesture ends
    ns.dragended = function(event, d) {
        if (!event.active) {
            ns.scratch_sim.alphaTarget(0);
        }
        d.fx =  d.x; // null;
        d.fy =  d.y; // null;
    }

    // release the node position when doubl-click has been sent
    ns.releasenode = function (event, d) {
        console.group(`Widgets.Panel.Scratch.releaseNode on ${window.location}`);
        console.log('================= release node ==========')
        console.log('d.fx  ',d.fx, ' d.fy ',d.fy)
        console.log('d.x  ',d.x, ' d.y ',d.y)
        d3.select(this).classed("fixed", d.fixed = false);
            d.fx = null;
            d.fy = null;
        // See Promo.releasenode - alphaTarget is what alpha decays *towards*, so leaving it at
        // 0.9 meant the simulation could never come to rest. Kick alpha once instead.
        if (!event.active) {
            ns.scratch_sim.alphaTarget(0).alpha(0.9);
            const forceGraphNs = window.Widgets.Panel.ForceGraph;
            if (forceGraphNs && typeof forceGraphNs.settle === "function") {
                forceGraphNs.settle("Scratch", ns, "scratch_sim");
            } else {
                console.warn("releasenode: ForceGraph.settle unavailable, layout will not re-settle");
            }
        }
    console.groupEnd();
    }


    ns.init = function($component, options) {
            
        console.group(`Widgets.Panel.Scratch.init on ${window.location}`);

        try {
            ns.$container = $component;

            //copy options into ns
            ns.options = Object.assign({}, options);

            ns.options.width = ns.$container.width();
            ns.options.height = ns.$container.height();

            // Theme selected by api
            panelUtilsNs.theme = panelUtilsNs.options.theme;

            ns.scratch_svg = d3
                .select($component.get(0))
                .append('svg')
                .attr('class', 'scratch_svg')
                .attr('id', 'scratch_svg')
                .attr('width', $component.width())
                .attr('height', $component.height())
                .attr('cursor', 'pointer')
                .attr('pointer-events', 'all')
                .style("background", panelUtilsNs.theme.scratchFill);


                // .append('g')

            // ns.scratch_rect = ns.scratch_svg
            //     .append('rect')
            //     .attr('id', 'scratch_rect')
            //     .attr('width', $component.width())
            //     .attr('height', $component.height())
            //     .attr('x', 0)
            //     .attr('y', 0)
            //     .attr('stroke', panelUtilsNs.theme.svgBorder)
            //     .attr('fill', panelUtilsNs.theme.fill);

            ns.scratch_label = ns.scratch_svg
                .append('g')
                .attr('id', 'scratch_label')
                .attr('transform', 'translate(' + 10 + ',' + 20 + ')')
                .append('text')
                .text('Scratch Pad')
                .style('fill', panelUtilsNs.theme.svgName);

            // Keep the SVG the size of its pane. This is the pane that was measured covering its
            // neighbour and intercepting Promo's clicks (alpha-launch docs/issues/0058).
            panelUtilsNs.observePanelResize($component, '#scratch_panel');

            ns.scratch_svg_zoom = ns.scratch_svg
                .call(
                    d3.zoom().on('zoom', function(event, d) {
                        ns.scratch_svg_root.attr('transform', event.transform);
                    }),
                )
                .attr('id', 'scratch_svg_zoom');

            ns.scratch_svg_root = ns.scratch_svg
                .append('g');


            ns.scratch_svg_defs = ns.scratch_svg_root
                .append('defs')
                .attr('id', 'scratch_svg_defs')
                .append('marker')            
                .attr('id', 'sarrowhead')
                .attr('viewBox', '-0 -5 10 10') //the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
                .attr('refX', ns.options.iconSize*1.25) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 10)
                .attr('markerHeight', 10)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', ns.options.checkColour)
                .style('stroke', 'none');

            ns.$svg = $component.find('svg');
            //add context menu
            ns.$svg.simpleContextMenu({
                class: null,
                shouldShow: function () {
                    // const shouldShow = (panelUtilsNs.contentMenuItem == null || panelUtilsNs.contentMenuItem == undefined) ? false : true;
                    const shouldShow = !!panelUtilsNs.contentMenuItem;
                    // console.log("context menu should show item shouldShow ", shouldShow, panelUtilsNs.contentMenuItem);
                    return shouldShow;
                },
                heading: function () {
                    return panelUtilsNs.contentMenuItem ? panelUtilsNs.contentMenuItem.name : '';
                },
                onShow: function () {
                                
                    // console.log("context menu shown item: ", panelUtilsNs.contentMenuItem);
                    panelUtilsNs.contentMenuActive = true;

                    panelUtilsNs.hideTooltip();
        
                },
                onHide: function () {
                    panelUtilsNs.contentMenuActive = false;
                    // console.log("context menu hide", panelUtilsNs.contentMenuItem);
                },
                options: ns.menuItems,
            })

        } catch (error) {
            console.error("Error in panel.scratch.init", error);
        } finally {
            console.log("panel.scratch.init done");
            console.groupEnd();
        }

    }

})(window.jQuery, window.Widgets.Panel.Scratch, window.d3, window.Widgets.Panel.Utils, window.Widgets.Events, document, window)