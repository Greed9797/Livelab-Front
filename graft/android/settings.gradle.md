# android/settings.gradle.kts

- flutterSdkPath · variable · L2-L9 — val flutterSdkPath = run { val properties = java.util.Properties() file("local.properties").inputStream().use { properties.load(it) } val flutterSdkPath = properties.getProperty("flutter.sdk") require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" } flutterSdkPath }
