package com.example.mregister

import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    inner class WebAppInterface {

        @JavascriptInterface
        fun submitFHIR(fhirJson: String, fhirUrl: String) {
            Thread {
                try {
                    val url = URL(fhirUrl) // use the dynamic URL passed in
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/fhir+json")
                    connection.setRequestProperty("Accept", "application/fhir+json")
                    connection.setRequestProperty("Prefer", "return=representation")
                    connection.setRequestProperty("Authorization", "Custom auth")
                    connection.doOutput = true

                    connection.outputStream.use {
                        it.write(fhirJson.toByteArray(Charsets.UTF_8))
                    }

                    val response = connection.inputStream.bufferedReader().readText()
                    Log.d("FHIR_SUBMIT", "Response: ${connection.responseCode} - $response")

                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Success: ${connection.responseCode}", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Log.e("FHIR_SUBMIT", "Submission failed", e)
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Submission failed: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable debugging for WebView
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        val webView = WebView(this)
        setContentView(webView)

        // Set up WebViewAssetLoader to serve assets from local paths via HTTPS
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                Log.e("WebViewError", "Error: ${error.description}")
                super.onReceivedError(view, request, error)
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false // prevent file:// access
            allowContentAccess = true
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "WebViewConsole",
                    "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}"
                )
                return true
            }
        }

        // Add the interface for JS <-> Android communication
        webView.addJavascriptInterface(WebAppInterface(), "AndroidInterface")

        // Load the main HTML page from assets
        webView.loadUrl("https://appassets.androidplatform.net/assets/register-client.html")
    }
}
