const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "resqlink-session-token";

export const authToken = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = authToken.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach ResQLInk. Check that the backend is running.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) authToken.clear();
    throw new Error(result.message || "The request could not be completed.");
  }
  return result;
}

export const apiRequest = (path, method, body) =>
  api(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });