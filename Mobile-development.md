# Android

- Android Studio -> https://developer.android.com/studio -> Have an android device or emulator to test the app
- JAVA_HOME -> use the one with Android Studio -> C:\\Program Files\\Android\\Android Studio\\jbr
- setup local.properties -> sdk.dir = C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk

## Issues

- If you add native modules to the project, you will need to rebuild the android project files.

```bash
  # 1. Regenerate native Android/iOS files for the new modules
  yarn workspace expo-app prebuild --platform android

  # 2. Clean the old build, stop daemons and gradle processes
  cd chat4gamers/apps/expo/android && && ./gradlew --stop && ./gradlew clean && cd ../../../..

  # 3. Rebuild
  yarn workspace expo-app android
```