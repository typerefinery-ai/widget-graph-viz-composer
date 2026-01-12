// NOTE: All ticket updates must be managed via the .tasks/ folder. See README and project rules for details.

// panel._uitils.js
// panel common utils
window.Widgets.Panel = {};
window.Widgets.Panel.Utils = {};
window.Widgets.Notifications = window.Widgets.Notifications || {};
window.Widgets.Events = window.Widgets.Events || {};

;(function ($, ns, d3, eventsNs, notificationsNs, document, window) {


    //Graph class
    ns.Graph = class {
        constructor() {
        this.t = new Map();
        }
        getEdge(node1) {
            return this.t.get(node1);
        }
        addEdge(node1, node2) {
            const s = this.t.get(node1);
            if (s == null) {
                this.t.set(node1, new Set([node2]));
            } else {
                s.add(node2);
            }
        }
        getAdjacencies(node) {
            var z = this.t.get(node);
            if (z == null) {
                z = new Set();
            }
            return z;
        }
        *dir(node, path = Array(), visited = new Set()) {
            yield [...path, node];
            path.push(node);
            visited.add(node);
            for (const adj of this.getAdjacencies(node)) {
                if (!visited.has(adj)) {
                    yield* this.dir(adj, path, visited);
                }
            }
            path.pop();
        }
        *dirs(nodes) {
            for (const node of nodes) {
                yield* this.dir(node);
            }
        }
    }

    ns.options = {
        tree_data: {
            sighting: 'sighting',
            task: 'task',
            impact: 'impact',
            event: 'event',
            user: 'user',
            company: 'company',
            behavior: 'behavior',
            attackFlow: 'attack-flow',
        },    
        tree_data_default: 'sighting',
        duration: 350,
        radius: 6, // radius of curve for links
        barHeight: 40,
        margin: {
            top: 30,
            left: 30,
            bottom: 50,
            right: 30,
        },
        width: "100%",
        height: "100%",
        svg_spacing: 500,
        svg_height: "100%",
        // Icons
        prefix:
        'https://raw.githubusercontent.com/os-threat/images/main/img/',
        shape: 'rect-',
        iconSize: 35,
        textPadding: 8,
        corner: 5,
        // the tree view
        minHeight: 20,
        lineSpacing: 50,
        indentSpacing: 40,
        tooltipContent: 'json', //'summary' or 'json'
        itemFont: '18px',
        edgeFontSize: 12,
        edgeFontFamily: 'Arial, sans-serif',
        layout: {
            left: 20,
            top: 20,
            distanceX: 200,
            distanceY: 150
        },
        boxSize: 10,
        tree_edge_thickness: 0.75,
        graph_edge_thickness: 1,
        linkStrength: 200,
        nodeStrength: -100,
        centreStrength: 80,
        promoSim: true,
        scratchSim: true,
        theme: 'light',
        // API Configuration for Local Mode
        api: {
            // Local mode loads from local files, production uses events only
            // No baseUrl needed - local mode uses file:// URLs or relative paths
            endpoints: {
                tree: "/viz-data/tree-",
                graph: "/viz-data/unattached-force-graph"
            },
            timeout: 10000, // 10 seconds
            retryAttempts: 3
        },
        // Notification Configuration
        notifications: {
            enabled: true,
            duration: 5000,
            gravity: "top", // top, bottom
            position: "right", // left, center, right
            maxQueueSize: 10,
            showLoadingStates: true,
            showSuccessMessages: true,
            showErrorMessages: true,
            showWarningMessages: true,
            showInfoMessages: true
        },
        light_theme: {
            treeFill: 'white',
            scratchFill: 'blanchedalmond',
            promoFill: 'ivory',
            svgName: 'black',
            svgBorder: 'black',
            checkColour: 'gray',
            checkText: 'white',
            select: 'yellow',
            edges: 'black',
            tooltip: {
                fill: 'white', 
                stroke: '1px', 
                scolour: 'black', 
                corner: 5, 
                tcolour: 'black', 
                tsize: '11px', 
                padding: '5px',
                maxwidth: '900px',
                overflow: 'auto'
            },
        },
        dark_theme: {
            treeFill: '#555555',
            scratchFill: 'gray',
            promoFill: 'dimgray',
            svgName: 'white',
            svgBorder: 'white',
            checkColour: 'white',
            checkText: 'gray',
            select: 'yellow',
            edges: 'white',
            tooltip: {
                fill: 'lightgray', 
                stroke: '1px', 
                scolour: 'white', 
                corner: 5, 
                tcolour: 'white', 
                tsize: '11px', 
                padding: '5px',
                maxwidth: '900px',
                overflow: 'auto'
            },
        },
    };

    ns.contentMenuActive = false;
    ns.contentMenuItem = false;


    // setup tracker for selection
    ns.selection = {
        list: [], // array of data objects
        ids: [], // array of id's matching the data objects
        ref: {}, // id reference to data object, for quick lookup of ref to list and ids
        max: 2, //posibly allow more selected items
        maxAction: "last", //add to bottom or top of array
        add: function(id, data) {
            if (this.maxAction === "last") {
                return this.popIn(id, data);
            } else {
                return this.shiftIn(id, data);
            }
        },
        remove: function(id, data) {
            const index = this.getIndexOf(id);
            if (index > -1) {
                this.list.splice(index, 1);
                this.ids.splice(index, 1);
                delete this.ref[id];
            }
            return index;
        },
        popIn: function(id, data) { // add to bottom and remove first
            let removedData;
            let removedId;
            if (this.isFull()) {
                removedData = this.list.shift(); //remove first item
                removedId = this.ids.shift(); //remove first item
                //remove reference
                delete this.ref[removedId];
            }
            this.list.push(data); // add last item
            this.ids.push(id); // add last item

            //save id reference
            this.ref[id] = {
                d: this.list[this.list.length - 1],
                i: this.ids[this.ids.length - 1]
            }; 
            return removedData;
        },        
        shiftIn: function(id, data) { // add to top and remove last
            let removedData;
            let removedId;
            if (this.isFull()) {
                removedData = this.list.pop(); //remove last item
                removedId = this.ids.pop(); //remove last item
                //remove reference
                delete this.ref[removedId];
            }
            this.list.unshift(data); // add first item
            this.ids.unshift(id); // add first item
            //save id reference
            this.ref[id] = {
                d: this.list[0],
                i: this.ids[0]
            };
            return removedData;
        },
        clear: function() {
            this.list = [];
            this.ref = {};
        },
        isFull: function() {
            return this.ids.length === this.max;
        },
        has: function(id) {
            const hasRef = this.ref[id];
            if (hasRef === undefined) {
                return false;
            }
            const hasId = this.ids.includes(id);
            const hasData = this.list.includes(hasRef.d);

            if (hasId && hasData) {
                return true;
            } else {
                console.error("ERROR: selection data is out of sync");
                return false;
            }
        },
        count: function() {
            return this.ids.length;
        },
        getFirst: function() {
            return this.list[0];
        },
        getLast: function() {
            if (this.ids.length > 1) {
                return this.list[this.ids.length - 1];
            } 
            return
        },
        getIndexOf: function(id) {
            //get reference to the data object
            const data = this.ref[id];
            if (data === undefined) {
                return -1;
            }
            console.log("data->", data);
            //get the index of the data object
            return this.ids.indexOf(data.i);
        }
    };

    ns.leftclick = function(event, d) {
        console.group(`Widgets.Panel.Utils.leftclick on ${window.location}`);
        console.log("leftclick event->", event);
        console.log("leftclick d->", d);

        try {

            //raise event to load form for this content
            try {
                const formId = "embed-viz-event-open-stixorm-forms-object"; //d.type
                const formData = d.original;
                //read config from node
                const payloadOptions = {
                    "object_family": d.object_family,
                    "object_form": d.object_form,
                    "object_group": d.object_group,
                }
                if (formId) {
                    console.log('open form for type', formId, formData, payloadOptions)
                    ns.openForm(formId, formData, payloadOptions);
                }
            } catch (e) {
                console.error('could not get for type from Node', e);
            }
        
            const selected = d3.select(this)
            const id = d.id;
            const data = {
                id: id,
                element: selected,
                data: d,
                event: event,
            }

            const isAlreadySelected = ns.selection.has(id);

            console.log("isAlreadySelected->", isAlreadySelected);

            //unselect me if already selected
            if (isAlreadySelected) {
                ns.selection.remove(id, data);
                selected.classed("select-source", false);
                selected.classed("select-target", false);
                selected.classed("select-other", false);
            } else {
                //add me to selection and get back anything that was removed
                const removedData = ns.selection.add(id, data);
                // if we have removed data, then we need to deselect it
                const removedId = removedData ? removedData.id : null;
                if (removedId !== null) {
                    const removedElement = removedData.element;
                    removedElement.classed("select-source", false);
                    removedElement.classed("select-target", false);
                    removedElement.classed("select-other", false);
                }
            }

            //highlight the first item
            const firstItem = ns.selection.getFirst();
            console.log("firstItem->", firstItem);
            if (firstItem) {
                const firstElement = firstItem.element;
                firstElement.classed("select-source", true);
                firstElement.classed("select-target", false);
                firstElement.classed("select-other", false);
            }

            //highlight the last item
            const lastItem = ns.selection.getLast();
            console.log("lastItem->", lastItem);
            if (lastItem) {
                const lastElement = lastItem.element;
                lastElement.classed("select-source", false);
                lastElement.classed("select-target", true);
                lastElement.classed("select-other", false);
            }

        } catch (error) {
            console.error("Error in leftclick", error);
        } finally {
            console.log("leftclick done");
            console.groupEnd();
        }

    }



    // JSON Syntax Highlighting - https://stackoverflow.com/questions/4810841/pretty-print-json-using-javascript
    ns.syntaxHighlight = function(json) {
        if (typeof json != 'string') {
                json = JSON.stringify(json, undefined, 2);
        }
        if (!json || json === 'undefined') {
            return "";
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    
    // Function that assembles the HTML tooltip string
    ns.htmlTooltip = function (d) {
        let heading = "";
        let description = "";
        let jason = {};
        // console.log('d->',d);
        if ('original' in d) {
            heading = d.heading;
            description = d.description;
            jason = d.original;
        } else if ('data' in d) {
            heading = d.data.heading;
            description = d.data.description;
            jason = d.data.original;
        }
        //tooltip paragraph style
        let pgraph_style = '<p style="font-size:' + toString(ns.theme.tooltip.tsize) + '">';
        pgraph_style += '<font color="' + ns.theme.tooltip.tcolour +'">';
        // initilaise description string with  paragraph style
        let desc_string = pgraph_style;
        // If Tooltip is JSON, then highlight, otherwise setup return string
        if (ns.options.tooltipContent == 'json') {
            return desc_string += '<pre>' + ns.syntaxHighlight(jason) + '</pre>';        
        }
        // setup 
        // add heading
        desc_string += '<b>' + heading + '</b>' ;
        // add description
        desc_string += description;

        return desc_string;
    }  
    

    // Three function that change the tooltip when user hover / move / leave a cell
    ns.mouseover = function(event, d) {
        //console.log('mouseover contentMenuItem ', event, d);
        if (!ns.contentMenuActive) {
            ns.showTooltip(d)
            // console.log('mouseover ', ns.contentMenuActive);
            ns.contentMenuItem = d;

            d3.select(this)
                .style("stroke", ns.theme.select)
                .style("opacity", 0.8)
        }
    
    }

    ns.contentMenuData = {
        event: null,
        data: null,
    }

    ns.getContentMenuData = function() {
        if (ns.contentMenuActive) {
            return ns.contentMenuData;
        }
        return null;
    }

    ns.contextmenu = function(event, d) {
        console.log('context menu->', event, d);
        ns.contentMenuItem = d;
        ns.contentMenuActive = true;
        // set context data of the item being clicked
        ns.contentMenuData.event = event;
        ns.contentMenuData.data = d;
        ns.hideTooltip();
    }
    ns.mousemove = function(event, d) {
        //console.log('mousemove contentMenuItem ', event, d);
        if (!ns.contentMenuActive) {
            // console.log('mousemove ', ns.contentMenuActive);

            ns.contentMenuItem = d;

            window.Widgets.Widget.tooltip
                .html(ns.htmlTooltip(d))
                .style("left", (event.pageX+30) + "px")
                .style("top", (event.pageY) + "px")
        }
    }
    ns.mouseleave = function(event, d) {
        //console.log('mouseleave contentMenuItem ', event, d);
        ns.hideTooltip();
        if (ns.contentMenuItem == d) {
            // console.log('mouseleave remove contentMenuItem');
            ns.contentMenuItem = null;
        }
        window.Widgets.Widget.tooltip
            .style("opacity", 0)
        
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 1)
    }

    

    ns.showTooltip = function(d) {
        if (!ns.contentMenuActive) {
            // console.log('showTooltip ', ns.contentMenuActive);
            
            window.Widgets.Widget.tooltip
                .transition()
                .duration(ns.options.duration)
                .style("opacity", 1)
        }
    }

    ns.hideTooltip = function() {
        if (window.Widgets.Widget.tooltip) {
            window.Widgets.Widget.tooltip
                .style("opacity", 0)
        }
    }

    ns.makeLink = function (start, end, radius) {
        const path = d3.path()
        const dh = (4 / 3) * Math.tan(Math.PI / 8) // tangent handle offset
    
        //flip curve
        let fx, fy
        if (end[0] - start[0] == 0) {
          fx = 0
        } else if (end[0] - start[0] > 0) {
          fx = 1
        } else {
          fx = -1
        }
        if (end[1] - start[1] == 0) {
          fy = 0
        } else if (end[1] - start[1] > 0) {
          fy = 1
        } else {
          fy = -1
        }
    
        //scale curve when dx or dy is less than the radius
        if (radius == 0) {
          fx = 0
          fy = 0
        } else {
          fx *= Math.min(Math.abs(start[0] - end[0]), radius) / radius
          fy *= Math.min(Math.abs(start[1] - end[1]), radius) / radius
        }
    
        path.moveTo(...start)
        path.lineTo(...[start[0], end[1] - fy * radius])
        path.bezierCurveTo(
          ...[start[0], end[1] + fy * radius * (dh - 1)],
          ...[start[0] + fx * radius * (1 - dh), end[1]],
          ...[start[0] + fx * radius, end[1]]
        )
        path.lineTo(...end)
        return path
    }

    //----------------------------------------
    // key id functions
    ns.getLinkId = function(d, i) {
        console.log(['getLinkId', d, i]);
        return d.id;
        // return d.source + '-' + d.target;
    };
    ns.getNodeId = function(d, i) {
        console.log(['getNodeId', d, i]);
        return d.id;
    };

    //------------------------------------------
    // process a layout
    //
    ns.processLayout = function (annotate_list, node) {
        console.log('annotate_list->',annotate_list);
        console.log("my node is->", node),
        annotate_list.forEach(function(annotate) {
            if (annotate.promo_IDs.includes(node.id)) {
                //What level is the object?
                //Is it the head object?
                if (node.id === annotate.id) {
                    // Its the top level object
                    node.positionX = annotate.centreX ;
                    node.positionY = annotate.topY;
                    // return node;
                } else {
                    // Is it in level 2 ?
                    if (annotate.connections.includes(node.id)) {
                        // its a 2nd layer thing
                        annotate.layouts.forEach(function(layout) {
                            if (layout.connections.includes(node.id)) {
                                node.positionX = layout.positionX;
                                node.positionY = layout.positionY;
                                // return node;
                            }
                        });
                    } else {
                        // ist a 3rd level or 3.5 level
                        if (node.type === 'relationship') {
                            // console.log("its a relation")
                            node.positionX = 0;
                            node.positionY = ns.options.layout.top + 2.5*ns.options.layout.distanceY;
                            return node;
                        } else {
                            // console.log("its not a relationship")
                            node.positionX = 0;
                            node.positionY = ns.options.layout.top + 2*ns.options.layout.distanceY;
                            // return node;
                        }
                    }
                }

            }
        });

    }


    
    // B. Update Data, Simulations and Drive Show Graph
    ns.processGraphData = function(graphData) {
        console.groupCollapsed(`Widgets.Panel.Utils.updateGraph on ${window.location}`);

        try {

            console.log('graphData->', graphData);

            if (!graphData.promo || !graphData.scratch) {
                console.warn('No promo or scratch data sets found, skipping', graphData);
                console.groupEnd();
                return;
            }

            ns.split = {};
            ns.split.promo = graphData.promo;
            ns.split.promo.nodes = graphData.promo.nodes;
            ns.split.promo.edges = graphData.promo.edges;
            ns.split.scratch = graphData.scratch;
            ns.split.scratch.nodes = graphData.scratch.nodes;
            ns.split.scratch.edges = graphData.scratch.edges;

            ns.split.data = graphData;

            ns.split.adjacency = new ns.Graph();

        } catch (error) {
            console.error("Error in processGraphData", error);
        } finally {
            console.log("processGraphData done");
            console.groupEnd();
        }
        
    };

    ns.openForm = function(formId, formData, options) {
        console.group(`openForm on ${window.location}`);

        // const payload = {
        //     action: 'click',
        //     id: formId,
        //     type: 'button'
        // }
        const eventName = formId;
        const action = "BUTTON_CLICK";

        console.log("compileEventData", formData, eventName, action, formId, options);

        const data = eventsNs.compileEventData(formData, eventName, action, formId, options);

        console.log(`event raise ${eventName}`, data);
        eventsNs.raiseEvent(eventName, data);
        console.log(`event raised ${eventName}`);
        console.groupEnd();
    }


    /**
     * Show notification if enabled
     * @param {string} type - Notification type (success, error, warning, info, loading)
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     */
    ns.showNotification = function(type, message, options = {}) {
        const config = ns.options.notifications;
        
        // Check if notifications are enabled in config
        if (!config || !config.enabled) {
            console.log(`Notifications disabled, skipping ${type}: ${message}`);
            return;
        }
        
        // Check if notifications namespace is available
        if (!notificationsNs) {
            console.warn(`Notifications system not available, skipping ${type}: ${message}`);
            return;
        }
        
        // Check if this type of notification is enabled
        const typeEnabled = config[`show${type.charAt(0).toUpperCase() + type.slice(1)}Messages`];
        if (typeEnabled === false) {
            console.log(`${type} notifications disabled, skipping: ${message}`);
            return;
        }
        
        try {
            // Call the appropriate notification method
            const methodName = `show${type.charAt(0).toUpperCase() + type.slice(1)}`;
            if (typeof notificationsNs[methodName] === 'function') {
                notificationsNs[methodName](message, options);
            } else {
                console.warn(`Notification method ${methodName} not found`);
            }
        } catch (error) {
            console.error(`Error showing ${type} notification:`, error);
        }
    };

    /**
     * Dismiss all notifications
     */
    ns.dismissAllNotifications = function() {
        // Check if notifications namespace is available
        if (!notificationsNs) {
            console.warn("Notifications system not available for dismissal");
            return;
        }
        
        try {
            // Use the notification system's dismissAll method
            if (typeof notificationsNs.dismissAll === 'function') {
                notificationsNs.dismissAll();
            } else {
                console.warn("dismissAll method not found in notifications system");
            }
        } catch (error) {
            console.error("Error dismissing notifications:", error);
        }
    };


})(
    window.jQuery,
    window.Widgets.Panel.Utils,
    window.d3,
    window.Widgets.Events,
    window.Widgets.Notifications,
    document,
    window
)