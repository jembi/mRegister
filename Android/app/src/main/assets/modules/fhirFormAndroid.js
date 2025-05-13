import { FHIRFormHandlerBase } from './fhirFormCommon.js';

class FHIRFormHandler extends FHIRFormHandlerBase {
  async handleSubmit() {
    try {
      const formElement = document.querySelector(`#${this.containerId} > div`);
      const userData = LForms.Util.getUserData(formElement, "QuestionnaireResponse", "R5");
      const questionnaireResponse = this.transformToFHIR(userData.itemsData);

      if (this.questionnaireCanonicalUrl) {
        questionnaireResponse.questionnaire = this.questionnaireCanonicalUrl;
      }

      const fhirJson = JSON.stringify(questionnaireResponse);

      if (
        window.AndroidInterface &&
        typeof window.AndroidInterface.submitFHIR === 'function'
      ) {
        window.AndroidInterface.submitFHIR(fhirJson, this.fhirServerUrl);
        console.log("Submitted via AndroidInterface to:", this.fhirServerUrl);
      } else {
        console.error("AndroidInterface not available");
        alert("Submission failed: Android interface not available.");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission error. Please try again.");
    }
  }
}

(function (global) {
  global.FHIRFormHandler = FHIRFormHandler;
})(typeof window !== 'undefined' ? window : this);
