/*
  Navigation Guard Context
  ────────────────────────
  Lightweight context that lets any page register a navigation guard
  (e.g. "you have unsaved changes") that DashboardLayout checks
  before performing client-side route changes.
*/
import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";

type GuardFn = () => boolean; // returns true if navigation is allowed

interface NavigationGuardContextValue {
  /** Register a guard function. Call the returned cleanup to unregister. */
  registerGuard: (fn: GuardFn) => () => void;
  /** Returns true if navigation should proceed, false to block. */
  checkNavigation: () => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<GuardFn | null>(null);

  const registerGuard = useCallback((fn: GuardFn) => {
    guardRef.current = fn;
    return () => {
      // Only unregister if it's still the same guard
      if (guardRef.current === fn) {
        guardRef.current = null;
      }
    };
  }, []);

  const checkNavigation = useCallback((): boolean => {
    if (!guardRef.current) return true;
    return guardRef.current();
  }, []);

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, checkNavigation }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) throw new Error("useNavigationGuard must be used within NavigationGuardProvider");
  return ctx;
}
