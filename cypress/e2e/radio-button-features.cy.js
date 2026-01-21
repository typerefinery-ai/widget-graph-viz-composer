describe("Radio Button Features", () => {
  beforeEach(() => {
    cy.visit("http://localhost:4005/?local=true");
    cy.waitForWidgetReady();
  });

  describe("Behavior Radio Button", () => {
    it("should display Behavior radio button before Sighting", () => {
      // Check that Behavior radio button appears before Sighting
      cy.get("#behavior").should("exist");
      cy.get("#sighting").should("exist");
      
      // Verify the order: Attack-Flow -> Behavior -> Sighting
      cy.get("#filter_options").within(() => {
        cy.get("input[type='radio']").eq(0).should("have.id", "attackFlow");
        cy.get("input[type='radio']").eq(1).should("have.id", "behavior");
        cy.get("input[type='radio']").eq(2).should("have.id", "sighting");
      });
    });

    it("should keep Sighting as default selection", () => {
      // Verify Sighting is checked by default
      cy.get("#sighting").should("be.checked");
      cy.get("#behavior").should("not.be.checked");
      cy.get("#attackFlow").should("not.be.checked");
    });

    it("should load behavior data when Behavior radio button is selected", () => {
      // Mock the behavior data API call
      cy.intercept("GET", "**/tree-behavior.json", {
        fixture: "src/assets/data/tree-behavior.json"
      }).as("getBehaviorData");

      // Click the Behavior radio button
      cy.get("#behavior[type='radio']").click({ force: true });

      // Wait for the API call
      cy.wait("@getBehaviorData");

      // Verify the tree panel shows behavior data
      cy.get("#tree_panel").should("contain", "Behavior");
      cy.get("#tree_panel").should("contain", "Malicious Behavior");
      cy.get("#tree_panel").should("contain", "Defensive Behavior");
      cy.get("#tree_panel").should("contain", "Normal Behavior");
    });

    it("should show success notification when behavior data loads", () => {
      // Mock the behavior data API call
      cy.intercept("GET", "**/tree-behavior.json", {
        fixture: "src/assets/data/tree-behavior.json"
      }).as("getBehaviorData");

      // Click the Behavior radio button
      cy.get("#behavior[type='radio']").click({ force: true });

      // Wait for the API call
      cy.wait("@getBehaviorData");

      // Check for success notification
      cy.checkToast("success", "behavior data loaded successfully from local file");
    });
  });

  describe("Attack-Flow Radio Button", () => {
    it("should display Attack-Flow radio button before Behavior", () => {
      // Check that Attack-Flow radio button appears first
      cy.get("#attackFlow").should("exist");
      cy.get("#behavior").should("exist");
      
      // Verify the order: Attack-Flow -> Behavior -> Sighting
      cy.get("#filter_options").within(() => {
        cy.get("input[type='radio']").eq(0).should("have.id", "attackFlow");
        cy.get("input[type='radio']").eq(1).should("have.id", "behavior");
        cy.get("input[type='radio']").eq(2).should("have.id", "sighting");
      });
    });

    it("should load attack-flow data when Attack-Flow radio button is selected", () => {
      // Mock the attack-flow data API call
      cy.intercept("GET", "**/tree-attack-flow.json", {
        fixture: "src/assets/data/tree-attack-flow.json"
      }).as("getAttackFlowData");

      // Click the Attack-Flow radio button
      cy.get("#attackFlow[type='radio']").click({ force: true });

      // Wait for the API call
      cy.wait("@getAttackFlowData");

      // Verify the tree panel shows attack-flow data
      cy.get("#tree_panel").should("contain", "Attack Flow");
      cy.get("#tree_panel").should("contain", "Initial Access");
      cy.get("#tree_panel").should("contain", "Execution");
      cy.get("#tree_panel").should("contain", "Persistence");
      cy.get("#tree_panel").should("contain", "Privilege Escalation");
      cy.get("#tree_panel").should("contain", "Defense Evasion");
      cy.get("#tree_panel").should("contain", "Credential Access");
      cy.get("#tree_panel").should("contain", "Discovery");
      cy.get("#tree_panel").should("contain", "Lateral Movement");
      cy.get("#tree_panel").should("contain", "Collection");
      cy.get("#tree_panel").should("contain", "Command and Control");
      cy.get("#tree_panel").should("contain", "Exfiltration");
      cy.get("#tree_panel").should("contain", "Impact");
    });

    it("should show success notification when attack-flow data loads", () => {
      // Mock the attack-flow data API call
      cy.intercept("GET", "**/tree-attack-flow.json", {
        fixture: "src/assets/data/tree-attack-flow.json"
      }).as("getAttackFlowData");

      // Click the Attack-Flow radio button
      cy.get("#attackFlow[type='radio']").click({ force: true });

      // Wait for the API call
      cy.wait("@getAttackFlowData");

      // Check for success notification
      cy.checkToast("success", "attack-flow data loaded successfully from local file");
    });
  });

  describe("Radio Button Interactions", () => {
    it("should switch between different data types correctly", () => {
      // Mock all data API calls
      cy.intercept("GET", "**/tree-behavior.json", {
        fixture: "src/assets/data/tree-behavior.json"
      }).as("getBehaviorData");
      
      cy.intercept("GET", "**/tree-attack-flow.json", {
        fixture: "src/assets/data/tree-attack-flow.json"
      }).as("getAttackFlowData");
      
      cy.intercept("GET", "**/tree-sighting.json", {
        fixture: "src/assets/data/tree-sighting.json"
      }).as("getSightingData");

      // Start with Sighting (default)
      cy.get("#sighting").should("be.checked");
      cy.get("#tree_panel").should("contain", "Sighting");

      // Switch to Behavior
      cy.get("#behavior[type='radio']").click({ force: true });
      cy.wait("@getBehaviorData");
      cy.get("#behavior").should("be.checked");
      cy.get("#tree_panel").should("contain", "Behavior");

      // Switch to Attack-Flow
      cy.get("#attackFlow[type='radio']").click({ force: true });
      cy.wait("@getAttackFlowData");
      cy.get("#attackFlow").should("be.checked");
      cy.get("#tree_panel").should("contain", "Attack Flow");

      // Switch back to Sighting
      cy.get("#sighting[type='radio']").click({ force: true });
      cy.wait("@getSightingData");
      cy.get("#sighting").should("be.checked");
      cy.get("#tree_panel").should("contain", "Sighting");
    });

    it("should handle radio button selection state correctly", () => {
      // Verify only one radio button can be selected at a time
      cy.get("#sighting").should("be.checked");
      cy.get("#behavior").should("not.be.checked");
      cy.get("#attackFlow").should("not.be.checked");

      // Select Behavior
      cy.get("#behavior[type='radio']").click({ force: true });
      cy.get("#sighting").should("not.be.checked");
      cy.get("#behavior").should("be.checked");
      cy.get("#attackFlow").should("not.be.checked");

      // Select Attack-Flow
      cy.get("#attackFlow[type='radio']").click({ force: true });
      cy.get("#sighting").should("not.be.checked");
      cy.get("#behavior").should("not.be.checked");
      cy.get("#attackFlow").should("be.checked");
    });
  });

  describe("Error Handling", () => {
    it("should handle behavior data loading errors gracefully", () => {
      // Mock a failed API call
      cy.intercept("GET", "**/tree-behavior.json", {
        statusCode: 404,
        body: { error: "Data not found" }
      }).as("getBehaviorDataError");

      // Click the Behavior radio button
      cy.get("#behavior[type='radio']").click({ force: true });

      // Wait for the failed API call
      cy.wait("@getBehaviorDataError");

      // Check for error notification
      cy.checkToast("error", "Failed to load behavior data from local file: HTTP error! status: 404 - Not Found");
    });

    it("should handle attack-flow data loading errors gracefully", () => {
      // Mock a failed API call
      cy.intercept("GET", "**/tree-attack-flow.json", {
        statusCode: 500,
        body: { error: "Server error" }
      }).as("getAttackFlowDataError");

      // Click the Attack-Flow radio button
      cy.get("#attackFlow[type='radio']").click({ force: true });

      // Wait for the failed API call
      cy.wait("@getAttackFlowDataError");

      // Check for error notification
      cy.checkToast("error", "Failed to load attack-flow data from local file: HTTP error! status: 500 - Internal Server Error");
    });
  });
}); 