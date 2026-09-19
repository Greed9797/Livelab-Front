# android/app/build.gradle.kts

- keystoreProperties · variable · L11-L11 — val keystoreProperties = Properties()
- keystorePropertiesFile · variable · L12-L12 — val keystorePropertiesFile = rootProject.file("keystore.properties")
- signingValue · function · L18-L21 — fun signingValue(propertyName: String, envName: String): String?
- releaseStoreFile · variable · L23-L23 — val releaseStoreFile = signingValue("storeFile", "ANDROID_KEYSTORE_PATH")
- releaseStorePassword · variable · L24-L24 — val releaseStorePassword = signingValue("storePassword", "ANDROID_KEYSTORE_PASSWORD")
- releaseKeyAlias · variable · L25-L25 — val releaseKeyAlias = signingValue("keyAlias", "ANDROID_KEY_ALIAS")
- releaseKeyPassword · variable · L26-L26 — val releaseKeyPassword = signingValue("keyPassword", "ANDROID_KEY_PASSWORD")
- hasReleaseSigning · variable · L28-L33 — val hasReleaseSigning = listOf( releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword, ).all { !it.isNullOrBlank() }
- decodeDartDefines · function · L35-L52 — fun decodeDartDefines(): Map<String, String>
- releaseApiUrl · variable · L54-L54 — val releaseApiUrl = decodeDartDefines()["API_URL"]
- isReleaseTask · variable · L56-L58 — val isReleaseTask = gradle.startParameter.taskNames.any { taskName -> taskName.contains("release", ignoreCase = true) }
