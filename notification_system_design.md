# Stage 1

## REST API Design

The notification platform needs a small API surface that is predictable for the frontend and easy to scale later. Every protected endpoint should receive an `Authorization: Bearer <token>` header and should return JSON.

### Core Actions

1. Fetch notifications for a student.
2. Fetch priority notifications.
3. Mark a notification as viewed.
4. Create notifications for a target group of students.
5. Send real-time notification updates to connected clients.

### Endpoints

#### Get Notifications

```http
GET /api/students/{studentId}/notifications?limit=20&page=1&notification_type=Placement
Authorization: Bearer <token>
```

Response:

```json
{
  "notifications": [
    {
      "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "timestamp": "2026-04-22 17:51:18",
      "isRead": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasNextPage": true
  }
}
```

#### Get Priority Notifications

```http
GET /api/students/{studentId}/notifications/priority?limit=10
Authorization: Bearer <token>
```

Response:

```json
{
  "notifications": [
    {
      "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "timestamp": "2026-04-22 17:51:18",
      "isRead": false,
      "priorityScore": 3098.4
    }
  ]
}
```

#### Mark Notification As Viewed

```http
PATCH /api/students/{studentId}/notifications/{notificationId}/viewed
Authorization: Bearer <token>
```

Response:

```json
{
  "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
  "isRead": true
}
```

#### Create Notification

```http
POST /api/notifications
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "type": "Placement",
  "message": "New placement drive opened",
  "target": {
    "kind": "all_students"
  }
}
```

Response:

```json
{
  "id": "notification-template-id",
  "status": "queued"
}
```

### Real-Time Updates

For real-time notifications, I would use Server-Sent Events for a simple one-way stream from server to browser:

```http
GET /api/students/{studentId}/notifications/stream
Authorization: Bearer <token>
```

When a new notification is created, the backend writes it to storage and publishes a small event containing the notification id. Connected clients receive the event and refetch the latest page or append the new item if it is already present in the payload.

# Stage 2

## Storage Design

I would use PostgreSQL for the main notification store. The data is relational because notifications are connected to students, read status, notification type, and delivery attempts. PostgreSQL also gives strong indexing support, transactions, and predictable query behavior as the table grows.

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  notification_type notification_type NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_notifications (
  student_id BIGINT NOT NULL REFERENCES students(id),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (student_id, notification_id)
);
```

### Scaling Concerns

As volume increases, the largest table will be `student_notifications` because one notification can be mapped to thousands of students. The first scaling step is good composite indexes. Later, this table can be partitioned by student id hash or by created month if historical queries become heavy.

### Query Style

Unread notifications for a student should be queried from the mapping table first, then joined to notification content:

```sql
SELECT n.id, n.notification_type, n.message, n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT $2;
```

# Stage 3

## Query Optimization

The given query is not ideal:

```sql
SELECT *
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

The first issue is that it returns `SELECT *`, which fetches unnecessary columns. The second issue is ordering oldest first, which is usually not useful for an inbox. The biggest issue is that the query becomes slow when the database has many rows and does not have an index matching the `studentID`, `isRead`, and `createdAt` access pattern.

### Better Index

```sql
CREATE INDEX idx_student_notifications_unread_created
ON student_notifications (student_id, is_read, notification_id);
```

If `created_at` is stored directly in the mapping table, the better index is:

```sql
CREATE INDEX idx_student_notifications_unread_created_at
ON student_notifications (student_id, is_read, created_at DESC);
```

This allows the database to find unread rows for one student and return the newest items without scanning millions of rows.

Adding indexes on every column is not effective. Indexes improve read performance only when they match real query patterns. Too many indexes slow down inserts and updates, increase storage usage, and make the planner's work harder.

### Placement Notifications From Last 7 Days

```sql
SELECT n.id, n.notification_type, n.message, n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
  AND n.notification_type = 'Placement'
  AND n.created_at >= now() - interval '7 days'
ORDER BY n.created_at DESC;
```

Helpful index:

```sql
CREATE INDEX idx_notifications_type_created
ON notifications (notification_type, created_at DESC);
```

# Stage 4

## Fetching Strategy

Fetching notifications on every page load for every student can overload the database. I would combine caching, pagination, and event-driven updates.

The first page should be paginated with a small limit, such as 20 notifications. The backend can cache the first unread page per student for a short time, such as 30 seconds. When a student marks a notification as read or a new notification is assigned, the cache for that student should be invalidated.

For real-time updates, the server should push only a lightweight event, not the full inbox. The frontend can then fetch the latest notification page. This avoids constant polling while keeping the user experience fresh.

Tradeoffs:

- Short cache TTL improves speed but may show slightly stale data for a few seconds.
- Real-time push gives a better experience but needs connection management.
- Pagination reduces database pressure but requires the frontend to handle loading more items.

# Stage 5

## Notification Delivery Redesign

The synchronous pseudocode has several problems:

```text
for student_id in student_ids:
  send_email(student_id, message)
  save_to_db(student_id, message)
  push_to_app(student_id, message)
```

If the email call fails or hangs midway, the remaining students may never receive a notification. Email, database writes, and app pushes have different reliability requirements, so they should not all block each other in one loop.

### Better Design

1. Create a notification record once.
2. Bulk insert student notification rows in the database.
3. Publish delivery jobs to a queue.
4. Use workers to send emails and app pushes independently.
5. Retry failed jobs with backoff.
6. Track delivery status per student and channel.

Saving to the database should happen before external delivery. The database is the source of truth. Email and app push should happen asynchronously after the notification has been safely stored.

Revised pseudocode:

```text
function notify_all(student_ids, message):
  notification_id = create_notification(message)
  bulk_insert_student_notifications(notification_id, student_ids)

  for batch in chunk(student_ids, 500):
    enqueue("email_delivery", notification_id, batch)
    enqueue("app_push_delivery", notification_id, batch)

  return { notification_id, status: "queued" }
```

Worker pseudocode:

```text
function process_email_delivery(notification_id, student_ids):
  for student_id in student_ids:
    try:
      send_email(student_id, notification_id)
      mark_email_sent(student_id, notification_id)
    catch error:
      retry_or_mark_failed(student_id, notification_id)
```

# Stage 6

## Priority Inbox

The priority inbox should show the top unread notifications based on importance and recency. I used a score made from notification type weight and time freshness.

Type weight:

```text
Placement = 3
Result = 2
Event = 1
```

Score:

```text
priorityScore = typeWeight * 1000 + recencyScore
```

The multiplier keeps type importance stronger than small timestamp differences. Within the same type, newer notifications come first.

The backend implementation is in `notification_app_be/src/priority.js`. It normalizes API data, filters out viewed notifications, calculates scores, sorts by score, and returns the top 10.

To maintain the top notifications efficiently while new notifications keep coming in, I would avoid recalculating the full history every time. The backend can query only unread notifications for the student using the indexed access pattern, calculate scores on that limited result set, and cache the final top 10 briefly. When a new notification arrives or a notification is marked read, the cached top 10 for that student is invalidated.
