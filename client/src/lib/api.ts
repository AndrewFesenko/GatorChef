const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "gatorchef_id_token";

type RequestOptions = RequestInit & {
  bodyJson?: unknown;
};

// keeps path building predictable so we do not end up with double slashes
function buildApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

// asks firebase for the current token first then falls back to local storage
async function getAuthToken(forceRefresh = false): Promise<string | null> {
  try {
    const { auth } = await import("@/lib/firebase");
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken(forceRefresh);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      return token;
    }
  } catch {
    // if firebase is not ready yet we can still try the last stored token
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// tiny wrapper so all requests share the same auth and body handling
async function requestWithToken(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const { bodyJson, headers, ...rest } = options;
  const resolvedBody = bodyJson ? JSON.stringify(bodyJson) : rest.body;

  return fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: resolvedBody,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let token = await getAuthToken();
  let response = await requestWithToken(path, options, token);

  // one retry on 401 fixes stale token races after login logout or rotation
  if (response.status === 401) {
    token = await getAuthToken(true);
    response = await requestWithToken(path, options, token);
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.detail === "string") {
        message = errorPayload.detail;
      }
    } catch {
      // ignore non json bodies and keep the basic status text
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
