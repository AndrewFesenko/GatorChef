const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type RequestOptions = RequestInit & {
  bodyJson?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { bodyJson, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: bodyJson ? JSON.stringify(bodyJson) : rest.body,
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.detail === "string") {
        message = errorPayload.detail;
      }
    } catch {
      // Ignore non-JSON error bodies.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
