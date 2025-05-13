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

      const response = await fetch(this.fhirServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          "Accept": "application/fhir+json",
          "Prefer": "return=representation",
          Authorization: "Custom auth" // Replace with real auth if needed
        },
        body: JSON.stringify(questionnaireResponse)
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
}

export { FHIRFormHandler };