//define namespace for your JS file
//window.Widgets = {};  //  already defined in _namespace.js
window.Widgets.Widget = {};

//define your function to use in your component
(function($, ns, componentsNs, eventsNs, d3, panelUtilsNs, panelFilterNs, panelTreeNs, panelPromoNs, panelScratchNs, document, window) {
    ns.version = '1.0.0';

    ns.selectorComponent = '[component="graphviz"]';
    ns.selectorTooltipContainer = 'body';


    ns.scratch = '/viz-data/unattached-force-graph';

    //keep track of all listeners and callbacks.
    ns.listeners = new Map();

    /**
     * Fetch the Composer options (GitHub #82) and merge them over the built-in defaults.
     *
     * The API half of #82 has been live since 2026-08-05 — `/viz-data/composer-options` returns
     * **35 real keys** — and nothing consumed it (task 3/11 in the runsheet rollup, the last ⬜
     * outside Act 4). The *Overview* widget already does this; this is the same wiring in the
     * Composer, deliberately written the same way so the two stay comparable.
     *
     * The contract lines up key-for-key with `panelUtilsNs.options`: `tree_data`,
     * `tree_data_default`, `duration`, `radius`, `barHeight`, `width`, `height`, `svg_spacing`,
     * `svg_height`, `textPadding`, `corner`, `minHeight`, `lineSpacing`, `indentSpacing`,
     * `itemFont`, `boxSize`, `tree_edge_thickness`, `graph_edge_thickness`, `linkStrength`,
     * `nodeStrength`, `centreStrength`, `promoSim`, `scratchSim`, `api`, `prefix`, `shape`,
     * `tooltipContent`, `current_theme`, `icon_size`, `layout`, `margin`, `edgeFontFamily`,
     * `edgeFontSize`, `notifications`, `theme` — so this is a **merge, not a mapping**.
     *
     * ⚠️ **A 200 is not success here.** These flow algorithms answer 200 with an `{"error":"true"}`
     * envelope when they throw (alpha-launch docs/issues/0026) — which is exactly how the overview
     * half of #82 looked healthy while broken for a day. Reject that body rather than merging it
     * over good defaults.
     *
     * ⚠️ **Deep merge, never replace.** `options.theme` is captured by reference during init
     * (`panelUtilsNs.theme = panelUtilsNs.options.theme`), so replacing the object would leave the
     * widget pointing at the old one. Merging in place updates what everything already holds.
     */
    ns.optionsUrl = '/viz-data/composer-options';

    ns.mergeOptions = function(target, source) {
        Object.keys(source || {}).forEach((key) => {
            const value = source[key];
            const isPlainObject = value && typeof value === "object" && !Array.isArray(value);
            if (isPlainObject && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
                ns.mergeOptions(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    /**
     * Where to reach the flow API from wherever this widget is running.
     *
     * ⚠️ `http://localhost:8111` only works in the **standalone** workbench. Embedded, the widget
     * is served from `https://widgetdevcomposer.typerefinery.localhost:8101`, and the direct port
     * answers with **no `Access-Control-Allow-Origin`**, so the fetch is blocked by CORS. The
     * Traefik host proxies the same route and does send `Access-Control-Allow-Origin: *` — the
     * same conclusion alpha-launch decision 0006 reached for the incidents table's cold-start URL,
     * and what made the Overview's own options fetch work embedded.
     */
    ns.apiBase = function() {
        return window.location.protocol === "https:"
            ? "https://flow.typerefinery.localhost:8101"
            : "http://localhost:8111";
    }

    ns.loadOptions = function() {
        const url = ns.apiBase() + ns.optionsUrl;
        console.log("loadOptions: fetching Composer options from " + url);
        ns.optionsReady = fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((options) => {
                if (!options || typeof options !== "object" || options.error) {
                    // docs/issues/0026: a 200 carrying an error body. Keep the defaults.
                    console.warn("loadOptions: options endpoint returned an error body, keeping defaults", options);
                    return false;
                }
                const applied = Object.keys(options);
                ns.mergeOptions(panelUtilsNs.options, options);
                console.log(`loadOptions: merged ${applied.length} option(s) over the defaults: ${applied.join(', ')}`);
                console.log(`loadOptions: current_theme=${panelUtilsNs.options.current_theme}, icon_size=${panelUtilsNs.options.icon_size}`);
                return true;
            })
            .catch((error) => {
                // Never let options break the widget — the defaults are a working configuration.
                console.warn("loadOptions: could not load Composer options, keeping defaults: " + error.message);
                return false;
            });
        return ns.optionsReady;
    }
        
    ns.raiseEventDataRequest = function(eventName, topics = [], eventAction, id, callbackFn) {      
        console.group(`raiseEventDataRequest on ${window.location}`); 
        const componentId = `${id}-${eventName}-${eventAction}`; 
        const payload = {
            action: eventAction,
            id: id,
            type: 'load'
        }
        const config = "";

        console.log("compileEventData", payload, eventName, eventAction, id, config);
        const eventCompileData = eventsNs.compileEventData(payload, eventName, "DATA_REQUEST", componentId, config);

        //add callback first
        //make sure callback is unique for each listener, event name and action combination.
        if (callbackFn) {
            console.log("CallbackFn passed.");
            if (ns.listeners.has(componentId)) {                
                console.log("listener already exists, removing.");
                const listener = ns.listeners.get(componentId);
                if (listener.callbackFn === callbackFn) {
                    console.log("callbackFn match.");
                }
            } else {
                console.log("listener does not exist, adding.");
                ns.listeners.set(componentId,{
                    componentId: componentId,
                    eventAction: eventAction,
                    topics: topics,
                    eventName: eventName,
                    id: id,
                    callbackFn: callbackFn
                })

                eventsNs.windowListener((eventData) => {
                    console.group(`windowListener on ${window.location}`);
                    console.log(eventData);
                    const dataEventName = eventData.type || eventData.topicName;
                    const { type, topicName, payload, action, componentId, config } = eventData;            
                    const configAction = (config && config["action"]) ? config.action : "";
                    const data = eventData.data;
                    const eventPayload = eventData.payload;
                    const eventPayloadAction = (eventPayload && eventPayload["action"]) ? eventPayload.action : "";
                    const eventMatch = dataEventName === eventName || topics.includes(dataEventName) || action === eventAction || configAction === eventAction;
                    console.log(["eventName", eventName]);
                    console.log(["eventAction", eventAction]);
                    console.log(["configAction", configAction]);
                    console.log(["eventPayloadAction", eventPayloadAction]);
                    console.log(["dataEventName", dataEventName]);
                    console.log(["data", data]);
                    console.log(["match", eventMatch]);
                    console.log(["type", type]);
                    console.log(["topicName", topicName]);
                    console.log(["payload", payload]);
                    console.log(["action", action]);
                    console.log(["componentId", componentId]);
                    console.log(["config", config]);
                    if (eventMatch) {
                        console.log(["eventName match, exec callback."]);
                        if (ns.listeners.has(componentId)) {
                            ns.listeners.get(componentId).callbackFn(eventData);
                        } else {
                            console.warning(`odd, listener for this even does not exist for this component ${componentId}.`);
                        }
                    } else {
                        console.log(["eventName not match. ignore."]);
                    }
                    console.groupEnd();
                });
                console.log("windowListener added", componentId, ns.listeners);
            }
        }

        //then raise event
        console.log("raiseEvent", eventName, eventCompileData);
        eventsNs.raiseEvent(eventName, eventCompileData);
        console.log("raiseEvent done", eventName);

        console.groupEnd();
    }

    ns.requestData = function() {
        console.group(`requestData on ${window.location}`);

        // Show loading notification
        panelUtilsNs.showNotification('loading', "Loading graph data...");

        console.log("request data");
        //request panel data
        ns.raiseEventDataRequest("embed-viz-event-payload-data-unattached-force-graph", ["embed-viz-event-payload-data-unattached-force-graph"], "load_data", "scratch", (eventData) => {
            console.log("raiseEventDataRequest callback loadData scratch", eventData);
            
            // Dismiss loading notifications
            if (window.Widgets && window.Widgets.Notifications) {
                // Remove all toast elements that contain "Loading" text
                const loadingToasts = document.querySelectorAll(".toastify");
                loadingToasts.forEach((toast) => {
                    if (toast.textContent && toast.textContent.includes("Loading")) {
                        toast.remove();
                    }
                });
            }
            
            if (eventData) {
                if (eventData.error) {
                    console.error(eventData.error);
                    panelUtilsNs.showNotification('error', `Failed to load data: ${eventData.error}`);
                    return;
                }
                if (eventData.data) {
                    console.log("Data received, calling loadData", eventData.data);
                    ns.loadData(eventData.data);
                    panelUtilsNs.showNotification('success', "Graph data loaded successfully");
                } else {
                    console.error("No data found");
                    panelUtilsNs.showNotification('error', "No data found");
                }
            } else {
                panelUtilsNs.showNotification('error', "Failed to load data");
            }
        });
        console.log("requestData done");

        console.groupEnd();
    }

    ns.loadData = function(data) {
        console.group(`Widget.loadData on ${window.location}`);
        console.log(data);

        // processGraphData renders BOTH force panels via ForceGraph.showGraph(), which draws
        // them, settles each simulation and stops it.
        //
        // It used to be followed here by simGraph()/showGraph() on each panel. Those became a
        // second, unmanaged render once ForceGraph.showGraph existed: each simGraph() threw away
        // the settled simulation and built a fresh one, and each showGraph() ends with
        // alpha(1).restart() - with nothing left to settle or stop it. The result was a live
        // simulation at alpha 1 ticking on a throttled timer, so the Promotable graph kept
        // re-laying itself out for minutes and no node could be clicked. See docs/issues/0016.
        panelUtilsNs.processGraphData(data);

        //TODO: load options data into panel utils from Composer-Options API
        ns.options = window.Widgets.Panel.Utils.options;

        // Show success notification
        panelUtilsNs.showNotification('success', "Data loaded into all panels successfully");

        console.groupEnd();
    }

    ns.addEventListener = ($component, componentConfig) => {
        console.group(`addEventListener on ${window.location}`);
        // Prevent multiple registrations of the windowListener
        if (ns._eventListenerRegistered) {
            console.log("Event listener already registered, skipping.");
            console.groupEnd();
            return;
        }
        ns._eventListenerRegistered = true;
        const { events, id } = componentConfig;
        const defaultTopic = id;
  
        console.log(["config", events, id, defaultTopic]);

        console.log(["addEventListener windowListener"]);
        eventsNs.windowListener((data) => {
            console.group(`windowListener on ${window.location}`);
            try {
                console.log(data);
                const { type, payload, action, componentId, config } = data;
                console.log(["type", type]);
                console.log(["payload", payload]);
                console.log(["action", action]);
                console.log(["componentId", componentId]);
                console.log(["config", config]);

                // listen for specific event
                if (action === "DATA_REFRESH") {
                    console.log(["action match, data has changed refreshing data."]);
                    
                    // Check if data is provided in the message
                    if (data.data) {
                        console.log("Data provided in DATA_REFRESH message, loading directly");
                        ns.loadData(data.data);
                        panelUtilsNs.showNotification('success', "Data refreshed successfully");
                    } else {
                        console.log("No data in message, requesting fresh data");
                        ns.requestData();
                    }
                } else {
                    console.log(["action not match, ignore."]);
                }
            } catch (error) {
                console.error("Error in windowListener", error);
            } finally {
                console.groupEnd();
            }
        });

        console.log(["addEventListener windowListener done"]);
        console.groupEnd();
    }

    ns.init = function($component) {
        // Prevent multiple initializations for the same component
        if ($component.data("widget-initialized")) {
            console.log("Widget already initialized for this component, skipping.");
            return;
        }
        $component.data("widget-initialized", true);

        /**
         * Wait for the #82 options merge before building anything.
         *
         * The Overview widget only needs its options by *draw* time, so it fires the fetch and
         * lets `loadFromData` wait on the promise. The Composer cannot do that: the body below
         * captures the theme by reference (`panelUtilsNs.theme = panelUtilsNs.options.theme`) and
         * immediately builds the tooltip out of `theme.tooltip.*`, so a merge that lands later
         * would leave the tooltip on the defaults while everything else moved.
         *
         * `loadOptions` never rejects — a failed fetch keeps the defaults — so init always runs.
         */
        ns.loadOptions().then((merged) => {
            console.log(`widget.init: proceeding with ${merged ? 'API' : 'default'} options`);
            ns.initWithOptions($component);
        });
    };

    ns.initWithOptions = function($component) {
        console.group(`widget.init on ${window.location}`);
        try {
            console.log(d3, componentsNs, eventsNs);

            // Theme selected by api
            panelUtilsNs.theme = panelUtilsNs.options.theme;

            // init tree

            const $tree_panel = $component.find(panelTreeNs.selectorComponent);

            panelTreeNs.init($tree_panel, window.Widgets.Panel.Utils.options, $component.closest(ns.selectorTooltipContainer));


            //init filter

            const $filter_panel = $component.find(panelFilterNs.selectorComponent);

            panelFilterNs.init($filter_panel, window.Widgets.Panel.Utils.options);

            ns.tooltip = d3.select("body")
                .append("div")
                .attr('class', 'tooltip')
                .attr('id', 'tooltip')
                .style('display', 'block')
                .style("position", "absolute")
                .style("z-index", "10")
                .style("background-color", panelUtilsNs.theme.tooltip.fill)
                .style("border", "solid")
                .style("border-width",  panelUtilsNs.theme.tooltip.stroke)
                .style("border-color",  panelUtilsNs.theme.tooltip.scolour)
                .style("border-radius",  panelUtilsNs.theme.tooltip.corner)
                .style("max-width", panelUtilsNs.theme.tooltip.maxwidth)
                .style("overflow-x", panelUtilsNs.theme.tooltip.overeflow)
                .style("padding",  panelUtilsNs.theme.tooltip.padding)
                .style('opacity', 0);



            const $promo_panel = $component.find(panelPromoNs.selectorComponent);

            panelPromoNs.init($promo_panel, window.Widgets.Panel.Utils.options);

            const $scratch_panel = $component.find(panelScratchNs.selectorComponent);

            panelScratchNs.init($scratch_panel, window.Widgets.Panel.Utils.options);

            console.log("Initializing data loading...");
            
            // Check if we're in local mode and load appropriate data
            const isLocal = panelTreeNs.isLocalMode();
            console.log(`Local mode check in widget init: ${isLocal}`);
            console.log(`Current URL: ${window.location.href}`);
            console.log(`Search params: ${window.location.search}`);
            
            if (isLocal) {
                console.log("Local mode detected, loading tree data from API");
                // Wait a moment for tree panel to be fully initialized
                setTimeout(() => {
                    // Load initial tree data in local mode
                    const defaultType = panelUtilsNs.options.tree_data_default || "sighting";
                    console.log(`Calling updateTree with default type: ${defaultType}`);
                    console.log(`Tree panel namespace:`, panelTreeNs);
                    console.log(`UpdateTree function:`, panelTreeNs.updateTree);
                    panelTreeNs.updateTree(defaultType);
                }, 100);
            } else {
                console.log("Widget mode, requesting data from parent");
                // send event to parent to get data
                ns.requestData();
            }

            // on component mouse over hide tooltip
            $component.on('mouseover', function() {
                panelUtilsNs.hideTooltip();
            });
            
            // add event listener to liste to other events.
            ns.addEventListener($component, window.Widgets.Panel.Utils.options);

        } catch (error) {
            console.error("Error in widget.init", error);
        } finally {
            console.log("widget.init done");
            console.groupEnd();
        }

    };

    /**
     * Convert tree data structure to graph format (nodes and edges)
     * @param {Object} treeData - Tree data with children structure
     * @returns {Object} Graph data with nodes and edges arrays
     */
    ns.convertTreeToGraph = function(treeData) {
        console.log("Converting tree data to graph format");
        
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        
        function processNode(node, parentId = null) {
            const nodeId = node.id || `node-${nodes.length}`;
            
            // Add node if not already processed
            if (!nodeMap.has(nodeId)) {
                nodes.push({
                    id: nodeId,
                    name: node.name || node.heading || nodeId,
                    type: node.type || 'unknown',
                    icon: node.icon || 'default',
                    description: node.description || '',
                    original: node.original || {}
                });
                nodeMap.set(nodeId, true);
            }
            
            // Add edge from parent if exists
            if (parentId) {
                edges.push({
                    source: parentId,
                    target: nodeId,
                    type: 'parent-child'
                });
            }
            
            // Process children recursively
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => processNode(child, nodeId));
            }
        }
        
        // Start processing from root
        processNode(treeData);
        
        console.log(`Converted tree to graph: ${nodes.length} nodes, ${edges.length} edges`);
        return { nodes, edges };
    }

    /**
     * Create default graph data from any data structure
     * @param {Object} data - Any data structure
     * @returns {Object} Default graph data with nodes and edges arrays
     */
    ns.createDefaultGraphData = function(data) {
        console.log("Creating default graph data from data structure");
        
        const nodes = [];
        const edges = [];
        
        // Create a default node from the data
        const defaultNode = {
            id: 'default-node',
            name: data.name || data.heading || 'Data Node',
            type: data.type || 'default',
            icon: data.icon || 'default',
            description: data.description || 'Default data node',
            original: data
        };
        
        nodes.push(defaultNode);
        
        // If data has properties, create additional nodes
        if (data && typeof data === 'object') {
            Object.keys(data).forEach((key, index) => {
                if (key !== 'name' && key !== 'heading' && key !== 'type' && key !== 'icon' && key !== 'description' && key !== 'children' && key !== 'nodes' && key !== 'edges') {
                    const propertyNode = {
                        id: `property-${key}`,
                        name: key,
                        type: 'property',
                        icon: 'property',
                        description: `Property: ${key}`,
                        original: { value: data[key] }
                    };
                    
                    nodes.push(propertyNode);
                    
                    // Add edge from default node to property node
                    edges.push({
                        source: 'default-node',
                        target: `property-${key}`,
                        type: 'has-property'
                    });
                }
            });
        }
        
        console.log(`Created default graph: ${nodes.length} nodes, ${edges.length} edges`);
        return { nodes, edges };
    }

    // Add global message listener for simulation and reload events
    window.addEventListener('message', function(event) {
        let eventData = event.data;
        if (typeof eventData === 'string') {
            try {
                eventData = JSON.parse(eventData);
            } catch (e) {}
        }
        if (!eventData || typeof eventData !== 'object') return;
        switch (eventData.type) {
            case 'SIMULATE_ERROR':
                panelUtilsNs.showNotification('error', eventData.payload && eventData.payload.message ? eventData.payload.message : 'Simulated error received');
                break;
            case 'SIMULATE_TIMEOUT':
                panelUtilsNs.showNotification('error', eventData.payload && eventData.payload.message ? eventData.payload.message : 'Simulated timeout received');
                break;
            case 'SIMULATE_CRASH':
                panelUtilsNs.showNotification('error', eventData.payload && eventData.payload.message ? eventData.payload.message : 'Simulated crash received');
                break;
            case 'RELOAD_WIDGET':
                panelUtilsNs.showNotification('info', eventData.payload && eventData.payload.message ? eventData.payload.message : 'Widget reload triggered');
                setTimeout(() => { window.location.reload(); }, 500);
                break;
            default:
                // ignore
        }
    });

})(
    /*$*/   window.jQuery,
    /*ns*/  window.Widgets.Widget,
    /*componentsNs*/ window.Widgets, 
    /*eventsNs*/ window.Widgets.Events,
    /*d3*/ window.d3, 
    /*panelUtilsNs*/ window.Widgets.Panel.Utils,
    /*panelFilterNs*/ window.Widgets.Panel.Filter,
    /*panelTreeNs*/ window.Widgets.Panel.Tree,
    /*panelPromoNs*/ window.Widgets.Panel.Promo,
    /*panelScratchNs*/ window.Widgets.Panel.Scratch,
    /*document*/ document,
    /*window*/ window);


//define your behaviour how will this component will be added to DOM.
(function($, ns, componentsNs, document, window) {
    
    //watch for the component to be added to DOM
    componentsNs.watchDOMForComponent(`${ns.selectorComponent}`, ns.init);

})(window.jQuery, window.Widgets.Widget, window.Widgets, document, window);
