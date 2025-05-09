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
        fun submitFHIR(fhirJson: String) {
            Thread {
                try {
                    val url = URL("http://192.168.100.21:5001/fhir")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.setRequestProperty("Content-Type", "application/fhir+json")
                    connection.setRequestProperty("Authorization", "Custom auth")
                    connection.doOutput = true

                    val outputStream: OutputStream = connection.outputStream
                    outputStream.write(fhirJson.toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    outputStream.close()

                    val responseCode = connection.responseCode
                    val responseMessage = connection.inputStream.bufferedReader().readText()

                    Log.d("FHIR_SUBMIT", "Response: $responseCode - $responseMessage")

                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Submission successful! ($responseCode)",
                            Toast.LENGTH_LONG
                        ).show()
                    }

                } catch (e: Exception) {
                    Log.e("FHIR_SUBMIT", "Submission failed", e)
                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Submission failed: ${e.message}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }.start()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        val webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                assetLoader.shouldInterceptRequest(request.url)
        }

        webView.settings.javaScriptEnabled = true

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "WebViewConsole",
                    "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}"
                )
                return true
            }
        }

        webView.addJavascriptInterface(WebAppInterface(), "AndroidInterface")

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }
}
