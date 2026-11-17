// Builds the Android app (debug APK, installable on any phone for testing) → build/GOTRAJET.apk
// Needs JDK 21 (JAVA_HOME) and the Android SDK (ANDROID_HOME, or installed by Android Studio).
// Usage: npm run apk
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANDROID = join(APP, "android");
const win = process.platform === "win32";

const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", win ? "java.exe" : "java") : "java";
const r = spawnSync(java, ["-version"], { encoding: "utf8" });
const version = `${r.stderr || ""}${r.stdout || ""}`;
const major = Number((/version "(\d+)/.exec(version) || [])[1] || 0);
if (major < 21) {
  console.error(`JDK 21 or newer is required (found: ${major || "none"}). Install Temurin 21 and set JAVA_HOME.`);
  process.exit(1);
}

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (win ? join(process.env.LOCALAPPDATA || "", "Android", "Sdk") : "");
if (!existsSync(join(ANDROID, "local.properties")) && sdk && existsSync(sdk)) {
  process.env.ANDROID_HOME = sdk;
}

// Run Gradle from the android folder by its short name: the project path may contain spaces.
const opts = { cwd: ANDROID, stdio: "inherit" };
const res = win
  ? spawnSync(".\\gradlew.bat assembleDebug --no-daemon", { ...opts, shell: true })
  : spawnSync("./gradlew", ["assembleDebug", "--no-daemon"], opts);
if (res.status !== 0) {
  console.error("Gradle build failed.");
  process.exit(res.status || 1);
}

const apk = join(ANDROID, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
mkdirSync(join(APP, "build"), { recursive: true });
copyFileSync(apk, join(APP, "build", "GOTRAJET.apk"));
console.log("APK ready: build/GOTRAJET.apk");
