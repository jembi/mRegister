import { saveToQueue, getAllQueued, deleteFromQueue } from "../idb.js";

import { FHIRFormHandlerBase } from "./fhirFormCommon.js";

class FHIRFormHandler extends FHIRFormHandlerBase {
  async handleSubmit() {
    let questionnaireResponse;
    try {
      const formElement = document.querySelector(`#${this.containerId} > div`);
      const userData = LForms.Util.getUserData(
        formElement,
        "QuestionnaireResponse",
        "R5"
      );
      questionnaireResponse = this.transformToFHIR(userData.itemsData);

      if (this.questionnaireCanonicalUrl) {
        questionnaireResponse.questionnaire = this.questionnaireCanonicalUrl;
      }

      const fhirUrl = this.__openHIM || window.__openHIM;

      if (navigator.onLine) {
        const response = await this.submitToServer(
          fhirUrl,
          questionnaireResponse
        );

        if (response) {
          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}: ${await response.text()}`
            );
          }

          console.log("Form submitted successfully:", await response.json());
          //alert("Form submitted successfully!");
        }
        else{
          console.log("Failed to submit. Saved locally and will retry when back online.");
      
          if (questionnaireResponse) {
            await saveToQueue({
              data: questionnaireResponse,
              url: this.__openHIM || window.__openHIM,
            });
          }
        }
      } else {
        // Save both QuestionnaireResponse and FHIR server URL
        await saveToQueue({ data: questionnaireResponse, url: fhirUrl });
        console.log(
          "You are offline. Form saved locally and will be sent when back online."
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      console.log("Failed to submit. Saved locally and will retry when back online.");

      if (questionnaireResponse) {
        await saveToQueue({
          data: questionnaireResponse,
          url: this.__openHIM || window.__openHIM,
        });
      }
    }
  }

  async submitToServer(fhirUrl, questionnaireResponse) {
    try {
      const res = await fetch(fhirUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          Accept: "application/fhir+json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(questionnaireResponse),
      });

      console.log("FHIR server response status:", res.status);
      return res; // Important: return the response so caller can check res.ok
    } catch (err) {
      console.error("Network error while submitting to FHIR server:", err);
      //throw err; // Re-throw to let calling function handle it
    }

    return;
  }
}

// 🔁 Automatically sync queued data when back online
window.addEventListener("online", async () => {
  const queued = await getAllQueued();
  if (!queued.length) return;

  console.log("Online again. Syncing queued QuestionnaireResponses...");

  for (const item of queued) {
    try {
      if (!item.url) {
        console.warn("No URL in queued item. Skipping.");
        continue;
      }

      const res = await fetch(item.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          Accept: "application/fhir+json",
        },
        body: JSON.stringify(item.data),
      });

      if (res.ok) {
        console.log("Queued item submitted successfully.");
        await deleteFromQueue(item.id);
      } else {
        console.warn("Failed to submit queued item:", await res.text());
      }
    } catch (err) {
      console.error("Network error while syncing item:", err);
    }
  }
});

export { FHIRFormHandler };
