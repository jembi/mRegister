// app/src/main/assets/modules/fhirFormCommon.js

export class FHIRFormHandlerBase {
  constructor(containerId, parentUrl, childConfig = [], fhirServerUrl) {
    this.containerId = containerId;
    this.parentUrl = parentUrl;
    this.childConfig = childConfig;
    this.fhirServerUrl = fhirServerUrl;
    this.lfData = null;
    this.questionnaireCanonicalUrl = null;
  }

  async init() {
    try {
      const parentQ = await fetch(this.parentUrl).then(res => res.json());

      if (!parentQ.url) {
        console.warn("Parent Questionnaire missing 'url' field.");
      } else {
        this.questionnaireCanonicalUrl = parentQ.url;
      }

      const childQs = await Promise.all(
        this.childConfig.map(cfg =>
          fetch(cfg.url).then(res => res.json())
        )
      );

      this.injectExpansions(parentQ);

      childQs.forEach((childQ, index) => {
        const targetLinkId = this.childConfig[index].linkId;
        const placeholderItem = this.findItemByLinkId(parentQ.item, targetLinkId);
        if (placeholderItem && Array.isArray(childQ.item)) {
          placeholderItem.item = childQ.item;
        } else {
          console.warn(`Child item with linkId "${targetLinkId}" not found.`);
        }
      });

      LForms.Util.setFHIRContext(parentQ);
      this.lfData = LForms.Util.convertFHIRQuestionnaireToLForms(parentQ, 'R5');
      LForms.Util.addFormToPage(this.lfData, this.containerId);

      this.addSubmitButton();
    } catch (error) {
      console.error("Failed to initialize form:", error);
    }
  }

  injectExpansions(questionnaire) {
    if (questionnaire.contained) {
      questionnaire.contained.forEach(resource => {
        if (
          resource.resourceType === "ValueSet" &&
          !resource.expansion &&
          resource.compose?.include?.length
        ) {
          resource.expansion = { contains: [] };
          resource.compose.include.forEach(inc => {
            (inc.concept || []).forEach(concept => {
              resource.expansion.contains.push({
                system: inc.system,
                code: concept.code,
                display: concept.display
              });
            });
          });
        }
      });
    }
  }

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

  addSubmitButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Submit Form";
    btn.classList.add("btn", "btn-primary");
    btn.addEventListener("click", () => this.handleSubmit());
    document.getElementById(this.containerId).appendChild(btn);
  }

  transformToFHIR(itemsData) {
    const response = {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      authored: new Date().toISOString(),
      item: []
    };

    const seen = new Set();

    function process(item) {
      if (!item?.questionCode || seen.has(item.questionCode)) return null;
      seen.add(item.questionCode);

      if (item.items?.length) {
        return {
          linkId: item.questionCode,
          item: item.items.map(process).filter(Boolean)
        };
      }

      const val = item.value;
      const ans = { linkId: item.questionCode, answer: [] };

      if (val?.code && val.system) {
        ans.answer.push({
          valueCoding: {
            code: val.code,
            system: val.system,
            display: val.text
          }
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

  // To be implemented in subclass
  async handleSubmit() {
    throw new Error("handleSubmit must be implemented in the subclass.");
  }
}
