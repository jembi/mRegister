package com.example.googlefhiruisnghapi

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import com.google.android.fhir.datacapture.QuestionnaireFragment

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        if (savedInstanceState == null) {
            // Load questionnaire JSON from assets
            val questionnaireJson = assets.open("questionnaires/questionnaire1-schema.json")
                .bufferedReader().use { it.readText() }

            // Build QuestionnaireFragment with the JSON string
            val fragment = QuestionnaireFragment.builder()
                .setQuestionnaire(questionnaireJson)
                .build()

            // Show the fragment
            supportFragmentManager.commit {
                setReorderingAllowed(true)
                replace(R.id.fragment_container_view, fragment)
            }
        }
    }
}
