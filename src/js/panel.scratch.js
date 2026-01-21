// panel.scratch.js
//define context menu functions
window.Widgets.Panel.Scratch = {}

;(function ($, ns, d3, panelUtilsNs, eventsNs, document, window) {

    ns.selectorComponent = '#scratch_panel';

    ns.options = {};

    

    ns.menuItems = [
        {
            label: "Create SRO",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => {
                const contextData = panelUtilsNs.getContentMenuData();
                console.log("raising event to open create Force SRO form", contextData);
                console.log("panelUtilsNs.selection", panelUtilsNs.selection);

                if (panelUtilsNs.selection.count() == 2) {

                    const formId = "create-force-sro";
                    const eventName = "viz-open-form-" + formId;
                    const config = formId;
                    const action = "BUTTON_CLICK";
                    const formData = {
                        formId: formId,
                        eventName: eventName,
                        action: action,
                        config: config,
                        data: panelUtilsNs.selection.list,
                    };
                    console.log("compileEventData", formData, eventName, action, formId, config);
                
                    const data = eventsNs.compileEventData(formData, eventName, action, formId, config);
                
                    console.log(`event raise ${eventName}`, data);
                    eventsNs.raiseEvent(eventName, data);
                    console.log(`event raised ${eventName}`);
                    console.groupEnd();

                } else {
                    console.error("Two objects must be selected");
                }
            },
        },
        {
            label: "Create Connection",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => {
                const contextData = panelUtilsNs.getContentMenuData();
                console.log("raising event to open create Force Connection form", contextData);
                console.log("panelUtilsNs.selection", panelUtilsNs.selection);

                if (panelUtilsNs.selection.count() == 2) {

                    const formId = "create-force-connection";
                    const eventName = "viz-open-form-" + formId;
                    const config = formId;
                    const action = "BUTTON_CLICK";
                    const formData = {
                        formId: formId,
                        eventName: eventName,
                        action: action,
                        config: config,
                        data: panelUtilsNs.selection.list,
                    };
                    console.log("compileEventData", formData, eventName, action, formId, config);
                
                    const data = eventsNs.compileEventData(formData, eventName, action, formId, config);
                
                    console.log(`event raise ${eventName}`, data);
                    eventsNs.raiseEvent(eventName, data);
                    console.log(`event raised ${eventName}`);
                    console.groupEnd();

                } else {
                    console.error("Two objects must be selected");
                }
            },
        },
        {
            label: "Remove",
            icon: '<i class="fa-solid fa-broom"></i>',
            action: () => {
                const contextData = panelUtilsNs.getContentMenuData();
                console.log("raising event to open remove object", contextData);

                console.log("panelUtilsNs.selection", panelUtilsNs.selection);

                const formId = "remove-promo-sro";
                const eventName = "viz-open-form-" + formId;
                const config = formId;
                const action = "BUTTON_CLICK";
                const formData = {
                    formId: formId,
                    eventName: eventName,
                    action: action,
                    config: config,
                    data: contextData.data,
                };
                console.log("compileEventData", formData, eventName, action, formId, config);
            
                const data = eventsNs.compileEventData(formData, eventName, action, formId, config);
            
                console.log(`event raise ${eventName}`, data);
                eventsNs.raiseEvent(eventName, data);
                console.log(`event raised ${eventName}`);
                console.groupEnd();
            },
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
            .force("charge", d3.forceManyBody().strength(-20)) // This adds repulsion (if it's negative) between nodes. 
            .force("center", d3.forceCenter(ns.options.width / 2, ns.options.height / 2)); // This force attracts nodes to the center of the svg area

        console.groupEnd();

    };

    ns.showGraph = function() {
        console.group(`Widgets.Panel.Scratch.showGraph on ${window.location}`);

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
        if (!event.active) ns.scratch_sim.alphaTarget(0.9);
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