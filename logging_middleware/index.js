const DEFAULT_LOG_URL = "http://4.224.186.213/evaluation-service/logs";

const allowedStacks = new Set(["backend", "frontend"]);
const allowedLevels = new Set(["debug", "info", "warn", "error", "fatal"]);
const backendPackages = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service"
]);
const frontendPackages = new Set(["api", "component", "hook", "page", "state", "style"]);
const sharedPackages = new Set(["auth", "config", "middleware", "utils"]);

function isValidPackage(stack, packageName) {
  if (sharedPackages.has(packageName)) {
    return true;
  }

  if (stack === "backend") {
    return backendPackages.has(packageName);
  }

  return frontendPackages.has(packageName);
}

function validateLogInput(stack, level, packageName, message) {
  if (!allowedStacks.has(stack)) {
    throw new Error("Invalid stack for log entry");
  }

  if (!allowedLevels.has(level)) {
    throw new Error("Invalid level for log entry");
  }

  if (!isValidPackage(stack, packageName)) {
    throw new Error("Invalid package for log entry");
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Log message must be a non-empty string");
  }
}

export function createLogger(options = {}) {
  const runtimeEnv = typeof process !== "undefined" && process.env ? process.env : {};
  const endpoint = options.endpoint || runtimeEnv.LOG_API_URL || DEFAULT_LOG_URL;
  const token = options.token || runtimeEnv.LOG_ACCESS_TOKEN || runtimeEnv.ACCESS_TOKEN;

  return async function Log(stack, level, packageName, message) {
    validateLogInput(stack, level, packageName, message);

    if (!token) {
      return {
        skipped: true,
        reason: "missing_token"
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        stack,
        level,
        package: packageName,
        message
      })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.message || "Log request failed");
    }

    return body;
  };
}

export const Log = createLogger();
