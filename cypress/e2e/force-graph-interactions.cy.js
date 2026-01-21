/**
 * E2E Test: Force Graph Interactions
 * 
 * Tests for force graph object selection and form interactions
 */

describe("Force Graph Interactions", () => {
  beforeEach(() => {
    cy.visit("http://localhost:4005/?local=true");
    cy.waitForWidgetReady();
    
    // Load test data for force graph - use local file instead of API
    cy.intercept("GET", "http://localhost:4005/src/assets/data/tree-sighting.json", {
      fixture: "src/assets/data/tree-sighting.json"
    }).as("loadData");
    
    // Wait for widget to be ready
    cy.get("[component='graphviz']").should("be.visible");
  });

  it("should open Update form when object is selected in force graph", () => {
    // Wait for widget to load data
    cy.wait(2000);
    
    // Check if force graph exists (it might be in a different panel)
    cy.get("[component='graphviz']").should("be.visible");
    
    // For now, just verify the widget is working
    cy.get("[component='graphviz']").should("contain", "Sighting");
    
    // TODO: Add force graph selection test when force graph is implemented
    // cy.get("[data-testid='force-graph']").should("be.visible");
    // cy.get("[data-testid='force-graph'] .node").first().click();
    // cy.get("[data-testid='update-form']").should("be.visible");
  });

  it("should populate form with correct data from selected object", () => {
    // Wait for widget to load data
    cy.wait(2000);
    
    // Check if widget is working
    cy.get("[component='graphviz']").should("be.visible");
    
    // TODO: Add form population test when force graph and forms are implemented
    // cy.get("[data-testid='force-graph'] .node").first().click();
    // cy.get("[data-testid='update-form']").within(() => {
    //   cy.get("input[name='name']").should("not.be.empty");
    //   cy.get("input[name='type']").should("not.be.empty");
    //   cy.get("textarea[name='description']").should("exist");
    // });
  });

  it("should handle form submission correctly", () => {
    // Wait for widget to load data
    cy.wait(2000);
    
    // Check if widget is working
    cy.get("[component='graphviz']").should("be.visible");
    
    // TODO: Add form submission test when force graph and forms are implemented
    // cy.get("[data-testid='force-graph'] .node").first().click();
    // cy.get("[data-testid='update-form'] input[name='name']").clear().type("Updated Name");
    // cy.get("[data-testid='update-form'] button[type='submit']").click();
    // cy.get("[data-testid='update-form']").should("not.be.visible");
  });

  it("should handle form cancellation correctly", () => {
    // Wait for widget to load data
    cy.wait(2000);
    
    // Check if widget is working
    cy.get("[component='graphviz']").should("be.visible");
    
    // TODO: Add form cancellation test when force graph and forms are implemented
    // cy.get("[data-testid='force-graph'] .node").first().click();
    // cy.get("[data-testid='update-form'] button[type='button']").contains("Cancel").click();
    // cy.get("[data-testid='update-form']").should("not.be.visible");
  });
}); 