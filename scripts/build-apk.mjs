// Runs the Gradle debug build for the Android app (see README "Android app").
// Called by `npm run android:apk` after the web build and `cap sync`. The full
// path matters: cmd.exe may be set not to run programs from the current folder.
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const androidDir = resolve('android')
const gradlew = resolve(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
execSync(`"${gradlew}" assembleDebug`, { cwd: androidDir, stdio: 'inherit' })
console.log('\nAPK: android/app/build/outputs/apk/debug/app-debug.apk')
