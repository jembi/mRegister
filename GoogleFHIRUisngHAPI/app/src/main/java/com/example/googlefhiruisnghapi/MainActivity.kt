package com.example.googlefhiruisnghapi

import android.content.res.AssetManager
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import com.google.android.fhir.datacapture.QuestionnaireFragment
import kotlinx.coroutines.launch
import org.hl7.fhir.r4.model.Questionnaire
import org.hl7.fhir.r4.model.QuestionnaireResponse
import ca.uhn.fhir.context.FhirContext

class MainActivity : AppCompatActivity() {

    companion object {
        const val TAG = "FHIR_QUESTIONNAIRE"
        const val QUESTIONNAIRE_FILE_NAME = "questionnaires/HIV.D4ScreenForTb.json"
        const val FRAGMENT_TAG = "questionnaire_fragment"
    }

    private val fhirContext = FhirContext.forR4()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        if (supportFragmentManager.findFragmentByTag(FRAGMENT_TAG) == null) {
            val questionnaireJson = loadAndExpandQuestionnaire(assets, QUESTIONNAIRE_FILE_NAME)

            val fragment = QuestionnaireFragment.builder()
                .setQuestionnaire(questionnaireJson)
                .build()

            supportFragmentManager.commit {
                setReorderingAllowed(true)
                add(R.id.fragment_container_view, fragment, FRAGMENT_TAG)
            }
        }
    }

    override fun onResume() {
        super.onResume()

        lifecycleScope.launch {
            val fragment =
                supportFragmentManager.findFragmentByTag(FRAGMENT_TAG) as? QuestionnaireFragment
            val response: QuestionnaireResponse? = fragment?.getQuestionnaireResponse()

            if (response != null) {
                val parser = fhirContext.newJsonParser()
                val responseJson = parser.encodeResourceToString(response)
                Log.d(TAG, "QuestionnaireResponse JSON:\n$responseJson")
            }
        }
    }

    /**
     * Load a Questionnaire JSON file from assets, expand any `questionnaire-localAsset` references,
     * and return the final serialized JSON string.
     */
    private fun loadAndExpandQuestionnaire(assetManager: AssetManager, fileName: String): String {
        val parser = fhirContext.newJsonParser().setPrettyPrint(true)
        val json = assetManager.open(fileName).bufferedReader().use { it.readText() }

        val questionnaire = parser.parseResource(Questionnaire::class.java, json)

        // Expand items with `questionnaire-localAsset` extensions
        questionnaire.item.forEach { item ->
            val localAssetExtension = item.extension?.find {
                it.url == "http://smart.who.int/fhir/StructureDefinition/questionnaire-localAsset"
            }

            val assetPath = localAssetExtension?.value?.primitiveValue()?.removePrefix("asset://")
            if (!assetPath.isNullOrEmpty()) {
                try {
                    val subJson = assetManager.open(assetPath).bufferedReader().use { it.readText() }
                    val subQuestionnaire = parser.parseResource(Questionnaire::class.java, subJson)

                    // Merge sub-questionnaire items into this item
                    item.item = subQuestionnaire.item
                    Log.d(TAG, "Expanded sub-questionnaire from: $assetPath")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to load sub-questionnaire from $assetPath: ${e.message}")
                }
            }
        }

        return parser.encodeResourceToString(questionnaire)
    }
}
