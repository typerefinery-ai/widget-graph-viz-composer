window.Widgets.Events = {};

//define your function
(function($, ns) {

    //only works on same origin
    //listen for broadcast messages on dedicated channel
    ns.broadcastChannel = new BroadcastChannel('widget:embed');

    //TODO: need to add ability to persist listeners between refreshes and reload them on load, when page is reloaded the event listeners should be reinstated.

    //only works on same origin
    ns.broadcastListener = function(callback) {
        console.group(`broadcastListener on ${window.location}`);
        console.log("broadcastChannel set onmessage", ns.broadcastChannel);
        ns.broadcastChannel.onmessage = function(event) {
            console.groupCollapsed(`widget broadcastListener on ${window.location}`);

            try {

                let eventData = event.data;
                let sourceWindow = event.source;
                let sourceOrigin = event.origin;

                console.log('eventData', eventData);
                console.log('sourceWindow', sourceWindow);
                console.log('sourceOrigin', sourceOrigin);

                if (eventData) {
                    let sourceData = eventData;
                    console.log('sourceData', sourceData);

                    if (typeof sourceData === 'string') {
                        sourceData = JSON.parse( sourceData );
                    }
                    //is message for parent?
                    if (sourceData.target === 'parent') {
                        throw new Error('ignoring, message for parent, possible loop or no parent');
                    }        

                    if (!sourceData) {
                        throw new Error('no sourceData');
                    }
                    if (callback) {
                        console.log('calling callback', callback);
                        callback(sourceData);
                        console.log('callback called', callback);
                    }
                } else {
                    console.warn('no eventData');
                }

            } catch (error) {
                console.error("Error in broadcastListener", error);
            } finally {
                console.groupEnd();
            }
        }
        console.log("broadcastChannel set onmessage done");
        console.groupEnd();
    };

    /**
     * Compile event data
     * @param {Object} payload data to be sent
     * @param {String} eventName name of the event / type / topicName
     * @param {String} action action to be taken by the event, this is undestood by the component
     * @param {String} componentId id of the component, relevant for the component
     * @param {Object} config additional config for the event
     * @param {String} target possible target for the event, default is "parent", parent will be ignored by windowListener
     */
    ns.compileEventData = (payload, eventName, action, componentId, config, target) => ({ 
        topic: eventName, 
        type: eventName, 
        payload: payload, 
        action: action, 
        componentId: componentId, 
        config: config,
        target: target || "parent"
    });

    /**
     * register a listener for a specific event
     * @param {String} eventName name of the event / type / topicName
     * @param {Function} callback function to be called when the event is triggered
     */
    ns.windowListenerForEvent = function(eventName, callback) {
        console.group(`windowListener on ${window.location}`);
        window.addEventListener("message", function(event) {
            console.groupCollapsed(`widget windowListener for ${eventName} on ${window.location}`);

            try {
                let eventData = event.data;
                let sourceWindow = event.source;
                let sourceOrigin = event.origin;

                console.log('eventData', eventData);
                console.log('sourceWindow', sourceWindow);
                console.log('sourceOrigin', sourceOrigin);

                if (eventData) {
                    let sourceData = eventData;
                    console.log('sourceData', sourceData);

                    if (typeof sourceData === 'string') {
                        sourceData = JSON.parse( sourceData );
                    }

                    let type = sourceData.type;
                    console.log('type', type);

                    if (type === eventName) {
                        //is message for parent?
                        if (sourceData.target === 'parent') {
                            throw new Error('ignoring, message for parent, possible loop or no parent');
                        }        

                        if (!sourceData) {
                            throw new Error('no sourceData');
                        }
                        if (callback) {
                            console.log('calling callback', callback);
                            callback(sourceData);
                            console.log('callback called', callback);
                        }
                    } else {
                        console.log('ignoring, not for this event', type);
                    }
                } else {
                    console.warn('no eventData');
                }
            
            } catch (error) {
                console.error("Error in windowListenerForEvent", error);
            } finally {
                console.log("windowListenerForEvent done");
                console.groupEnd();
            }

        });
        console.groupEnd();
    }

    /**
     * register a listener for all events
     * @param {Function} callback function to be called when the event is triggered
     */
    ns.windowListener = function(callback) {
        console.group(`windowListener on ${window.location}`);
        window.addEventListener("message", function(event) {
            console.groupCollapsed(`widget windowListener on ${window.location}`);
            let eventData = event.data;
            let sourceWindow = event.source;
            let sourceOrigin = event.origin;

            console.log('eventData', eventData);
            console.log('sourceWindow', sourceWindow);
            console.log('sourceOrigin', sourceOrigin);

            if (eventData) {
                let sourceData = eventData;
                console.log('sourceData', sourceData);

                if (typeof sourceData === 'string') {
                    sourceData = JSON.parse( sourceData );
                }
                //is message for parent?
                if (sourceData.target === 'parent') {
                    console.log('ignoring, message for parent, possible loop or no parent');
                    console.groupEnd();
                    return;
                }        

                if (!sourceData) {
                    console.log('no sourceData');
                    console.groupEnd();
                    return;
                }
                if (callback) {
                    console.log('calling callback', callback);
                    callback(sourceData);
                    console.log('callback called', callback);
                }
            } else {
                console.warn('no eventData');
            }

            console.groupEnd();
        });
        console.groupEnd();
    }
    
    ns.raiseEvent = function(eventName, data) {
        console.group(`raiseEvent on ${window.location}`);
        let event = new CustomEvent(eventName, {
          detail: data,
        });
        console.log("event", event);
        console.log("window.parent", window.parent);

        if (window.parent) {
          window.parent.postMessage(JSON.stringify(data), "*");
          console.log("postMessage to parent", data);
        } else {
          window.dispatchEvent(event);
          console.warn("this doc is not in iFrame, dispatchEvent", event);
        }
        console.groupEnd();
    }

    //temp event listeners for events
    ns.eventListeners = new Map();

    // eslint-disable-next-line arrow-body-style
    ns.generateEventControllerId = (id) => {
        return `ts.widget.event.${id}`;
    };

    //create a new function for this id and store it ns.eventListeners map that will use abortcontroller to abort listener when done.
    ns.registerEvent = (id, handler, callback) => {
        console.log("registering event");
        //listen for global message events that are emited by iframe
        let eventHandlerId = ns.generateEventControllerId(id);
        let controller = new AbortController();
        // create a new function for this id and store it ns.eventListeners map
        ns.eventListeners.set(eventHandlerId, {
            "id": eventHandlerId,
            "handler": handler, 
            "callback": callback, 
            "controller": controller
        });

        // add event listener for message event from ns.eventListeners map
        window.addEventListener('message', ns.eventListeners.get(eventHandlerId).handler, {
            signal: ns.eventListeners.get(eventHandlerId).controller.signal
        });
        console.log("event listener added", eventHandlerId);
        console.log("event listeners", ns.eventListeners);
    };
  
    ns.unregisterEvent = (eventHandlerId) => {
        console.log(`unregistering event for ${eventHandlerId}`, ns.eventListeners);
        console.log("eventHandlerId", eventHandlerId, ns.eventListeners.size, ns.eventListeners.keys());
        if (ns.eventListeners.has(eventHandlerId)) {
            let eventListenerObject = ns.eventListeners.get(eventHandlerId);
            console.log("eventListenerObject", eventListenerObject);
            if (eventListenerObject) {
                let {controller} = eventListenerObject;
                console.log("controller", controller);
                // abort the event listener
                controller.abort();
                ns.eventListeners.delete(eventHandlerId); // Remove it from the map
            } else {
                console.warn(`event listener object for ${eventHandlerId} not found`);
            }

        } else {
            console.warn(`event listener for ${eventHandlerId} not found`);
        }
    };

    ns.unredisterAllEvents = () => {
        console.log("unregistering all events");
        let eventHandlerId = ns.generateEventControllerId("");
       // find all event that start with prefix and abort them.
        ns.eventListeners.forEach((value, key) => {
          if(key.startsWith(eventHandlerId)) {
            console.log(["aborting event", key]);
            value.controller.abort();
            ns.eventListeners.delete(key);
          }
        });
    };

    // generic event handler that closed event listener
    ns.eventListenerHandler = (event) => {
        console.groupCollapsed(`widget eventListenerHandler on ${window.location}`);
        let eventType = event.type;
        let eventSource = event.source;
        let eventOrigin = event.origin;
        let eventDataRaw = event.data;
        console.log(["eventType", eventType, "eventSource", eventSource, "eventOrigin", eventOrigin, "eventData", eventDataRaw]);

        let eventData = eventDataRaw;
        if (typeof eventDataRaw === 'string') {
            try {
                eventData = JSON.parse(eventDataRaw);
            } catch (parseError) {
                console.error("Failed to parse event data payload", parseError);
                console.groupEnd();
                return;
            }
        } else if (!eventDataRaw || typeof eventDataRaw !== 'object') {
            console.warn("eventListenerHandler encountered unsupported event data shape", eventDataRaw);
            console.groupEnd();
            return;
        }

        let sourceWindow = event.source;
        let sourceOrigin = event.origin;

        console.log('sourceWindow', sourceWindow);
        console.log('sourceOrigin', sourceOrigin);

        let eventDataPayloadAction = eventData?.payload?.action;
        let eventHandlerId = ns.generateEventControllerId(eventDataPayloadAction);

        //do we have event regitered for this event?
        if (ns.eventListeners.has(eventHandlerId)) {
            let {id, callback} = ns.eventListeners.get(eventHandlerId);
            console.log(["id", id, "callback", callback]);

            console.log(["sourceWindow", sourceWindow, "sourceOrigin", sourceOrigin, "eventData", eventData]);

            let sourceData = eventData;

            if (sourceData) {
                console.log(["sourceData", sourceData]);

                if (callback) {
                  callback(id, sourceData, eventHandlerId);
                }
                ns.unregisterEvent(id);
            }
        }

        console.groupEnd();
    }


})(window.jQuery, window.Widgets.Events);