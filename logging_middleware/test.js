import { createLogger } from "./index.js";

const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  calls.push({ url, options });
  return {
    ok: true,
    json: async () => ({
      logID: "test-log-id",
      message: "log created successfully"
    })
  };
};

const Log = createLogger({
  endpoint: "http://example.test/logs",
  token: "test-token"
});

const result = await Log("backend", "info", "service", "notification service started");

if (result.logID !== "test-log-id") {
  throw new Error("Expected log response to be returned");
}

const requestBody = JSON.parse(calls[0].options.body);

if (requestBody.stack !== "backend" || requestBody.package !== "service") {
  throw new Error("Log request body was not formed correctly");
}

globalThis.fetch = originalFetch;
