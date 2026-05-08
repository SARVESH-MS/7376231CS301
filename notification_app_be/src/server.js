import "dotenv/config";
import cors from "cors";
import express from "express";
import { createLogger } from "logging_middleware";
import { getAuthToken } from "./authClient.js";
import { getPriorityNotifications, normalizeNotification } from "./priority.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const apiBase = process.env.EVALUATION_API_BASE || "http://4.224.186.213/evaluation-service";
let evaluationToken = process.env.EVALUATION_ACCESS_TOKEN;
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

async function refreshEvaluationToken() {
  const requiredValues = [
    "EVALUATION_EMAIL",
    "EVALUATION_NAME",
    "EVALUATION_ROLL_NO",
    "EVALUATION_ACCESS_CODE",
    "EVALUATION_CLIENT_ID",
    "EVALUATION_CLIENT_SECRET"
  ];
  const missingValue = requiredValues.find((key) => !process.env[key]);

  if (missingValue) {
    throw new Error("Evaluation credentials are not fully configured");
  }

  const auth = await getAuthToken({
    email: process.env.EVALUATION_EMAIL,
    name: process.env.EVALUATION_NAME,
    rollNo: process.env.EVALUATION_ROLL_NO,
    accessCode: process.env.EVALUATION_ACCESS_CODE,
    clientID: process.env.EVALUATION_CLIENT_ID,
    clientSecret: process.env.EVALUATION_CLIENT_SECRET
  });

  evaluationToken = auth.access_token;
  return evaluationToken;
}

async function requestLiveNotifications(token) {
  return fetch(`${apiBase}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function fetchNotificationsFromSource() {
  if (!evaluationToken) {
    await refreshEvaluationToken();
  }

  let response = await requestLiveNotifications(evaluationToken);

  if (response.status === 401) {
    const freshToken = await refreshEvaluationToken();
    response = await requestLiveNotifications(freshToken);
  }

  if (!response.ok) {
    throw new Error("Notification source request failed");
  }

  const body = await response.json();
  return body.notifications || [];
}

async function getNotifications(query = {}) {
  const rawNotifications = await fetchNotificationsFromSource();
  let notifications = rawNotifications.map((item) => normalizeNotification(item, viewedIds));

  if (query.notification_type) {
    notifications = notifications.filter(
      (item) => item.type.toLowerCase() === query.notification_type.toLowerCase()
    );
  }

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || notifications.length));
  const start = (page - 1) * limit;

  return notifications.slice(start, start + limit);
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
