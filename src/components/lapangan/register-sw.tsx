"use client";

import * as React from "react";

/** Mendaftarkan service worker supaya halaman lapangan tetap terbuka saat tanpa sinyal. */
export function RegisterSw() {
  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
