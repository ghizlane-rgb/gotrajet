import type { CapacitorConfig } from "@capacitor/cli";

/*
  GOTRAJET mobile application.
  By default the app runs the website bundled in www/ (built from ../dist by `npm run build`):
  it works offline, with the same local demo data as the website opened on its own.

  To use real accounts and data, point the app at the deployed backend:
    set GOTRAJET_SERVER_URL=https://your-domain.example   (PowerShell: $env:GOTRAJET_SERVER_URL="https://…")
    npm run sync
  The app then opens that address, exactly like the website served by `python backend/run.py`.
*/
const serverUrl = process.env.GOTRAJET_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "ma.gotrajet.app",
  appName: "GOTRAJET",
  webDir: "www",
  backgroundColor: "#0b3052",
  server: serverUrl
    ? { url: serverUrl, cleartext: serverUrl.startsWith("http://") }
    : { androidScheme: "https" },
  android: {
    backgroundColor: "#0b3052",
  },
  ios: {
    backgroundColor: "#0b3052",
    contentInset: "never",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#0b3052",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b3052",
      overlaysWebView: false,
    },
  },
};

export default config;
