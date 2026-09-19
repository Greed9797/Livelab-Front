# android/build.gradle.kts

- newBuildDir · variable · L8-L11 — val newBuildDir: Directory = rootProject.layout.buildDirectory .dir("../../build") .get()
- newSubprojectBuildDir · variable · L15-L15 — val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
