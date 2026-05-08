import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createLogger } from "logging_middleware";
import {
  fetchNotifications,
  fetchPriorityNotifications,
  markNotificationViewed
} from "./api.js";
import "./styles.css";

const notificationTypes = ["All", "Placement", "Result", "Event"];
const Log = createLogger({
  token: import.meta.env.VITE_LOG_ACCESS_TOKEN
});

function useViewedNotifications() {
  const [viewedIds, setViewedIds] = useState(() => {
    const stored = window.localStorage.getItem("viewedNotificationIds");
    return new Set(stored ? JSON.parse(stored) : []);
  });

  function save(nextIds) {
    window.localStorage.setItem("viewedNotificationIds", JSON.stringify([...nextIds]));
    setViewedIds(new Set(nextIds));
  }

  async function markViewed(id) {
    const nextIds = new Set(viewedIds);
    nextIds.add(id);
    save(nextIds);
    await markNotificationViewed(id);
  }

  return {
    viewedIds,
    markViewed
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value.replace(" ", "T")));
}

function typeClassName(type) {
  return `type ${type.toLowerCase()}`;
}

function NotificationCard({ notification, viewedIds, onOpen }) {
  const isViewed = viewedIds.has(notification.id) || notification.isRead;

  return (
    <article className={`notification ${isViewed ? "viewed" : "new"}`}>
      <div className="notificationHeader">
        <span className={typeClassName(notification.type)}>{notification.type}</span>
        {!isViewed && <span className="newBadge">New</span>}
      </div>
      <h3>{notification.message}</h3>
      <p>{formatTime(notification.timestamp)}</p>
      {notification.priorityScore && (
        <span className="score">Priority score {notification.priorityScore}</span>
      )}
      <button type="button" onClick={() => onOpen(notification.id)} disabled={isViewed}>
        {isViewed ? "Viewed" : "Mark viewed"}
      </button>
    </article>
  );
}

function EmptyState({ message }) {
  return <div className="emptyState">{message}</div>;
}

function App() {
  const [activeView, setActiveView] = useState("all");
  const [notificationType, setNotificationType] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [priorityNotifications, setPriorityNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { viewedIds, markViewed } = useViewedNotifications();

  const visibleNotifications = useMemo(() => {
    return notifications.map((notification) => ({
      ...notification,
      isRead: viewedIds.has(notification.id) || notification.isRead
    }));
  }, [notifications, viewedIds]);

  const priorityList = useMemo(() => {
    return priorityNotifications.map((notification) => ({
      ...notification,
      isRead: viewedIds.has(notification.id) || notification.isRead
    }));
  }, [priorityNotifications, viewedIds]);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [allResponse, priorityResponse] = await Promise.all([
        fetchNotifications({
          limit: 50,
          notificationType
        }),
        fetchPriorityNotifications(10)
      ]);

      setNotifications(allResponse.notifications);
      setPriorityNotifications(priorityResponse.notifications);
      await Log("frontend", "info", "api", "notifications loaded");
    } catch (loadError) {
      setError(loadError.message);
      await Log("frontend", "error", "api", "failed to load notifications").catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkViewed(id) {
    await markViewed(id);
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, [notificationType]);

  const newCount = visibleNotifications.filter((notification) => !notification.isRead).length;

  return (
    <main className="pageShell">
      <section className="topBar">
        <div>
          <p className="eyebrow">Campus notifications</p>
          <h1>Notification Inbox</h1>
        </div>
        <div className="summary">
          <strong>{newCount}</strong>
          <span>unread</span>
        </div>
      </section>

      <section className="toolbar">
        <div className="tabs" aria-label="Views">
          <button
            className={activeView === "all" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("all")}
          >
            All notifications
          </button>
          <button
            className={activeView === "priority" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("priority")}
          >
            Priority inbox
          </button>
        </div>

        <label>
          <span>Type</span>
          <select value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
            {notificationTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </section>

      {error && <div className="errorBanner">{error}</div>}

      {isLoading ? (
        <div className="emptyState">Loading notifications...</div>
      ) : activeView === "all" ? (
        <section className="notificationGrid">
          {visibleNotifications.length === 0 ? (
            <EmptyState message="No notifications found." />
          ) : (
            visibleNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                viewedIds={viewedIds}
                onOpen={handleMarkViewed}
              />
            ))
          )}
        </section>
      ) : (
        <section className="notificationGrid priorityGrid">
          {priorityList.length === 0 ? (
            <EmptyState message="No unread priority notifications." />
          ) : (
            priorityList.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                viewedIds={viewedIds}
                onOpen={handleMarkViewed}
              />
            ))
          )}
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
