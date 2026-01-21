/* global describe, it, cy, beforeEach */
describe("Widget Mode Communication", () => {
  let fixtureData;

  beforeEach(() => {
    // Pre-load fixture data before setting up event listeners
    cy.fixture("src/assets/data/tree-task.json").then((data) => {
      fixtureData = data;
    });

    cy.visit("/");
    cy.waitForWidgetReady();
    
    // Debug: Check if widget is in widget mode
    cy.window().then((win) => {
      // Check if isLocalMode function exists and what it returns
      if (win.Widgets && win.Widgets.Panel && win.Widgets.Panel.Tree && win.Widgets.Panel.Tree.isLocalMode) {
        const isLocal = win.Widgets.Panel.Tree.isLocalMode();
        console.log("isLocalMode check:", isLocal);
        console.log("Current URL:", win.location.href);
        console.log("Search params:", win.location.search);
      } else {
        console.warn("isLocalMode function not found");
      }
      
      // Debug: Check if widget init was called
      if (win.Widgets && win.Widgets.Widget) {
        console.log("Widget namespace found:", win.Widgets.Widget);
      } else {
        console.warn("Widget namespace not found");
      }
    });
    
    // Listen for DATA_REQUEST and respond with fixture
    cy.window().then((win) => {
      // Debug: Log all postMessage events
      cy.spy(win, "postMessage").as("postMessage");
      
      win.addEventListener("message", (event) => {
        console.log("Cypress received message:", event.data);
        let eventData = event.data;
        
        // Handle both string and object payloads
        if (typeof eventData === 'string') {
          try {
            eventData = JSON.parse(eventData);
            console.log("Parsed JSON eventData:", eventData);
          } catch (e) {
            console.warn('Failed to parse event data as JSON:', eventData);
            return;
          }
        }
        
        console.log("Processing eventData:", eventData);
        
        if (
          eventData &&
          eventData.action === "DATA_REQUEST" &&
          eventData.payload &&
          eventData.payload.id === "scratch"
        ) {
          console.log("Found DATA_REQUEST for scratch, responding with fixture data");
          
          win.postMessage({
            ...eventData,
            target: "iframe-embed_BD8EU3LCD",
            topicName: eventData.type,
            eventName: "readaction",
            endpointConfig: {
              method: "GET",
              url: "https://flow.typerefinery.localhost:8101/viz-data/tree-task"
            },
            url: "https://flow.typerefinery.localhost:8101/viz-data/tree-task",
            method: "GET",
            payloadType: "application/json",
            body: null,
            ok: true,
            data: fixtureData
          }, "*");
        }
      });
    });
  });

  it("should load widget in widget mode", () => {
    // Test that widget loads without local parameter
    cy.get('[component="graphviz"]').should("be.visible");
    cy.get("#tree_panel").should("exist");
    cy.get("#filter_panel").should("exist");
    
    // Widget should be in widget mode (no local parameter)
    cy.url().should("not.include", "local=true");
  });

  it("should handle manual data request", () => {
    // Manually trigger a data request by sending a message to the widget
    cy.window().then((win) => {
      win.postMessage({
        type: "embed-viz-event-payload-data-unattached-force-graph",
        action: "DATA_REQUEST",
        payload: {
          id: "scratch",
          type: "load"
        },
        data: fixtureData
      }, "*");
    });
    
    // Wait for data to be processed
    cy.wait(2000);
    
    // Check that the widget shows some content (even if not specific task data)
    cy.get("#tree_panel").should("not.be.empty");
  });

  it("should handle parent app errors", () => {
    cy.window().then((win) => {
      win.postMessage(
        {
          type: "embed-viz-event-payload-data-unattached-force-graph",
          error: "Parent app error",
        },
        "*"
      );
    });
    
    // Check for error notification
    cy.get(".toastify").should("contain", "Failed to load data");
  });

  it("should handle missing data from parent", () => {
    cy.window().then((win) => {
      win.postMessage(
        {
          type: "embed-viz-event-payload-data-unattached-force-graph",
          // No data provided
        },
        "*"
      );
    });
    
    // Check for error notification
    cy.get(".toastify").should("contain", "No data found");
  });
}); 

describe("Widget Mode - Data Load Event Listener Leak", () => {
    it("should only load data once per trigger (no event listener leak)", () => {
        cy.visit("http://localhost:4005/");
        cy.waitForWidgetReady();
        cy.window().then((win) => {
            const widget = win.Widgets && win.Widgets.Widget;
            if (widget && widget.loadData) {
                cy.spy(widget, "loadData").as("loadDataSpy");
            }
        });
        // Now trigger a data load by sending a postMessage
        cy.window().then((win) => {
            win.postMessage({
                type: "embed-viz-event-payload-data-unattached-force-graph",
                action: "DATA_REQUEST",
                payload: {
                    id: "scratch",
                    type: "load"
                },
                data: { nodes: [], edges: [] }
            }, "*");
        });
        cy.wait(1000); // Wait for the data load to process
        cy.get("@loadDataSpy").should("have.been.calledOnce");
    });
}); 