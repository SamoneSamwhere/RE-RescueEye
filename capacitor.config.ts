import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android app wrapper (Capacitor). The APK bundles the built web app (dist/)
 * and talks to the same API and Supabase project as the browser version.
 * Build it with `npm run android:apk`; see README "Android app".
 */
const config: CapacitorConfig = {
  appId: 'com.rescueeye.app',
  appName: 'RescueEye',
  webDir: 'dist',
  server: {
    // Pages are served from https://localhost inside the app, which keeps
    // geolocation available (it needs a secure origin).
    androidScheme: 'https',
  },
  android: {
    // The API is reached over plain http/ws on the local network during the
    // capstone (see .env.mobile); without this the WebView blocks it as mixed content.
    allowMixedContent: true,
  },
}

export default config
