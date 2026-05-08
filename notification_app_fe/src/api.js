const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }

  return body;
}

export function fetchNotifications(filters = {}) {
  const params = new URLSearchParams();

  if (filters.limit) {
    params.set("limit", filters.limit);
  }

  if (filters.page) {
    params.set("page", filters.page);
  }

  if (filters.notificationType && filters.notificationType !== "All") {
    params.set("notification_type", filters.notificationType);
  }

  const query = params.toString();
  return request(`/api/notifications${query ? `?${query}` : ""}`);
}

export function fetchPriorityNotifications(limit = 10) {
  return request(`/api/notifications/priority?limit=${limit}`);
}

export function markNotificationViewed(id) {
  return request(`/api/notifications/${id}/viewed`, {
    method: "POST"
  });
}
