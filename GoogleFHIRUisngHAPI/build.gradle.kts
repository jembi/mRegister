// Project-level build.gradle

// build.gradle.kts (Project-level)

// Project-level build.gradle.kts

plugins {
    id("org.jetbrains.kotlin.jvm") version "1.9.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.0" apply false  // Make sure this is applied only at the project level
}



buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        // The Android Gradle Plugin version
        classpath("com.android.tools.build:gradle:8.10.0") // Ensure compatibility with Android plugin version

        // Kotlin plugin version
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.10") // Kotlin Gradle plugin version

        // Compose Compiler plugin for Kotlin 2.0 compatibility
        classpath("androidx.compose.compiler:compiler:1.5.0")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
