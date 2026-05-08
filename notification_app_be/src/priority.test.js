import { getPriorityNotifications } from "./priority.js";

const notifications = [
  {
    id: "event-new",
    type: "Event",
    message: "new event",
    timestamp: "2026-04-22 10:00:00",
    isRead: false
  },
  {
    id: "placement-old",
    type: "Placement",
    message: "placement update",
    timestamp: "2026-04-21 10:00:00",
    isRead: false
  },
  {
    id: "result-read",
    type: "Result",
    message: "already viewed",
    timestamp: "2026-04-23 10:00:00",
    isRead: true
  }
];

const priority = getPriorityNotifications(notifications, {
  limit: 2,
  now: new Date("2026-04-23T10:00:00").getTime()
});

if (priority.length !== 2) {
  throw new Error("Expected unread notifications only");
}

if (priority[0].id !== "placement-old") {
  throw new Error("Expected placement notification to receive highest priority");
}
