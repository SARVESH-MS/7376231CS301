# 7376231CS301

This repository contains my full stack notification system submission.

The project is a student notification dashboard. It fetches notifications from the protected evaluation API, shows them in a frontend application, supports filtering by notification type, and provides a priority inbox for the most important unread updates.

## Project Overview

Students receive different kinds of campus updates such as placement drives, results, and events. The backend is responsible for talking to the protected notification API and preparing the response for the frontend. The frontend displays the notifications in a clean dashboard and lets the user mark items as viewed.

Priority notifications are selected based on a simple weight system:

```text
Placement > Result > Event
```

Recent unread notifications are preferred within the same type.

## Folder Structure

```text
logging_middleware/
notification_system_design.md
notification_app_be/
notification_app_fe/
screenshots/
```

## Folder Details

- `logging_middleware/` contains the reusable logging helper used by the backend and frontend.
- `notification_system_design.md` contains the stage-wise design answers.
- `notification_app_be/` contains the backend API service.
- `notification_app_fe/` contains the React frontend application.
- `screenshots/` contains desktop and mobile output screenshots.

## Features

- Fetches notifications from the protected notification API.
- Shows all notifications in the frontend.
- Supports notification type filtering.
- Provides a priority inbox.
- Distinguishes between new and viewed notifications.
- Uses a reusable logging middleware.
- Includes backend and frontend run commands.
- Includes desktop and mobile screenshots.

## Tech Stack

- JavaScript
- Node.js
- Express
- React
- Vite
- Vanilla CSS

## Setup

Install everything once from the repository root:

```bash
npm install
```

The backend needs local credentials in `notification_app_be/.env` to access the protected API. The `.env` file is not committed to GitHub.

To complete registration/auth setup locally:

```bash
npm --workspace notification_app_be run setup
```

## Run The Project

Start the backend from the repository root:

```bash
npm run start:be
```

Start the frontend in a second terminal:

```bash
npm run start:fe
```

The frontend runs on `http://localhost:3000`.

The backend runs on `http://localhost:4000`.

## API Flow

```text
Evaluation Notification API
        |
        v
Backend API
        |
        v
React Frontend
        |
        v
Student Dashboard
```

The frontend does not call the protected API directly. It calls the local backend, and the backend uses the stored access token to fetch notification data.

## Testing

Run all checks from the repository root:

```bash
npm test
```

This runs the logging middleware test, backend priority logic test, and frontend production build.

## Screenshots

Output screenshots are available in the `screenshots/` folder for both desktop and mobile views.
