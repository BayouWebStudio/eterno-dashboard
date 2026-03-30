/*
  DESIGN: Dark Forge — Auth Context
  Wraps Clerk provider and exposes auth helpers for Convex API calls.
*/
import { ClerkProvider, useAuth as useClerkAuth, useUser, SignIn, SignUp } from "@clerk/react";
import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
const CONVEX_HTTP_URL = import.meta.env.VITE_CONVEX_HTTP_URL || "";

interface AuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
  getToken: () => Promise<string | null>;
  convexHttpUrl: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();

  const getToken = useCallback(async () => {
    try {
      // Try the "convex" JWT template first (has extra claims); fall back to
      // the default session token if the template isn't configured in Clerk.
      try {
        const token = await clerkGetToken({ template: "convex" });
        if (token) return token;
      } catch { /* template not configured — fall through */ }
      return await clerkGetToken();
    } catch {
      return null;
    }
  }, [clerkGetToken]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);

  const value: AuthContextValue = {
    isLoaded,
    isSignedIn: !!isSignedIn,
    userId: user?.id ?? null,
    userName: user?.fullName ?? user?.firstName ?? null,
    userImage: user?.imageUrl ?? null,
    getToken,
    convexHttpUrl: CONVEX_HTTP_URL,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!CLERK_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4 max-w-md p-8">
          <h2 className="text-xl font-heading font-bold text-gold">Configuration Required</h2>
          <p className="text-muted-foreground text-sm">
            Missing <code className="font-mono text-gold-dim">VITE_CLERK_PUBLISHABLE_KEY</code>. 
            Please set it in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      appearance={{
        variables: {
          colorPrimary: "#C9A84C",
          colorBackground: "#1a1d24",
          colorText: "#e0d5c0",
          colorInputBackground: "#22262e",
          colorInputText: "#e0d5c0",
        },
      }}
    >
      <AuthInner>{children}</AuthInner>
    </ClerkProvider>
  );
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#C9A84C",
    colorBackground: "#1a1d24",
    colorText: "#e0d5c0",
    colorInputBackground: "#22262e",
    colorInputText: "#e0d5c0",
  },
};

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-gold mb-2">Eterno Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "signin" ? "Sign in to manage your website" : "Create your account"}
          </p>
        </div>
        {mode === "signin" ? (
          <SignIn routing="virtual" appearance={clerkAppearance} />
        ) : (
          <SignUp routing="virtual" appearance={clerkAppearance} />
        )}
        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-gold hover:underline font-medium">Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-gold hover:underline font-medium">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
