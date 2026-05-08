# Notification App Backend

This folder contains the backend service for the notification system.

The backend is responsible for exposing notification-related APIs, handling application logic, and using the shared logging middleware for important events and errors.

## Run

```bash
npm install
npm start
```

The backend runs on `http://localhost:4000`.

Create a `.env` file from `.env.example` when protected API credentials are available. Without credentials, the backend uses sample notification data so the frontend can still be tested.

Useful setup commands:

```bash
npm run setup
npm run register
npm run auth
```

Do not commit `.env` because it contains private credentials.
