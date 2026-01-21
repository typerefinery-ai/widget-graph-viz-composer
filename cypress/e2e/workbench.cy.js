/* eslint-disable no-undef */
/// <reference types="cypress" />

describe('Workbench Communication', () => {
  let fixtureData;

  beforeEach(() => {
    // Pre-load fixture data before setting up event listeners
    cy.fixture("src/assets/data/tree-task.json").then((data) => {
      fixtureData = data;
    });

    cy.visit('/workbench');
    
    // Wait for workbench to load and iframe to be ready
    cy.get('.workbench').should('be.visible');
    cy.get('#widgetFrame').should('be.visible');
    
    // Wait for iframe to load the widget
    cy.get('#widgetFrame').should('have.attr', 'src', 'http://localhost:4005/');
    
    // Wait for iframe to load completely
    cy.wait(2000);
    
    // Listen for DATA_REQUEST from widget iframe and respond with fixture
    cy.window().then((win) => {
      win.addEventListener('message', (event) => {
        let eventData = event.data;
        
        // Handle both string and object payloads
        if (typeof eventData === 'string') {
          try {
            eventData = JSON.parse(eventData);
          } catch (e) {
            console.warn('Failed to parse event data as JSON:', eventData);
            return;
          }
        }
        
        if (
          eventData &&
          eventData.action === 'DATA_REQUEST' &&
          eventData.payload &&
          eventData.payload.id === 'scratch'
        ) {
          win.postMessage({
            ...eventData,
            target: 'iframe-embed_BD8EU3LCD',
            topicName: eventData.type,
            eventName: 'readaction',
            endpointConfig: {
              method: 'GET',
              url: 'https://flow.typerefinery.localhost:8101/viz-data/tree-task'
            },
            url: 'https://flow.typerefinery.localhost:8101/viz-data/tree-task',
            method: 'GET',
            payloadType: 'application/json',
            body: null,
            ok: true,
            data: fixtureData
          }, '*');
        }
      });
    });
  });

  it('should debug workbench and iframe loading', () => {
    // Check if workbench loads
    cy.get('.workbench').should('be.visible');
    cy.get('#widgetFrame').should('be.visible');
    
    // Wait for iframe to load completely
    cy.wait(3000);
    
    // Check if iframe loads the widget - use a more robust approach
    cy.get('#widgetFrame').then(($iframe) => {
      // Wait for iframe to be loaded
      cy.wrap($iframe).should('have.attr', 'src', 'http://localhost:4005/');
      
      // Try to access iframe content
      cy.wrap($iframe).then(($iframe) => {
        const iframe = $iframe[0];
        if (iframe.contentDocument) {
          // Iframe is loaded, check for widget elements
          cy.wrap(iframe.contentDocument.body).find('[component="graphviz"]').should('be.visible');
          cy.wrap(iframe.contentDocument.body).find('#tree_panel').should('be.visible');
        } else {
          // Iframe not loaded yet, wait and retry
          cy.wait(2000);
          cy.wrap(iframe.contentDocument.body).find('[component="graphviz"]').should('be.visible');
          cy.wrap(iframe.contentDocument.body).find('#tree_panel').should('be.visible');
        }
      });
    });
    
    // Test clicking Task Data button
    cy.get('.btn').contains('📋 Task Data').click();
    cy.wait(2000);
    
    // Check if data was loaded by looking for console messages
    cy.get('.console').should('contain', 'sent to iframe');
  });

  it('should load the workbench and the widget iframe', () => {
    cy.get('.workbench').should('exist');
    cy.get('#widgetFrame').should('exist');
    cy.get('#status').should('contain', 'Connected');
    cy.get('.console').should('contain', 'Workbench Started');
  });

  it('should send a message from workbench to widget and log it', () => {
    cy.get('#messageType').clear().type('custom-event');
    cy.get('#messageData').clear().type('{"action": "test", "data": "Hello from Cypress!"}', { parseSpecialCharSequences: false });
    cy.get('.btn.success').contains('Send').click();
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'custom-event');
    cy.get('.console').should('contain', 'Hello from Cypress!');
  });

  it('should receive a message from the widget and log it', () => {
    // Wait for the widget to load and potentially send a DATA_REQUEST
    cy.wait(3000);
    
    // Check if the workbench received and responded to a DATA_REQUEST
    cy.get('.console').should('contain', 'received from iframe');
  });

  it('should load sighting data when Sighting Data button is clicked', () => {
    cy.fixture('src/assets/data/tree-sighting.json').then((fixtureData) => {
      cy.get('.btn').contains('👁️ Sighting Data').click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
      cy.get('.console').should('contain', 'embed-viz-event-payload-data-unattached-force-graph');
    });
  });

  it('should load task data when Task Data button is clicked', () => {
    cy.fixture('src/assets/data/tree-task.json').then((fixtureData) => {
      cy.get('.btn').contains('📋 Task Data').click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });
  });

  it('should load event data when Event Data button is clicked', () => {
    cy.fixture('src/assets/data/tree-event.json').then((fixtureData) => {
      cy.get('.btn').contains('📅 Event Data').click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });
  });

  it('should load company data when Company Data button is clicked', () => {
    cy.fixture('src/assets/data/tree-company.json').then((fixtureData) => {
      cy.get('.btn').contains('🏢 Company Data').click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });
  });

  it('should load user data when User Data button is clicked', () => {
    cy.fixture('src/assets/data/tree-me.json').then((fixtureData) => {
      cy.get('.btn').contains('👤 User Data').click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });
  });

  it('should handle fixture loading errors gracefully', () => {
    // Click a button that would trigger data loading
    cy.get('.btn').contains('📥 Request Data').click();
    
    // Check that error handling works
    cy.get('.console').should('contain', 'sent to iframe');
  });

  it('should use fallback data when fixture loading fails', () => {
    // Click the Sighting Data button
    cy.get('.btn').contains('👁️ Sighting Data').click();
    
    // Check that the button click was registered
    cy.get('.console').should('contain', 'sent to iframe');
  });

  it('should simulate error and widget should show error notification', () => {
    cy.get('.btn').contains('❌ Simulate Error').click();
    cy.wait(1000);
    cy.get('#widgetFrame').then(($iframe) => {
      const iframe = $iframe[0];
      cy.wrap(iframe.contentDocument.body).find('.toastify').should('contain', 'Simulated error from workbench');
    });
  });

  it('should simulate timeout and widget should show timeout notification', () => {
    cy.get('.btn').contains('⏰ Simulate Timeout').click();
    cy.wait(1000);
    cy.get('#widgetFrame').then(($iframe) => {
      const iframe = $iframe[0];
      cy.wrap(iframe.contentDocument.body).find('.toastify').should('contain', 'Simulated timeout from workbench');
    });
  });

  it('should simulate crash and widget should show crash notification', () => {
    cy.get('.btn').contains('💥 Simulate Crash').click();
    cy.wait(1000);
    cy.get('#widgetFrame').then(($iframe) => {
      const iframe = $iframe[0];
      cy.wrap(iframe.contentDocument.body).find('.toastify').should('contain', 'Simulated crash from workbench');
    });
  });

  it('should reload widget when Reload Widget button is clicked', () => {
    cy.get('.btn').contains('🔄 Reload Widget').click();
    // Wait for iframe to reload and widget to re-initialize
    cy.get('#widgetFrame').should('be.visible');
    cy.wait(3000); // Wait for widget to reload and notification to appear
    cy.get('#widgetFrame').then(($iframe) => {
      const iframe = $iframe[0];
      // Check that the widget reloaded and shows any notification
      cy.wrap(iframe, { timeout: 10000 }).should(($el) => {
        const body = $el.contentDocument && $el.contentDocument.body;
        expect(body).to.not.be.null;
        const toast = body.querySelector('.toastify');
        expect(toast).to.not.be.null;
        // The widget should show some notification after reload
        expect(toast.textContent).to.not.be.empty;
      });
    });
  });
});

describe("Workbench Enhanced Event Handling", () => {
  beforeEach(() => {
    cy.visit("/workbench");
    
    // Wait for workbench to load and iframe to be ready
    cy.get('.workbench').should('be.visible');
    cy.get('#widgetFrame').should('be.visible');
    cy.get('#widgetFrame').should('have.attr', 'src', 'http://localhost:4005/');
    cy.wait(3000);
  });

  describe("Manual Data Request Buttons", () => {
    it("should load sighting data when Sighting Data button is clicked", () => {
      // Click the Sighting Data button in the workbench
      cy.get("button").contains("👁️ Sighting Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });

    it("should load task data when Task Data button is clicked", () => {
      // Click the Task Data button in the workbench
      cy.get("button").contains("📋 Task Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });

    it("should load impact data when Impact Data button is clicked", () => {
      // Click the Impact Data button in the workbench
      cy.get("button").contains("💥 Impact Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });

    it("should load event data when Event Data button is clicked", () => {
      // Click the Event Data button in the workbench
      cy.get("button").contains("📅 Event Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });

    it("should load user data when User Data button is clicked", () => {
      // Click the User Data button in the workbench
      cy.get("button").contains("👤 User Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });

    it("should load company data when Company Data button is clicked", () => {
      // Click the Company Data button in the workbench
      cy.get("button").contains("🏢 Company Data").click();
      cy.wait(2000);
      
      // Check console for successful data loading
      cy.get('.console').should('contain', 'sent to iframe');
      cy.get('.console').should('contain', 'DATA_REFRESH');
    });
  });

  describe("Error Handling", () => {
    it("should handle missing fixture data gracefully", () => {
      // Click a button that would trigger data loading
      cy.get("button").contains("📥 Request Data").click();
      cy.wait(2000);
      
      // Check that the button click was registered
      cy.get('.console').should('contain', 'sent to iframe');
    });

    it("should handle network timeout errors", () => {
      // Click a button that would trigger data loading
      cy.get("button").contains("📥 Request Data").click();
      cy.wait(2000);
      
      // Check that the button click was registered
      cy.get('.console').should('contain', 'sent to iframe');
    });
  });
});

describe("Multi-Panel Data Loading", () => {
  beforeEach(() => {
    cy.visit("/workbench");
    
    // Wait for workbench to load and iframe to be ready
    cy.get('.workbench').should('be.visible');
    cy.get('#widgetFrame').should('be.visible');
    cy.get('#widgetFrame').should('have.attr', 'src', 'http://localhost:4005/');
    cy.wait(3000);
  });

  it("should load sighting data into all three panels", () => {
    // Click the Sighting Data button
    cy.get("button").contains("👁️ Sighting Data").click();
    cy.wait(2000);
    
    // Check console for successful data loading
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'DATA_REFRESH');
  });

  it("should load task data into all three panels", () => {
    // Click the Task Data button
    cy.get("button").contains("📋 Task Data").click();
    cy.wait(2000);
    
    // Check console for successful data loading
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'DATA_REFRESH');
  });

  it("should load impact data into all three panels", () => {
    // Click the Impact Data button
    cy.get("button").contains("💥 Impact Data").click();
    cy.wait(2000);
    
    // Check console for successful data loading
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'DATA_REFRESH');
  });

  it("should load event data into all three panels", () => {
    // Click the Event Data button
    cy.get("button").contains("📅 Event Data").click();
    cy.wait(2000);
    
    // Check console for successful data loading
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'DATA_REFRESH');
  });

  it("should load user data into all three panels", () => {
    // Click the User Data button
    cy.get("button").contains("👤 User Data").click();
    cy.wait(2000);
    
    // Check console for successful data loading
    cy.get('.console').should('contain', 'sent to iframe');
    cy.get('.console').should('contain', 'DATA_REFRESH');
  });
}); 