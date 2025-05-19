// settings.gradle.kts
pluginManagement {
    repositories {
        google()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Google FHIR (Uisng HAPI)"
include(":app")
