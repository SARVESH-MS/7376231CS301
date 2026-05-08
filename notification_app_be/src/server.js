import "dotenv/config";
import cors from "cors";
import express from "express";
import { createLogger } from "logging_middleware";
import { getPriorityNotifications, normalizeNotification } from "./priority.js";
import { sampleNotifications } from "./sampleData.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const apiBase = process.env.EVALUATION_API_BASE || "http://4.224.186.213/evaluation-service";
const evaluationToken = process.env.EVALUATION_ACCESS_TOKEN;
const viewedIds = new Set();
const Log = createLogger();

app.use(cors());
app.use(express.json());

async function writeLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
    // Logging must not break the user-facing API path.
  }
}

async function fetchNotificationsFromSource(query) {
  if (!evaluationToken) {
    return sampleNotifications;
  }

  const url = new URL(`${apiBase}/notifications`);

  if (query.limit) {
    url.searchParams.set("limit", query.limit);
  }

  if (query.page) {
    url.searchParams.set("page", query.page);
  }

  if (query.notification_type) {
    url.searchParams.set("notification_type", query.notification_type);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${evaluationToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Notification source request failed");
  }

  const body = await response.json();
  return body.notifications || [];
}

async function getNotifications(query = {}) {
  const rawNotifications = await fetchNotificationsFromSource(query);
  let notifications = rawNotifications.map((item) => normalizeNotification(item, viewedIds));

  if (query.notification_type) {
    notifications = notifications.filter(
      (item) => item.type.toLowerCase() === query.notification_type.toLowerCase()
    );
  }

  return notifications;
}

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok"
  });
});

app.get("/api/notifications", async (request, response) => {
  try {
    const notifications = await getNotifications(request.query);
    await writeLog("info", "route", "notifications fetched");

    response.json({
      notifications
    });
  } catch (error) {
    await writeLog("error", "handler", "failed to fetch notifications");
    response.status(502).json({
      message: error.message
    });
  }
});

app.get("/api/notifications/priority", async (request, response) => {
  try {
    const limit = Number(request.query.limit || 10);
    const notifications = await getNotifications(request.query);
    const priorityNotifications = getPriorityNotifications(notifications, { limit });

    await writeLog("info", "service", "priority notifications calculated");

    response.json({
      notifications: priorityNotifications
    });
  } catch (error) {
    await writeLog("error", "handler", "failed to calculate priority notifications");
    response.status(502).json({
      message: error.message
    });
  }
});

app.post("/api/notifications/:id/viewed", async (request, response) => {
  viewedIds.add(request.params.id);
  await writeLog("info", "route", "notification marked as viewed");

  response.json({
    id: request.params.id,
    isRead: true
  });
});

app.listen(port, () => {
  writeLog("info", "service", `notification backend started on port ${port}`);
});
