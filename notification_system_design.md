# Stage 1

## REST API Design

This stage describes the API contract for the notification platform. The design covers the main actions required by the frontend, the expected request and response formats, required headers, and the approach for real-time notification updates.

# Stage 2

## Storage Design

This stage explains the storage choice for saving notifications reliably. It includes the database schema, the reason for choosing the database, possible scaling issues as data grows, and the queries needed by the APIs from Stage 1.

# Stage 3

## Query Optimization

This stage reviews the slow unread-notification query and explains why it does not scale well. It also covers a better indexing strategy and the query needed to fetch placement notifications from the last seven days.

# Stage 4

## Fetching Strategy

This stage focuses on reducing database load when notifications are fetched frequently. The approach should improve the user experience while avoiding unnecessary repeated reads on every page load.

# Stage 5

## Notification Delivery Redesign

This stage identifies the problems in the synchronous "notify all" flow. It proposes a more reliable and faster design for saving notifications, sending emails, and pushing in-app updates without stopping halfway through the process.

# Stage 6

## Priority Inbox

This stage explains how priority notifications are selected and maintained. The priority score is based on notification type and recency so that the most important unread notifications can be shown first.
