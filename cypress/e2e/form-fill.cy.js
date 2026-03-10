/**
 * E2E: Form fill – categorised form data (issue 95)
 * Ensures left-select sends form-ready data (base_required, base_optional, object, extensions).
 */

describe("Form fill – categorised form data", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/src/assets/data/tree-sighting.json", {
      statusCode: 200,
      fixture: "src/assets/data/tree-sighting.json",
    }).as("localFileCall");

    cy.visit("?local=true");
    cy.waitForWidgetReady();
  });

  it("categoriseFormData returns object with base_required, base_optional, object, extensions", () => {
    cy.window().then((win) => {
      const ns = win.Widgets?.Panel?.Utils;
      expect(ns, "Panel.Utils namespace").to.be.ok;
      expect(ns.categoriseFormData, "categoriseFormData").to.be.a("function");

      const empty = ns.categoriseFormData(null);
      expect(empty).to.have.keys("base_required", "base_optional", "object", "extensions");
      expect(empty.base_required).to.eql({});
      expect(empty.base_optional).to.eql({});
      expect(empty.object).to.eql({});
      expect(empty.extensions).to.eql({});

      const sample = {
        id: "x-1",
        type: "sighting",
        spec_version: "2.1",
        created: "2020-01-01T00:00:00Z",
        modified: "2020-01-02T00:00:00Z",
        name: "my-sighting",
        extensions: { "x-foo": { bar: 1 } },
      };
      const out = ns.categoriseFormData(sample);
      expect(out).to.have.keys("base_required", "base_optional", "object", "extensions");
      expect(out.base_required).to.include.keys("id", "type", "spec_version");
      expect(out.base_required).to.include.keys("created", "modified");
      expect(out.object).to.include.keys("name");
      expect(out.extensions).to.eql({ "x-foo": { bar: 1 } });
    });
  });

  it("exception: created/modified go to object when type is process", () => {
    cy.window().then((win) => {
      const ns = win.Widgets?.Panel?.Utils;
      const sample = {
        id: "x-1",
        type: "process",
        created: "2020-01-01T00:00:00Z",
        modified: "2020-01-02T00:00:00Z",
      };
      const out = ns.categoriseFormData(sample);
      expect(out.base_required).to.include.keys("id", "type");
      expect(out.base_required).not.to.have.key("created");
      expect(out.base_required).not.to.have.key("modified");
      expect(out.object).to.include.keys("created", "modified");
    });
  });

  it("left-click on force graph node sends categorised formData to openForm", () => {
    cy.wait("@localFileCall");
    cy.waitForLoadingComplete();

    cy.window().then((win) => {
      let capturedFormData = null;
      const openForm = win.Widgets?.Panel?.Utils?.openForm;
      expect(openForm).to.be.a("function");
      win.Widgets.Panel.Utils.openForm = function (formId, formData, options) {
        capturedFormData = formData;
        return openForm.apply(this, arguments);
      };

      cy.document().then((doc) => {
        const node = doc.querySelector("#scratch_panel svg .node") || doc.querySelector("#promo_panel svg .node");
        if (!node) {
          cy.log("No force-graph node in scratch/promo; skipping click assertion");
          expect(capturedFormData).to.be.null;
          return;
        }
        cy.wrap(node).click({ force: true });
        cy.then(() => {
          expect(capturedFormData, "openForm should receive categorised formData").to.be.an("object");
          expect(capturedFormData).to.have.keys("base_required", "base_optional", "object", "extensions");
        });
      });
    });
  });
});
