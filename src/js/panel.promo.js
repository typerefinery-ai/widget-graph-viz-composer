// panel.promo.js
//define context menu functions
window.Widgets.Panel.Promo = {}

;(function ($, ns, d3, panelUtilsNs, eventsNs, document, window) {

    ns.selectorComponent = '#promo_panel';

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

                    // //grab the selection
                    let selectionList = panelUtilsNs.selection.list;

                    let sourceData = selectionList[0].data;
                    let targetData = selectionList[1].data;

                    let eventObjectData = {
                        source: {
                            ...sourceData
                        },
                        target: {
                            ...targetData
                        }
                    }

                    let sourceDataOriginal = selectionList[0].data.original
                    let targetDataOriginal = selectionList[1].data.original

                    let eventObjectDataOriginal = {
                        source: {
                            ...sourceDataOriginal
                        },
                        target: {
                            ...targetDataOriginal
                        }
                    }                    

                    // create event to get data for the modal
                    let getRelationshipTypesCallback = function(id, eventData, eventHandlerId) {
                        console.groupCollapsed(`widget getRelationshipTypesCallback on ${window.location}`);

                        //TODO: extract data from eventData to prepare for the form, this need to match the form fields
                        let dataForForm = {
                            object: {
                                relationship_type: eventData.data.relationship_type_list,
                                source_ref: eventData.data.reln_form_values.source_ref,
                                target_ref: eventData.data.reln_form_values.target_ref,    
                            }
                        }

                        // callback that will be called when the form modal is finished
                        let callbackFn = function(sourceData) {
                            console.groupCollapsed(`widget windowListener on ${window.location}`);
                            console.log('sourceData', sourceData);
                            if (sourceData) {

                                // exit if payload not an object
                                if (typeof sourceData.payload !== 'object') {
                                    console.warn('sourceData.payload is not an object');
                                    return;
                                } 

                                //TODO: handle form outcome SUCCESS, ERROR, or CANCEL
                                let statusMessage = sourceData.payload.statusMessage;

                                console.log('statusMessage', statusMessage);

                                if (statusMessage === "ts.modal.closing") {
                                    //TODO: handle modal closing
                                    console.log('modal closed');
                                } else {
                                    let payload = sourceData.payload;
                                    let eventName = sourceData.type;
                                    let action = sourceData.action;
                                    //TODO: make this more generic
                                    let formData = payload.payload.payload.body;
                                    if (typeof formData === 'string') {
                                        formData = JSON.parse(formData);
                                    }
                                    console.log(['modal submitted', payload, eventName, action, formData]);
                                    console.log('eventName', eventName);
                                    console.log('formData', formData);
                                    console.log('action', action);

                                    if (eventName && formData) {
                                        ns.formOpenCRO(formData, eventObjectData);
                                    }
                                }
                            } else {
                                console.warn('no sourceData');
                            }
                            console.groupEnd();
                        }

                        //send event to open the modal form
                        ns.formOpenCROLink(dataForForm, callbackFn);

                        console.groupEnd();
                    }

                    // // send this event with payload
                    ns.getForceRMBGetRelationshipTypes(eventObjectDataOriginal, getRelationshipTypesCallback)

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

                    // //grab the selection
                    let selectionList = panelUtilsNs.selection.list;

                    let sourceData = selectionList[0].data;
                    let targetData = selectionList[1].data;

                    let eventObjectData = {
                        source: {
                            ...sourceData
                        },
                        target: {
                            ...targetData
                        }
                    }

                    let sourceDataOriginal = selectionList[0].data.original
                    let targetDataOriginal = selectionList[1].data.original

                    let eventObjectDataOriginal = {
                        source: {
                            ...sourceDataOriginal
                        },
                        target: {
                            ...targetDataOriginal
                        }
                    }    
                    
                    let getConnectionTypesCallback = function(id, eventData, eventHandlerId) {
                        console.groupCollapsed(`widget getConnectionTypesCallback on ${window.location}`);

                        //TODO: extract data from eventData to prepare for the form, this need to match the form fields
                        let dataForForm = {
                            object: {
                                connection_type: eventData.data.connection_type_list,
                                source_ref: eventData.data.connect_objects.source_ref,
                                target_ref: eventData.data.connect_objects.target_ref,    
                            }
                        }

                        // callback that will be called when the form modal is finished
                        let callbackFn = function(sourceData) {
                            console.groupCollapsed(`widget windowListener on ${window.location}`);
                            console.log('sourceData', sourceData);

                            if (sourceData) {

                                // exit if payload not an object
                                if (typeof sourceData.payload !== 'object') {
                                    console.warn('sourceData.payload is not an object');
                                    return;
                                }
                                
                                //TODO: handle form outcome SUCCESS, ERROR, or CANCEL
                                let statusMessage = sourceData.payload.statusMessage;

                                console.log('statusMessage', statusMessage);

                                if (statusMessage === "ts.modal.closing") {
                                    //TODO: handle modal closing
                                    console.log('modal closed');
                                } else {
                                    let payload = sourceData.payload;
                                    let eventName = sourceData.type;
                                    let action = sourceData.action;
                                    //TODO: make this more generic
                                    let formData = payload.payload.payload.body;
                                    if (typeof formData === 'string') {
                                        formData = JSON.parse(formData);
                                    }
                                    console.log(['modal submitted', payload, eventName, action, formData]);
                                    console.log('eventName', eventName);
                                    console.log('formData', formData);
                                    console.log('action', action);

                                    if (eventName && formData) {
                                        ns.formOpenConnection(formData, eventObjectData);
                                    }
                                }
                            } else {
                                console.warn('no sourceData');
                            }
                            console.groupEnd();
                        }

                        //send event to open the modal form
                        ns.formOpenConnectionLink(dataForForm, callbackFn);

                        console.groupEnd();
                    }

                    // send this event with payload
                    ns.getForceRMBGetConnectionTypes(eventObjectDataOriginal, getConnectionTypesCallback)

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

                //TODO: What are we sending to the form from current selection?
                let dataForForm = contextData.data;

                const formId = "remove-promo-sro";
                const eventName = "viz-open-form-" + formId;
                const config = formId;
                const action = "OPEN_FORM_MODAL";
                const formData = {
                    formId: formId,
                    eventName: eventName,
                    action: action,
                    config: config,
                    data: dataForForm,
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

    //try parse string as json
    function tryParseJSON(jsonString) {
        //check if the string is empty
        if (jsonString === "") {
            return jsonString;
        }
        //check if the string is an object
        if (typeof jsonString === 'object') {
            return jsonString;
        }
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            //if the string is not a valid json, return the string
            //console.warn("tryParseJSON", jsonString, e);
            return jsonString;
        }
    }

    /********** Relationship **********/

    /**
     * function to get the relationship types
     * @param {*} data this is the data that will be sent to the event
     * @param {*} callbackFn this is the callback function that will be called when the event is finished
     */
    ns.getForceRMBGetRelationshipTypes = function(data, callbackFn) {
        console.groupCollapsed(`Widgets.Panel.Promo.getForceRMBGetRelationshipTypes on ${window.location}`);
        console.log("data", data);
        console.log("callback", callbackFn);

        //compile event data
        const eventName = "embed-force-rmb-get-relationship-types";
        const componentId = eventName; 

        const payload = {
            action: eventName,
            id: componentId,
            type: 'load',
            data: data
        }
        const config = "";
        const eventCompileData = eventsNs.compileEventData(payload, eventName, "DATA_REQUEST", componentId, config);

        //register callback event from parent, do this first so that it is ready when the event is raised
        eventsNs.registerEvent(eventName, eventsNs.eventListenerHandler, callbackFn);

        //raise event
        console.log("raiseEvent", eventName, eventCompileData);
        eventsNs.raiseEvent(eventName, eventCompileData);
        console.log("raiseEvent done", eventName);

    };

    //TODO: refactor into generic function
    //open form to create link
    ns.formOpenCROLink = function(dataForForm, callbackFn) {
        console.groupCollapsed(`Widgets.Panel.Promo.formOpenCROLink on ${window.location}`);
        const formId = "create-force-sro";
        const eventName = "viz-open-form-" + formId;
        const config = formId;
        const action = "OPEN_FORM_MODAL";
        // const formData = {
        //     formId: formId,
        //     eventName: eventName,
        //     action: action,
        //     config: config,
        //     data: dataForForm,
        // };
        console.log("compileEventData", dataForForm, eventName, action, formId, config);
    
        const data = eventsNs.compileEventData(dataForForm, eventName, action, formId, config);

        //TODO: replace to use eventsNs.registerEvent
        console.log("registering windowListener for event", eventName);
        eventsNs.windowListenerForEvent(eventName, callbackFn);
        console.log("windowListener registered for event", eventName);
        
        //raise the event
        console.log(`event raise ${eventName}`, data);
        eventsNs.raiseEvent(eventName, data);
        console.log(`event raised ${eventName}`);


        console.groupEnd();
    }
    
    //open form for create SRO
    ns.formOpenCRO = function(dataForForm, eventObjectData) {
        console.group(`formOpenCRO on ${window.location}`);
        console.log("dataForForm", dataForForm);
        console.log("eventObjectData", eventObjectData);
        console.log("open next form for create SRO", dataForForm);

        //"object_form": "incident",
        //"object_group": "sdo-forms",
        //"object_family": "stix-forms"
        let objectForm = eventObjectData.source.object_form;
        let objectGroup = eventObjectData.source.object_group;
        let objectFamily = eventObjectData.source.object_family;
        let formAction = "create"

        const eventName = "embed-viz-event-open-stixorm-forms-sro-forms-relationship-form";
        const formId = eventName;
        const config = {
            formId: formId,
            objectForm: objectForm,
            objectGroup: objectGroup,
            objectFamily: objectFamily,
            formAction: formAction,
        };
        const action = "BUTTON_CLICK";

        console.log("compileEventData", dataForForm, eventName, action, formId, config);

        const eventData = eventsNs.compileEventData(dataForForm, eventName, action, formId, config);

        console.log(`event raise ${eventName}`, eventData);
        eventsNs.raiseEvent(eventName, eventData);
        console.log(`event raised ${eventName}`);
        console.groupEnd();

    }

    /********** Connection **********/

    /**
     * function to get the connection types
     * @param {*} data this is the data that will be sent to the event
     * @param {*} callbackFn this is the callback function that will be called when the event is finished
     */
    ns.getForceRMBGetConnectionTypes = function(data, callbackFn) {
        console.groupCollapsed(`Widgets.Panel.Promo.getForceRMBGetConnectionTypes on ${window.location}`);
        console.log("data", data);
        console.log("callback", callbackFn);

        //compile event data
        const eventName = "embed-force-rmb-get-connection-types";
        const componentId = eventName; 

        const payload = {
            action: eventName,
            id: componentId,
            type: 'load',
            data: data
        }
        const config = "";
        const eventCompileData = eventsNs.compileEventData(payload, eventName, "DATA_REQUEST", componentId, config);

        //register callback event from parent, do this first so that it is ready when the event is raised
        eventsNs.registerEvent(eventName, eventsNs.eventListenerHandler, callbackFn);

        //raise event
        console.log("raiseEvent", eventName, eventCompileData);
        eventsNs.raiseEvent(eventName, eventCompileData);
        console.log("raiseEvent done", eventName);

    };


    //NOTE: open modal form to create link
    ns.formOpenConnectionLink = function(dataForForm, callbackFn) {
        console.groupCollapsed(`Widgets.Panel.Promo.formOpenConnectionLink on ${window.location}`);
        const formId = "create-force-connection";
        const eventName = "viz-open-form-" + formId;
        const config = formId;
        const action = "OPEN_FORM_MODAL";
        // const formData = {
        //     formId: formId,
        //     eventName: eventName,
        //     action: action,
        //     config: config,
        //     data: dataForForm,
        // };
        console.log("compileEventData", dataForForm, eventName, action, formId, config);
    
        const data = eventsNs.compileEventData(dataForForm, eventName, action, formId, config);

        //TODO: replace to use eventsNs.registerEvent
        console.log("registering windowListener for event", eventName);
        eventsNs.windowListenerForEvent(eventName, callbackFn);
        console.log("windowListener registered for event", eventName);
        
        //raise the event
        console.log(`event raise ${eventName}`, data);
        eventsNs.raiseEvent(eventName, data);
        console.log(`event raised ${eventName}`);


        console.groupEnd();
    }

    //NOTE: open form for create connection
    ns.formOpenConnection = function(dataForForm, eventObjectData) {
        console.group(`Widgets.Panel.Promo.formOpenCRO on ${window.location}`);
        console.log("dataForForm", dataForForm);
        console.log("eventObjectData", eventObjectData);
        console.log("open next form for create connection", dataForForm);

        //"object_form": "incident",
        //"object_group": "sdo-forms",
        //"object_family": "stix-forms"
        let objectForm = eventObjectData.source.object_form;
        let objectGroup = eventObjectData.source.object_group;
        let objectFamily = eventObjectData.source.object_family;
        let formAction = "create"

        const eventName = "embed-viz-event-open-stixorm-forms-sro-forms-connection-form";
        const formId = eventName;
        const config = {
            formId: formId,
            object_form: objectForm,
            object_group: objectGroup,
            object_family: objectFamily,
            formAction: formAction,
        };
        const action = "BUTTON_CLICK";

        //TODO: add logic
        //get source object from eventObjectData
        let sourceObject = {
            ...eventObjectData.source
        };
        console.log("sourceObject", sourceObject);
        //get source object from eventObjectData
        let targetObject = eventObjectData.target;
        console.log("targetObject", targetObject);

        //get target object Id
        let targetObjectId = targetObject.id;
        
        // get connection_field_list is the value which is the named attribute of the source object
        let connectionFieldListValue = dataForForm.connection_field_list;
        console.log("connectionFieldList", connectionFieldListValue);

        // check if connectionFieldList is in sourceObject
        if (sourceObject[connectionFieldListValue]) {
            console.log("connectionFieldList is in sourceObject");
            //rules

            // do regex match to check if connectionFieldListValue is multi value by checking if it has ending pattern _*s
            let multiValue = connectionFieldListValue.match(/_\d+s$/);
            console.log("multiValue", multiValue);
            if (multiValue) {
                console.log("connectionFieldListValue is multi value");

                // create or append targetObjectId to sourceObject[connectionFieldListValue]
                sourceObject[connectionFieldListValue].push(targetObjectId);
                
            } else {
                console.log("connectionFieldListValue is not multi value");
                // set sourceObject[connectionFieldListValue] to targetObjectId
                sourceObject[connectionFieldListValue] = targetObjectId;
            }

        } else {
            console.log("connectionFieldList is not in sourceObject");
        }
        
        // send sourceObject as form payload
        console.log("compileEventData", sourceObject, eventName, action, formId, config);

        const eventData = eventsNs.compileEventData(sourceObject, eventName, action, formId, config);

        console.log(`event raise ${eventName}`, eventData);
        eventsNs.raiseEvent(eventName, eventData);
        console.log(`event raised ${eventName}`);
        console.groupEnd();

    }

    ns.simGraph = function() {
        console.groupCollapsed(`Widgets.Panel.Promo.simGraph on ${window.location}`);

        if (!panelUtilsNs.split || !panelUtilsNs.split.promo || !panelUtilsNs.split.promo.edges) {
            console.error('No data to show');
            console.groupEnd();            
            return
        }
    
        console.log("panelUtilsNs.split.promo.nodes->",panelUtilsNs.split.promo.nodes);        
        console.log("panelUtilsNs.split.promo.edges->",panelUtilsNs.split.promo.edges);     
           
        ns.promotable_sim = d3
            .forceSimulation(panelUtilsNs.split.promo.nodes)
            .force("link", d3.forceLink() // This force provides links between nodes
                .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
                // .distance(500 * ns.options.iconSize)
            );

        console.groupEnd();

    };

    ns.showGraph = function() {
        console.group(`Widgets.Panel.Promo.showGraph on ${window.location}`);

        if (!panelUtilsNs.split || !panelUtilsNs.split.promo || !panelUtilsNs.split.promo.edges) {
            console.error('No data to show');
            console.groupEnd();            
            return
        }

        if (!ns.promotable_sim) {
            console.warn('Simulation not found, creating new one');
            ns.simGraph();
        }
        ns.promoLink = ns.promo_svg_root
            .selectAll('.plinks')
            .data(panelUtilsNs.split.promo.edges)
            .join('line')
            .attr('class', 'plinks')
            .attr('source', (d) => d.source)
            .attr('target', (d) => d.target)
            .attr('stroke-width', 0.75)
            .attr('stroke', panelUtilsNs.theme.edges)
            .attr('marker-end', 'url(#parrowhead)'); //The marker-end attribute defines the arrowhead or polymarker that will be drawn at the final vertex of the given shape.

        ns.promoEdgepaths = ns.promo_svg_root
            .selectAll('.pedgepath') //make path go along with the link provide position for link labels
            .data(panelUtilsNs.split.promo.edges)
            .join('path')
            .attr('class', 'pedgepath')
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', function(d, i) {return 'pedgepath' + i;})
            .style('pointer-events', 'none');

        ns.promoEdgelabels = ns.promo_svg_root
            .selectAll('.pedgelabel')
            .data(panelUtilsNs.split.promo.edges)
            .join('text')
            .style('pointer-events', 'none')
            .attr('class', 'pedgelabel')
            .attr('id', function(d, i) {
                return 'pedgelabel' + i;
            })
            .style('font-size', ns.options.edgeFontSize)
            .style('font-family', ns.options.edgeFontFamily)
            .attr('fill', panelUtilsNs.theme.edges);

        ns.promoEdgelabelsText = ns.promoEdgelabels
            .append('textPath') //To render text along the shape of a <path>, enclose the text in a <textPath> element that has an href attribute with a reference to the <path> element.
            .attr('xlink:href', function(d, i) {
                return '#pedgepath' + i;
            })
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .attr('startOffset', '50%')
            .text((d) => d.name);

        // Initialize the nodes with attached image, changed to join data
        // add hover over effect
        // for promo
        ns.promoNode = ns.promo_svg_root
            .append('g')
            .selectAll('.pnodes')
            .data(panelUtilsNs.split.promo.nodes)
            .join('image')
            .attr('class', 'pnodes')
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


        ns.promotable_sim
            .nodes(panelUtilsNs.split.promo.nodes)
            .on('tick', function() {
                // console.log(['promotable_sim ticked',this, ns.promo_svg
                // .selectAll('.plinks')]);
                ns.promo_svg_root
                    .selectAll('.plinks')
                    .attr('x1', (d) => d.source.x)
                    .attr('y1', (d) => d.source.y)
                    .attr('x2', (d) => d.target.x)
                    .attr('y2', (d) => d.target.y);
        
                ns.promo_svg_root
                    .selectAll('.pnodes')
                    .attr('x', (d) => d.x - ns.options.iconSize / 2)
                    .attr('y', (d) => d.y - ns.options.iconSize / 2);
        
                ns.promo_svg_root.selectAll('.pedgepath').attr(
                    'd',
                    function(d) {
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
                    },

                );
            }); //use simulation.on to listen for tick events as the simulation runs.

        // Setup either the Layout, or Default Force Graph
        if (ns.options.promoSim) {
            
            ns.promotable_sim 
                .force("link")
                .links(panelUtilsNs.split.promo.edges)
                .id(d => d.id)
                .distance(function() {return 4 * ns.options.iconSize;})
                .strength(0.05);

            ns.promotable_sim 
                .force('x', d3.forceX().x(function(d) {
                    return d.positionX;
                }).strength(function(d) {
                    // ignore forceX below the first two layers
                    if (d.positionX === 0) {
                        return 0;
                    } else {
                        return 1;
                    }
                }))
                .force('y', d3.forceY().y(function(d) {
                    return d.positionY;
                }).strength(1))
                // .force('collision', d3.forceCollide().radius(function(d) {
                //     console.log("d is ->", d)
                //     return d.radius;
                // }))
                .force("collide", d3.forceCollide(ns.options.iconSize))
                // .force("charge", d3.forceManyBody().strength(-200)) // This adds repulsion (if it's negative) between nodes. 
                .force("charge", d3.forceManyBody().strength(-500)) // This adds repulsion (if it's negative) between nodes. 
                // .force("center", d3.forceCenter(ns.options.width / 2, ns.options.height / 2)); // This force attracts nodes to the center of the svg area
        } else {
            ns.promotable_sim 
                .force("link")
                .links(panelUtilsNs.split.promo.edges)
                .id(d => d.id)
                .distance(function() {return 4 * ns.options.iconSize;});

            ns.promotable_sim
                .force("charge", d3.forceManyBody().strength(-500)) // This adds repulsion (if it's negative) between nodes. 
                .force("center", d3.forceCenter(ns.options.width / 2, ns.options.height / 2)); // This force attracts nodes to the center of the svg area
        }

          
        //create zoom handler  for each
        // ns.zoom_handler = d3.zoom().on('zoom', function(event, d) { 
        //     ns.promo_svg_root.attr('transform', event.transform);
        // });



        console.groupEnd();
        
    };

    //The simulation is temporarily “heated” during interaction by setting the target alpha to a non-zero value.
    ns.dragstarted = function(event, d) {
        if (!event.active) {
            ns.promotable_sim.alphaTarget(0.3).restart(); //sets the current target alpha to the specified number in the range [0,1].
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
            ns.promotable_sim.alphaTarget(0);
        }
        d.fx =  d.x; // null;
        d.fy =  d.y; // null;
    }

    // release the node position when doubl-click has been sent
    ns.releasenode = function (event, d) {
        console.group(`Widgets.Panel.Promo.releaseNode on ${window.location}`);
        console.log('================= release node ==========')
        console.log('d.fx  ',d.fx, ' d.fy ',d.fy)
        console.log('d.x  ',d.x, ' d.y ',d.y)
        d3.select(this).classed("fixed", d.fixed = false);
        d.fx = null;
        d.fy = null;
        if (!event.active) ns.promotable_sim.alphaTarget(0.9);
        console.groupEnd();
    }



    ns.init = function($component, options) {
            
        console.group(`Widgets.Panel.Promo.init on ${window.location}`);

        try {

            ns.$container = $component;

            //copy options into ns
            ns.options = Object.assign({}, options);

            ns.options.width = ns.$container.width();
            ns.options.height = ns.$container.height();
            // Theme selected by api
            panelUtilsNs.theme = panelUtilsNs.options.theme;

            ns.promo_svg = d3
                .select($component.get(0))
                .append('svg')
                .attr('class', 'promo_svg')
                .attr('id', 'promo_svg')
                .attr('width', $component.width())
                .attr('height', $component.height())
                .attr('cursor', 'pointer')
                .attr('pointer-events', 'all')
                .style("background", panelUtilsNs.theme.promoFill);
                
                // .attr('pointer-events', 'none')

            // ns.promotable_rect = ns.promo_svg
            //     .append('rect')
            //     .attr('id', 'promotable_rect')
            //     .attr('width', $component.width())
            //     .attr('height', $component.height())
            //     .attr('x', 0)
            //     .attr('y', 0)
            //     .attr('stroke', panelUtilsNs.theme.svgBorder)
            //     .attr('fill', panelUtilsNs.theme.fill);
                        
            ns.promotable_label = ns.promo_svg
                .append('g')
                .attr('id', 'promotable_label')
                .attr('transform', 'translate(' + 10 + ',' + 20 + ')')
                .append('text')
                .text('Promotable')
                .style('fill', panelUtilsNs.theme.svgName);

            ns.promo_svg_zoom = ns.promo_svg
                .call(
                    d3.zoom().on('zoom', function(event, d) {
                        ns.promo_svg_root.attr('transform', event.transform);
                    }),
                )
                .attr('id', 'promo_svg_zoom');

            ns.promo_svg_root = ns.promo_svg
                .append('g');

            // Append the Arrowhead in Promo and Scratch SVG's
            ns.promo_svg_defs = ns.promo_svg_root
                .append('defs')
                .attr('id', 'promo_svg_defs')
                .append('marker')
                .attr('id', 'parrowhead')
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
            console.error("Error in panel.promo.init", error);
        } finally {
            console.log("panel.promo.init done");
            console.groupEnd();
        }

    }

})(window.jQuery, window.Widgets.Panel.Promo, window.d3, window.Widgets.Panel.Utils, window.Widgets.Events, document, window)