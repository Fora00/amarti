/**
 * Browser side of the PWA: register the worker, offer the install, show the
 * unread count on the home-screen icon, know when the phone is offline.
 * Every function degrades to a no-op where the browser lacks the feature, so
 * calling them is always safe.
 */

/** Registers the worker; resolves to false (never throws) where that is not possible. */
export async function registerServiceWorker(url: string, scope: string): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    await navigator.serviceWorker.register(url, { scope });
    return true;
  } catch (e) {
    console.warn("service worker not registered", e);
    return false;
  }
}

/** Already opened from the home screen? */
export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone/iPad Safari never fires `beforeinstallprompt`: it needs written instructions. */
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

/** Call once, early (the browser fires the event only once per page load). */
export function captureInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach((l) => l()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });
}
export const canInstall = (): boolean => deferred !== null;
export function onInstallChange(listener: () => void): void { listeners.add(listener); }
/** Opens the browser's install dialog. Returns whether she accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

/** A number on the app icon (0 clears it). */
export async function setAppBadge(count: number): Promise<void> {
  const nav = navigator as { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch { /* not allowed here: the badge is a courtesy */ }
}

/** Calls back with the current state now and on every change. */
export function watchOnline(cb: (online: boolean) => void): void {
  cb(navigator.onLine);
  window.addEventListener("online", () => cb(true));
  window.addEventListener("offline", () => cb(false));
}
