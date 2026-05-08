const typeWeights = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function parseTimestamp(value) {
  if (!value) {
    return 0;
  }

  return new Date(value.replace(" ", "T")).getTime();
}

export function normalizeNotification(rawNotification, viewedIds = new Set()) {
  const id = rawNotification.id || rawNotification.ID;
  const type = rawNotification.type || rawNotification.Type;
  const message = rawNotification.message || rawNotification.Message;
  const timestamp = rawNotification.timestamp || rawNotification.Timestamp;

  return {
    id,
    type,
    message,
    timestamp,
    isRead: viewedIds.has(id) || rawNotification.isRead === true
  };
}

export function scoreNotification(notification, now = Date.now()) {
  const typeScore = typeWeights[notification.type] || 0;
  const ageMs = Math.max(0, now - parseTimestamp(notification.timestamp));
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 100 - ageHours);

  return typeScore * 1000 + recencyScore;
}

export function getPriorityNotifications(notifications, options = {}) {
  const limit = options.limit || 10;
  const now = options.now || Date.now();

  return notifications
    .filter((notification) => !notification.isRead)
    .map((notification) => ({
      ...notification,
      priorityScore: Number(scoreNotification(notification, now).toFixed(2))
    }))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      return parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp);
    })
    .slice(0, limit);
}
