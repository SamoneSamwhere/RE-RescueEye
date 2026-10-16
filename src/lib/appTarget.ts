/**
 * Which app this build is. The website (default) carries every role; the
 * Android app (`npm run android:apk`, VITE_APP_TARGET=responder in
 * .env.mobile) is the Field Responder app only - Command Staff and admins work
 * from the website on a desktop.
 */
export const IS_RESPONDER_APP = import.meta.env.VITE_APP_TARGET === 'responder'
