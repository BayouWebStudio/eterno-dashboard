/*
  Unsaved Changes Warning
  ───────────────────────
  Guards against data loss on both browser navigation (tab close / hard nav)
  and client-side SPA route changes (wouter sidebar links).
*/

import { useEffect, useRef } from "react";
import { useNavigationGuard } from "@/contexts/NavigationGuardContext";

export function useUnsavedWarning(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  // Browser-level guard (tab close, hard navigation)
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

  // Client-side navigation guard (wouter route changes via sidebar)
  const { registerGuard } = useNavigationGuard();

  useEffect(() => {
    const unregister = registerGuard(() => {
      if (!dirtyRef.current) return true;
      return window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
    });
    return unregister;
  }, [registerGuard]);
}
