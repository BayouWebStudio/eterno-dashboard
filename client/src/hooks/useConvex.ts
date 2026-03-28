/*
  DESIGN: Dark Forge — Convex HTTP API Hook
  Provides typed helpers for calling Convex HTTP endpoints with Clerk auth tokens.
  Replaces raw fetch calls scattered throughout the original codebase.
*/
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ConvexCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, unknown> | FormData;
  path: string;
  skipAuth?: boolean;
}

interface ConvexState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useConvexHttp<T = unknown>() {
  const { getToken, convexHttpUrl } = useAuth();
  const [state, setState] = useState<ConvexState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const call = useCallback(
    async (options: ConvexCallOptions): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const token = options.skipAuth ? null : await getToken();
        const headers: Record<string, string> = {};

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        let fetchOptions: RequestInit = {
          method: options.method || "GET",
          headers,
        };

        if (options.body) {
          if (options.body instanceof FormData) {
            fetchOptions.body = options.body;
          } else {
            headers["Content-Type"] = "application/json";
            fetchOptions.body = JSON.stringify(options.body);
          }
        }

        const url = `${convexHttpUrl}${options.path}`;
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const contentType = response.headers.get("content-type");
        let data: T;

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ data: null, loading: false, error: message });
        console.error(`[Convex] ${options.path} failed:`, message);
        return null;
      }
    },
    [getToken, convexHttpUrl]
  );

  return { ...state, call };
}

/**
 * Standalone fetch helper (not a hook) for one-off calls.
 */
export async function convexFetch(
  convexHttpUrl: string,
  path: string,
  token: string | null,
  options?: {
    method?: string;
    body?: Record<string, unknown> | FormData;
  }
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let fetchOptions: RequestInit = {
    method: options?.method || "GET",
    headers,
  };

  if (options?.body) {
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  return fetch(`${convexHttpUrl}${path}`, fetchOptions);
}
