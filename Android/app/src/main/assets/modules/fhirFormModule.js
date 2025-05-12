export class FHIRFormHandler {
  /**
   * @param {string} containerId - ID of the DOM element where form is rendered.
   * @param {string} parentUrl - URL to the parent Questionnaire.
   * @param {Array<{url: string, linkId: string}>} childConfig - Array of child questionnaire config objects.
   * @param {string} fhirServerUrl - Target FHIR server POST endpoint.
   */
  constructor(containerId, parentUrl, childConfig = [], fhirServerUrl) {
    this.containerId = containerId;
    this.parentUrl = parentUrl;
    this.childConfig = childConfig;
    this.fhirServerUrl = fhirServerUrl;
    this.lfData = null;
    this.questionnaireCanonicalUrl = null; // To hold Questionnaire.url
  }

  async init() {
    try {
      // Fetch the parent questionnaire
      const parentQ = await fetch(this.parentUrl).then((res) => res.json());

      // Handle missing URL field in the parent questionnaire
      if (!parentQ.url) {
        console.warn("Parent Questionnaire does not have a 'url' field; QuestionnaireResponse will be missing 'questionnaire' reference.");
      } else {
        this.questionnaireCanonicalUrl = parentQ.url;
      }

      // Fetch the child questionnaires in parallel
      const childQs = await Promise.all(
        this.childConfig.map((cfg) => fetch(cfg.url).then((res) => res.json()))
      );

      // Inject expansions into the parent questionnaire
      this.injectExpansions(parentQ);

      // Merge child questionnaire items into parent
      childQs.forEach((childQ, index) => {
        const targetLinkId = this.childConfig[index].linkId;
        const placeholderItem = this.findItemByLinkId(parentQ.item, targetLinkId);
        if (placeholderItem && Array.isArray(childQ.item)) {
          placeholderItem.item = childQ.item;
        } else {
          console.warn(`Placeholder item with linkId "${targetLinkId}" not found.`);
        }
      });

      // Convert parent questionnaire into LForms format and render
      LForms.Util.setFHIRContext(parentQ);
      this.lfData = LForms.Util.convertFHIRQuestionnaireToLForms(parentQ, "R5");
      LForms.Util.addFormToPage(this.lfData, this.containerId);

      // Add a submit button
      this.addSubmitButton();
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  /**
   * Inject expansions into ValueSet resources in the parent questionnaire.
   * @param {Object} questionnaire - The parent questionnaire.
   */
  injectExpansions(questionnaire) {
    if (questionnaire.contained) {
      questionnaire.contained.forEach((resource) => {
        if (resource.resourceType === "ValueSet" && !resource.expansion && resource.compose?.include?.length) {
          resource.expansion = { contains: [] };
          resource.compose.include.forEach((inc) => {
            (inc.concept || []).forEach((concept) => {
              resource.expansion.contains.push({
                system: inc.system,
                code: concept.code,
                display: concept.display,
              });
            });
          });
        }
      });
    }
  }

  /**
   * Recursively find an item in the questionnaire by its linkId.
   * @param {Array} items - Array of questionnaire items.
   * @param {string} linkId - The linkId to search for.
   * @returns {Object|null} - The item if found, otherwise null.
   */
  findItemByLinkId(items, linkId) {
    for (const item of items) {
      if (item.linkId === linkId) return item;
      if (item.item) {
        const found = this.findItemByLinkId(item.item, linkId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Adds a submit button to the form.
   */
  addSubmitButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Submit Form";
    btn.classList.add("btn", "btn-primary");

    btn.addEventListener("click", () => this.handleSubmit());
    document.getElementById(this.containerId).appendChild(btn);
  }

  /**
   * Handles the form submission by sending data to the FHIR server.
   */
  async handleSubmit() {
    try {
      const formElement = document.querySelector(`#${this.containerId} > div`);
      const userData = LForms.Util.getUserData(formElement, "QuestionnaireResponse", "R5");

      const questionnaireResponse = this.transformToFHIR(userData.itemsData);

      // Add the canonical Questionnaire reference if available
      if (this.questionnaireCanonicalUrl) {
        questionnaireResponse.questionnaire = this.questionnaireCanonicalUrl;
      }

      // Submit the response to the FHIR server
      const response = await fetch(this.fhirServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          Authorization: "Custom auth", // Replace with actual auth header
        },
        body: JSON.stringify(questionnaireResponse),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log("Form submitted successfully:", await response.text());
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  }

  /**
   * Transforms user input data into a FHIR QuestionnaireResponse.
   * @param {Array} itemsData - The user input data to transform.
   * @returns {Object} - The transformed FHIR QuestionnaireResponse object.
   */
  transformToFHIR(itemsData) {
    const response = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      authored: new Date().toISOString(),
      item: [],
    };

    const seen = new Set();

    function process(item) {
      if (!item?.questionCode || seen.has(item.questionCode)) return null;
      seen.add(item.questionCode);

      if (item.items?.length) {
        return {
          linkId: item.questionCode,
          item: item.items.map(process).filter(Boolean),
        };
      }

      const ans = { linkId: item.questionCode, answer: [] };
      const val = item.value;

      if (val && val.code && val.system) {
        ans.answer.push({
          valueCoding: {
            code: val.code,
            system: val.system,
            display: val.text,
          },
        });
      } else if (typeof val === "string") {
        ans.answer.push({ valueString: val });
      } else if (typeof val === "boolean") {
        ans.answer.push({ valueBoolean: val });
      } else if (typeof val === "number") {
        ans.answer.push({ valueInteger: val });
      } else if (val instanceof Date) {
        ans.answer.push({ valueDate: val.toISOString().split("T")[0] });
      } else {
        return null;
      }

      return ans;
    }

    response.item = itemsData.map(process).filter(Boolean);
    return response;
  }
}

window.FHIRFormHandler = FHIRFormHandler;
