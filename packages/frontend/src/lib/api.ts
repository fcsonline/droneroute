import type { AdminUser, PaginatedResponse } from "@droneroute/shared";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("droneroute_token");
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));

    // Handle banned user — force logout
    if (res.status === 403 && err.banned) {
      localStorage.removeItem("droneroute_token");
      localStorage.removeItem("droneroute_email");
      localStorage.removeItem("droneroute_is_admin");
      window.location.reload();
      throw new Error(err.error || "Your account has been suspended");
    }

    throw new Error(err.error || "Request failed");
  }

  // Check if response is JSON or binary
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }

  return res.blob() as any;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Admin API
export const adminApi = {
  getUsers: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<AdminUser>>(`/admin/users?page=${page}&perPage=${perPage}`),
  banUser: (id: string) => api.post<{ message: string }>(`/admin/users/${id}/ban`),
  unbanUser: (id: string) => api.post<{ message: string }>(`/admin/users/${id}/unban`),
  promoteUser: (id: string) => api.post<{ message: string }>(`/admin/users/${id}/promote`),
  demoteUser: (id: string) => api.post<{ message: string }>(`/admin/users/${id}/demote`),
};
