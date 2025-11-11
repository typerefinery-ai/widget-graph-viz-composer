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
        console.group(`Load Data on ${window.location}`);
        console.log(data);

        let graphData = data;
        if (!graphData || typeof graphData !== "object") {
            console.warn("loadData received invalid data payload, creating default graph");
            graphData = ns.createDefaultGraphData({ name: "Unknown Data" });
        } else if (!graphData.nodes || !graphData.edges) {
            if (graphData.children && Array.isArray(graphData.children)) {
                console.log("loadData detected tree structure, converting to graph");
                graphData = ns.convertTreeToGraph(graphData);
            } else {
                console.log("loadData creating default graph representation for payload");
                graphData = ns.createDefaultGraphData(graphData);
            }
        }

        //TODO: clear existing data and visuals in tree
        panelUtilsNs.processGraphData(graphData);

        //TODO: clear existing data and visuals in promo
        panelPromoNs.simGraph()
        panelPromoNs.showGraph();

        //TODO: clear existing data and visuals in sim
        panelScratchNs.simGraph();
        panelScratchNs.showGraph();

        
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
        
        console.group(`widget.init on ${window.location}`);
        try {
            console.log(d3, componentsNs, eventsNs);


            if (!panelUtilsNs.theme) {
                if (panelUtilsNs.options.theme === 'light') {
                    panelUtilsNs.theme = panelUtilsNs.options.light_theme
                } else {
                    panelUtilsNs.theme = panelUtilsNs.options.dark_theme
                }
            }


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
