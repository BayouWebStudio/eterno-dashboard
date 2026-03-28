/*
  Unsaved Changes Warning
  ───────────────────────
  Shows a browser "beforeunload" prompt when there are dirty fields,
  preventing accidental data loss from closing the tab or navigating away.
*/

import { useEffect } from "react";

export function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show a generic message; returnValue is required for legacy support
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
