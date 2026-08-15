// panel.promo.js
//define context menu functions
window.Widgets.Panel.Promo = {}

;(function ($, ns, d3, panelUtilsNs, eventsNs, document, window) {

    ns.selectorComponent = '#promo_panel';

    ns.options = {};

    /**
     * Clear promo force-graph DOM elements before loading new data
     */
    ns.clearData = function() {
        console.log("Clearing promo force-graph DOM");

        if (!ns.promo_svg_root) {
            console.warn("promo_svg_root not initialized, skipping clear");
            return;
        }

        ns.promo_svg_root.selectAll('.plinks').remove();
        ns.promo_svg_root.selectAll('.pedgepath').remove();
        ns.promo_svg_root.selectAll('.pedgelabel').remove();
        ns.promo_svg_root.selectAll('.pnodes').remove();
        // docs/issues/0159 — tear the node labels down with everything else.
        //
        // ⚠️ Omitting this in the Scratch pane left the previous generation of labels in the DOM,
        // and the pane re-renders on each load event, so a second set was drawn over the first. Two
        // generations settle at different positions and read as interleaved nonsense
        // (`Sockmalwarection`) — which looks like a font or collision fault and is neither.
        ns.promo_svg_root.selectAll('.pnode-label').remove();
        ns.promo_svg_root.selectAll('#promo_node_labels').remove();

        if (ns.promotable_sim) {
            ns.promotable_sim.stop();
            ns.promotable_sim = null;
        }
    };


    /**
     * Create an SRO between the two selected objects.
     *
     * Deliberately panel-agnostic: it reads only the SHARED selection tracker
     * (panelUtilsNs.selection) and raises events - it touches no Promo-specific state. The
     * Scratch panel calls this same function, because having two copies of this menu item is
     * exactly what caused os-threat#93 / #23: Scratch's copy skipped the types lookup and sent the raw
     * selection array, so its modal opened with no source, target or relationship type.
     * See alpha-launch docs/issues/0015.
     */
    /**
     * Remove the right-clicked object from unattached context.
     *
     * This used to raise `viz-open-form-remove-promo-sro` with action `OPEN_FORM_MODAL`, expecting
     * the host to open a confirm form that was never built — and it carried the author's open
     * question, *"What are we sending to the form from current selection?"*. Nothing on the host
     * listened, so the menu item was a silent no-op (alpha-launch docs/issues/0032).
     *
     * It now follows the **tree Copy** pattern, which is the only working precedent for an RMB
     * action that calls an API: raise the event under the API's own topic with componentAction
     * `BUTTON_CLICK`, and put the request body in `payload.data` — the host embed POSTs that
     * verbatim to the URL configured on the matching authored mapping.
     *
     * The body is the **raw node wrapper** (the object carrying `id` and `original`). Verified
     * against the live endpoint: `{force_object: …}` and `{tree_object: …}` both produce algorithm
     * error envelopes; the bare node works. Note that differs from copy-to-unattached, which wants
     * `{tree_object: …}` — the two sibling APIs genuinely disagree (docs/issues/0037).
     */
    ns.actionRemoveObject = () => {
        console.groupCollapsed("actionRemoveObject");
        const contextData = panelUtilsNs.getContentMenuData();
        console.log("context data for remove", contextData);

        const nodeData = contextData && contextData.data;
        if (!nodeData || !nodeData.id) {
            console.warn("actionRemoveObject: no object under the cursor, nothing to remove");
            panelUtilsNs.showNotification("error", "Remove failed: no object selected");
            console.groupEnd();
            return;
        }

        const eventName = "embed-force-remove";
        const componentId = `${eventName}::promo-panel`;
        const payload = {
            action: eventName,
            id: componentId,
            type: "force_action",
            data: nodeData,
        };
        const eventData = eventsNs.compileEventData(payload, eventName, "BUTTON_CLICK", componentId, {});

        panelUtilsNs.showNotification("loading", "Removing object...");

        // Supervise the round trip the same way the tree menu actions do: without this the object
        // is removed on the server but stays on screen until a reload, because nothing re-fetches
        // (alpha-launch docs/issues/0032). The source doc says it plainly for every one of these
        // RMB actions: "Refresh must be run afterwards".
        const actionTimeoutMs = 15000;
        let timeoutId = window.setTimeout(() => {
            panelUtilsNs.showNotification("error", "Remove failed: parent response timed out");
        }, actionTimeoutMs);

        const responseHandler = function(id, response) {
            window.clearTimeout(timeoutId);
            if (typeof panelUtilsNs.dismissAllNotifications === "function") {
                panelUtilsNs.dismissAllNotifications();
            }

            // Same two reply shapes the tree actions accept: an explicit payload.status, or the
            // host embed's {ok, data} contract merged into the original event.
            const payloadResponse = response && response.payload;
            let status = typeof (payloadResponse && payloadResponse.status) === "string" ? payloadResponse.status : "unknown";
            if (status === "unknown" && typeof (response && response.ok) === "boolean") {
                status = response.ok ? "success" : "error";
            }
            console.log("remove object response", { status: status, ok: response && response.ok, data: response && response.data });

            if (status === "success") {
                panelUtilsNs.showNotification("success", "Object removed");
                // Re-fetch so Promo and Scratch reflect the removal.
                if (window.Widgets && window.Widgets.Widget && typeof window.Widgets.Widget.requestData === "function") {
                    window.Widgets.Widget.requestData();
                } else {
                    console.warn("actionRemoveObject: no requestData() to refresh with");
                }
            } else {
                const detail = (payloadResponse && payloadResponse.message) || "Failed to remove object";
                panelUtilsNs.showNotification("error", detail);
            }
        };

        // Register before raising, to avoid racing the reply.
        eventsNs.registerEvent(eventName, eventsNs.eventListenerHandler, responseHandler);

        console.log(`raising ${eventName} for ${nodeData.id}`, eventData);
        eventsNs.raiseEvent(eventName, eventData);
        console.groupEnd();
    };

    ns.actionCreateSRO = () => {
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

                        /**
                         * ⚠️ A CRASHED algorithm answers HTTP 200 — check the body before using it.
                         * alpha-launch docs/issues/0167.
                         *
                         * `get-relationship-types` returns `{"error":"true","script.name":"req-….py"}`
                         * with a **200** when its Python raised. `reln_form_values` is then absent, so
                         * the very next line — `eventData.data.reln_form_values.source_ref` — threw a
                         * TypeError, this callback died, and **the modal was never opened**: no error,
                         * no toast, nothing. Measured against an invalid `network-traffic` object,
                         * whose `AtLeastOnePropertyError` cost hours of investigation precisely
                         * because the transport said 200 (docs/issues/0166).
                         *
                         * 🔑 The guard below (`if (!dataForForm.object.source_ref …)`) was written for
                         * this case and could never run — it sits *after* the dereference that throws.
                         * Checking first is what makes it reachable.
                         *
                         * ⬜ This is the caller-side half. The durable fix is for the runner to answer
                         * a non-2xx when its algorithm raised, so `response.ok` means what every caller
                         * already assumes — verified 2026-08-13 that **no** widget inspects `error`, so
                         * that change would break nothing.
                         */
                        const responseData = (eventData && eventData.data) || {}
                        if (String(responseData.error) === "true" || !responseData.reln_form_values) {
                            console.error(
                                "getRelationshipTypesCallback: the API returned an ERROR payload with HTTP 200 " +
                                "(docs/issues/0167) - not opening the modal. script=" +
                                (responseData["script.name"] || "(none)"),
                                responseData
                            );
                            panelUtilsNs.showNotification(
                                "error",
                                "Create SRO failed: the server could not work out the valid relationship types " +
                                "for these two objects. One of them may be incomplete."
                            );
                            console.groupEnd();
                            return;
                        }

                        // Shape must match the modal's field structure: sro-constraints nests its
                        // fields inside an "object" composite, so the payload is nested to match.
                        // (foreign-key-connections is flat - see getConnectionTypesCallback.)
                        let dataForForm = {
                            object: {
                                relationship_type: responseData.relationship_type_list,
                                source_ref: responseData.reln_form_values.source_ref,
                                target_ref: responseData.reln_form_values.target_ref,
                            }
                        }

                        console.log(
                            "getRelationshipTypesCallback -> dataForForm " +
                            `source_ref=${dataForForm.object.source_ref} target_ref=${dataForForm.object.target_ref} ` +
                            `types=${Array.isArray(dataForForm.object.relationship_type) ? dataForForm.object.relationship_type.length : typeof dataForForm.object.relationship_type}`
                        );
                        if (!dataForForm.object.source_ref || !dataForForm.object.target_ref) {
                            console.error(
                                "getRelationshipTypesCallback: no source/target to send - the modal will open empty. " +
                                "Expected eventData.data.reln_form_values.{source_ref,target_ref}, got:",
                                eventData && eventData.data
                            );
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
            };

    /**
     * Create a foreign-key connection between the two selected objects.
     *
     * Deliberately panel-agnostic: it reads only the SHARED selection tracker
     * (panelUtilsNs.selection) and raises events - it touches no Promo-specific state. The
     * Scratch panel calls this same function, because having two copies of this menu item is
     * exactly what caused os-threat#93 / #24: Scratch's copy skipped the types lookup and sent the raw
     * selection array, so its modal opened with no source, target or relationship type.
     * See alpha-launch docs/issues/0015.
     */
    ns.actionCreateConnection = () => {
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

                        // This must match the FIELD STRUCTURE of the modal it opens, and the two
                        // modals are not shaped the same:
                        //   sro-constraints        -> fields sit inside an "object" composite
                        //   foreign-key-connections -> fields sit at the TOP LEVEL, and the type
                        //                              field is named connection_field_list
                        // The form binds payload keys to field names by name, so wrapping these in
                        // "object" (copied from the SRO callback) meant nothing matched and the
                        // modal opened completely empty. See alpha-launch docs/issues/0018.
                        // The API returns the list as connection_field_list - the same name the form
                        // field uses - not connection_type_list. Verified against the algorithm's
                        // own output:
                        //   {"connection_field_list": ["created_by_ref"],
                        //    "connect_objects": {"source_ref": "...", "target_ref": "..."}}
                        // Reading the wrong key left the dropdown empty with everything else correct.
                        // docs/issues/0167 - a CRASHED algorithm answers HTTP 200 with
                        // {"error":"true","script.name":"req-....py"} instead of a result, so the
                        // transport cannot be used to tell success from failure. Unlike the SRO
                        // sibling this callback does not throw on that payload (connect_objects is
                        // defaulted below), so it degrades to opening a modal with an EMPTY form -
                        // which reads to a presenter as "it worked". Report it instead.
                        //
                        // Keyed on `error` ALONE, deliberately: an empty connection_field_list is a
                        // legitimate answer for a valid pair with no connectable fields, so testing
                        // the list here would fire on a working case. (The SRO guard must also test
                        // for its payload's absence, because there the absence is what throws.)
                        const responseData = (eventData && eventData.data) || {};
                        if (String(responseData.error) === "true") {
                            console.error("getConnectionTypesCallback: the API returned an ERROR payload with HTTP 200 " +
                                "(docs/issues/0167) - not opening the modal. script=" + (responseData["script.name"] || "(none)"), responseData);
                            panelUtilsNs.showNotification("error", "Create Connection failed: the server could not work out how these two objects can be connected. One of them may be incomplete.");
                            console.groupEnd(); return;
                        }

                        const connectObjects = (eventData.data && eventData.data.connect_objects) || {};
                        let dataForForm = {
                            connection_field_list: eventData.data.connection_field_list,
                            source_ref: connectObjects.source_ref,
                            target_ref: connectObjects.target_ref,
                        }

                        console.log(
                            "getConnectionTypesCallback -> dataForForm " +
                            `source_ref=${dataForForm.source_ref} target_ref=${dataForForm.target_ref} ` +
                            `types=${Array.isArray(dataForForm.connection_field_list) ? dataForForm.connection_field_list.length : typeof dataForForm.connection_field_list}`
                        );
                        if (!dataForForm.source_ref || !dataForForm.target_ref) {
                            console.error(
                                "getConnectionTypesCallback: no source/target to send - the modal will open empty. " +
                                "Expected eventData.data.connect_objects.{source_ref,target_ref}, got:",
                                eventData && eventData.data
                            );
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
            };

    /**
     * Promote the object under the cursor — and everything attached to it — into the incident.
     *
     * **Only the Promotable pane offers this** (alpha-launch decisions/0010, runsheet P3-S9): it is
     * deliberately absent from `panel.scratch.js`. GitHub #78 decides promotable-ness by TYPE, and
     * Promo/Scratch are both *inside* unattached, so Promote crosses a different boundary —
     * unattached into the incident.
     *
     * The API half moves a **sub-graph**, not one object, which is #84's wording: the route walks
     * `references` transitively from this node.
     *
     * Follows `actionRemoveObject` below, including its round-trip supervision and the refresh
     * afterwards — without which the object is moved on the server and stays on screen
     * (docs/issues/0032).
     */
    ns.actionPromote = () => {
        console.groupCollapsed("actionPromote");
        const contextData = panelUtilsNs.getContentMenuData();
        const nodeData = contextData && contextData.data;
        if (!nodeData || !nodeData.id) {
            console.warn("actionPromote: no object under the cursor, nothing to promote");
            panelUtilsNs.showNotification("error", "Promote failed: no object selected");
            console.groupEnd();
            return;
        }

        const eventName = "embed-force-promote";
        const componentId = `${eventName}::promo-panel`;
        const payload = {
            action: eventName,
            id: componentId,
            type: "force_action",
            data: nodeData,
        };
        const eventData = eventsNs.compileEventData(payload, eventName, "BUTTON_CLICK", componentId, {});

        panelUtilsNs.showNotification("loading", "Promoting sub-graph into the incident...");

        const actionTimeoutMs = 20000;
        let timeoutId = window.setTimeout(() => {
            panelUtilsNs.showNotification("error", "Promote failed: parent response timed out");
        }, actionTimeoutMs);

        const responseHandler = function(id, response) {
            window.clearTimeout(timeoutId);
            if (typeof panelUtilsNs.dismissAllNotifications === "function") {
                panelUtilsNs.dismissAllNotifications();
            }
            const payloadResponse = response && response.payload;
            let status = typeof (payloadResponse && payloadResponse.status) === "string" ? payloadResponse.status : "unknown";
            if (status === "unknown" && typeof (response && response.ok) === "boolean") {
                status = response.ok ? "success" : "error";
            }
            console.log("promote response", { status: status, ok: response && response.ok });

            if (status === "success") {
                // docs/issues/0087 Option 1 — the reply is NOT the settled state: the flow keeps
                // running after it answers (measured: an immediate refresh read 74→74 while the
                // promotion was still in flight). Keep a visible promoting state up and poll the
                // split until the target id has actually LEFT unattached, then refresh — the same
                // settled-state contract P3-S12 already proves in the suite.
                panelUtilsNs.showNotification("loading", "Promoting: waiting for the sub-graph to settle...");
                const finishRefresh = function(kind, message) {
                    if (typeof panelUtilsNs.dismissAllNotifications === "function") {
                        panelUtilsNs.dismissAllNotifications();
                    }
                    panelUtilsNs.showNotification(kind, message);
                    // Both panes change: the sub-graph leaves unattached entirely.
                    if (window.Widgets && window.Widgets.Widget && typeof window.Widgets.Widget.requestData === "function") {
                        window.Widgets.Widget.requestData();
                    } else {
                        console.warn("actionPromote: no requestData() to refresh with");
                    }
                };
                const splitUrl = (window.Widgets && window.Widgets.Widget && typeof window.Widgets.Widget.apiBase === "function")
                    ? window.Widgets.Widget.apiBase() + "/viz-data/unattached-split"
                    : null;
                if (!splitUrl) {
                    finishRefresh("success", "Promoted into the incident");
                } else {
                    const settleStarted = Date.now();
                    const SETTLE_POLL_MS = 1500;
                    const SETTLE_BUDGET_MS = 30000;
                    const settlePoll = function() {
                        fetch(splitUrl)
                            .then(function(r) { return r.json(); })
                            .then(function(split) {
                                const stillUnattached = JSON.stringify(split).indexOf(nodeData.id) !== -1;
                                if (!stillUnattached) {
                                    console.log("actionPromote: settled after " + (Date.now() - settleStarted) + "ms");
                                    finishRefresh("success", "Promoted into the incident");
                                } else if (Date.now() - settleStarted > SETTLE_BUDGET_MS) {
                                    // honest, not alarming: the write is running, the panes just have
                                    // not caught up inside the budget.
                                    finishRefresh("warning", "Promotion is still settling — the panes will catch up shortly");
                                } else {
                                    window.setTimeout(settlePoll, SETTLE_POLL_MS);
                                }
                            })
                            .catch(function(pollError) {
                                console.warn("actionPromote: settle poll failed, refreshing anyway", pollError);
                                finishRefresh("success", "Promoted into the incident");
                            });
                    };
                    window.setTimeout(settlePoll, SETTLE_POLL_MS);
                }
            } else {
                const detail = (payloadResponse && payloadResponse.message) || "Failed to promote";
                panelUtilsNs.showNotification("error", detail);
            }
        };

        eventsNs.registerEvent(eventName, eventsNs.eventListenerHandler, responseHandler);
        console.log(`raising ${eventName} for ${nodeData.id}`, eventData);
        eventsNs.raiseEvent(eventName, eventData);
        console.groupEnd();
    };

    ns.menuItems = [
        {
            label: "Create SRO",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => ns.actionCreateSRO(),
        },
        {
            label: "Promote",
            icon: '<i class="fa-solid fa-arrow-up-from-bracket"></i>',
            action: () => ns.actionPromote(),
        },
        {
            label: "Create Connection",
            icon: '<i class="fa-regular fa-handshake"></i>',
            action: () => ns.actionCreateConnection(),
        },
        {
            label: "Remove",
            icon: '<i class="fa-solid fa-broom"></i>',
            action: () => ns.actionRemoveObject(),
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

        // docs/issues/0102 — two defects fixed here. Both only bite because the host's event
        // fan-out broadcasts this event to EVERY mapping on the component instead of just the one
        // it names (that is the trigger, and it is defect 1, in the page events clientlib — see the
        // issue's Option 4). While that stands, the `…-object` mapping also fires on this event and
        // builds its URL from these keys, so they must be right.
        //
        // Defect 2 — KEY CASE. These were `objectForm` / `objectGroup` / `objectFamily`, but the
        // authored template reads `$.config.object_family` etc. and `replaceRegex` substitutes ""
        // for an unmatched key. All three missed, producing
        //   …/stixorm-forms///-forms/-update.html   -> the CMS 404 that ended Act 3's headline write.
        // The sibling emitters already use snake_case (`formOpenConnection` below; the leftclick
        // path in panel._utils.js), so this function was the outlier.
        //
        // Defect 3 — WRONG OBJECT. These read `eventObjectData.source.*`, i.e. the classification of
        // the object the relationship starts FROM (e.g. stix-forms/sdo-forms/identity). What was
        // just created is the relationship, so with the key case alone fixed this would have opened
        // *identity-update.html* — a wrong form rather than a broken one. A relationship's own
        // classification is fixed in this dialect and is what the store carries for SRO nodes
        // (verified: relationship nodes in /viz-data/unattached-split carry exactly these three).
        // Domain vocabulary is allowed here — this is an os-triage application-layer widget, not the
        // generic template (CLAUDE.md, Data-Agnostic Repositories).
        const objectFamily = "stix-forms";
        const objectGroup = "sro-forms";
        const objectForm = "relationship";
        let formAction = "create"

        const eventName = "embed-viz-event-open-stixorm-forms-sro-forms-relationship-form";
        const formId = eventName;
        const config = {
            formId: formId,
            object_form: objectForm,
            object_group: objectGroup,
            object_family: objectFamily,
            formAction: formAction,
        };
        console.log("formOpenCRO classification (relationship, not source)", config);
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

        ns.clearData();

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

        // The node-label decision is taken ONCE here and reused for the node labels further down, so
        // the edges and the icons can never disagree about which of them is carrying the text.
        ns.promoNodeLabelsOn = panelUtilsNs.shouldLabel(panelUtilsNs.split.promo.nodes, 'promo');

        ns.promoEdgelabelsText = ns.promoEdgelabels
            .append('textPath') //To render text along the shape of a <path>, enclose the text in a <textPath> element that has an href attribute with a reference to the <path> element.
            .attr('xlink:href', function(d, i) {
                return '#pedgepath' + i;
            })
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .attr('startOffset', '50%')
            // decision 0040 Option 1 — quiet on a design-sized pane, fallback text on a dense one.
            .text(panelUtilsNs.shouldLabelEdges(ns.promoNodeLabelsOn, 'promo') ? (d) => d.name : '');

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

        /**
         * Name each Promotable object under its icon — docs/issues/0159, matching the Scratch pane.
         *
         * ⚠️ **Gated on node count, deliberately.** `image5.png` shows ~8 objects here and the build
         * currently has **64**; at that density labels overlap into a grey mat that is worse than no
         * labels at all. `shouldLabel()` suppresses them above the threshold **and logs why**, so a
         * pane with no names reads as a decision rather than a bug — and the labels come back on
         * their own once alpha-launch docs/issues/0138 phase 2 prunes the pane, with no further code
         * change needed.
         *
         * `pointer-events: none` is required, not tidy: these sit over the icons' click targets and
         * P3-S5 (*left-select opens that object's Update form*) is Act 3's headline step.
         */
        if (ns.promoNodeLabelsOn) {
            ns.promoNodeLabel = ns.promo_svg_root
                .append('g')
                .attr('id', 'promo_node_labels')
                .selectAll('text')
                .data(panelUtilsNs.split.promo.nodes)
                .join('text')
                .attr('class', 'pnode-label')
                .style('pointer-events', 'none')
                .style('user-select', 'none')
                .style('text-anchor', 'middle')
                .style('fill', panelUtilsNs.theme.svgName)
                .attr('font-size', panelUtilsNs.LABEL_PX)
                .text(panelUtilsNs.nodeLabel);
        }

        ns.promotable_sim
            .nodes(panelUtilsNs.split.promo.nodes)
            .on('tick', function() {
                // console.log(['promotable_sim ticked',this, ns.promo_svg
                // .selectAll('.plinks')]);

                // Keep nodes inside the panel before anything reads their coordinates, so nodes,
                // links and edge paths all agree. Without this the charge force spreads ~29 nodes
                // past the panel edges and some become unreachable without panning
                // (alpha-launch docs/issues/0065). Resolved at call time because the build
                // concatenates src/js/**/*.js alphabetically.
                // ⚠️ `this.nodes()`, not `panelUtilsNs.split.promo.nodes`. showGraph reassigns
                // `panelUtilsNs.split` on every refresh, while the simulation keeps ticking the array
                // it was constructed with — so reaching through the namespace can clamp a *different*
                // array than the one being rendered, and some nodes escape. Measured: nodes still
                // 5-7px outside with the namespace reference.
                window.Widgets.Panel.ForceGraph.clampNodesToPanel(
                    this.nodes(),
                    '#promo_panel',
                    ns.options.iconSize
                );

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

                // docs/issues/0159 — keep each label under its own icon. A no-op selection when
                // labels are suppressed, so this costs nothing at 64 nodes.
                ns.promo_svg_root
                    .selectAll('.pnode-label')
                    .attr('x', (d) => d.x)
                    .attr('y', (d) => d.y + ns.options.iconSize / 2 + panelUtilsNs.LABEL_GAP_PX);
        
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
                // alpha-launch docs/issues/0078 - do NOT reach for collide strength/iterations here.
                // Tried 2026-08-11 (.strength(1).iterations(3)) and A/B measured on the same
                // fixture: 3 of 70 nodes occluded WITHOUT it, 4 of 70 WITH it - no improvement, and
                // inside the run-to-run noise of a stochastic layout.
                //
                // The reason it cannot help: in both arms every surviving overlap sat on a CLAMP
                // boundary (y = 9, 18, 319), and clampNodesToPanel runs AFTER the simulation on each
                // tick. No force can undo a clamp applied downstream of it. The lever is the
                // separation pass in panel.forcegraph.js, not this force.
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

        ns.promotable_sim.alpha(1).restart();

          
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
        // Re-heat once so the freed node can find a new position, then let alpha decay back to
        // rest. This used to set alphaTarget(0.9) and never clear it - alphaTarget is the value
        // alpha decays *towards*, so the simulation could never fall below 0.9 and would run
        // forever, burning CPU and leaving nodes permanently in motion.
        if (!event.active) {
            ns.promotable_sim.alphaTarget(0).alpha(0.9);
            // Step the layout here rather than calling restart(): d3's animation timer does not
            // run in this widget (see ForceGraph.settle), so a restart() alone leaves alpha
            // pinned at 0.9 and nothing ever moves or comes to rest.
            const forceGraphNs = window.Widgets.Panel.ForceGraph;
            if (forceGraphNs && typeof forceGraphNs.settle === "function") {
                forceGraphNs.settle("Promo", ns, "promotable_sim");
            } else {
                console.warn("releasenode: ForceGraph.settle unavailable, layout will not re-settle");
            }
        }
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

            // Keep the SVG the size of its pane. Built once from a container that may not have
            // been laid out yet, an oversized SVG covers the neighbouring pane and swallows its
            // clicks (alpha-launch docs/issues/0058).
            panelUtilsNs.observePanelResize($component, '#promo_panel');

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