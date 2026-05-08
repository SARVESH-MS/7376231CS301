import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAuthToken, registerClient } from "./authClient.js";

const envPath = new URL("../.env", import.meta.url);

function readExistingEnv() {
  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim()];
      })
  );
}

function writeEnv(values) {
  const lines = [
    "PORT=4000",
    "EVALUATION_API_BASE=http://4.224.186.213/evaluation-service",
    `EVALUATION_EMAIL=${values.email}`,
    `EVALUATION_NAME=${values.name}`,
    `EVALUATION_MOBILE=${values.mobileNo}`,
    `EVALUATION_GITHUB_USERNAME=${values.githubUsername}`,
    `EVALUATION_ROLL_NO=${values.rollNo}`,
    `EVALUATION_ACCESS_CODE=${values.accessCode}`,
    `EVALUATION_CLIENT_ID=${values.clientID}`,
    `EVALUATION_CLIENT_SECRET=${values.clientSecret}`,
    `EVALUATION_ACCESS_TOKEN=${values.accessToken}`,
    `LOG_ACCESS_TOKEN=${values.accessToken}`
  ];

  writeFileSync(envPath, `${lines.join("\n")}\n`);
}

async function ask(question, defaultValue = "") {
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }

  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || defaultValue;
}

let rl;
const existing = readExistingEnv();

async function getValue(question, envKey, fallback = "") {
  return process.env[envKey] || existing[envKey] || (await ask(question, fallback));
}

try {
  const profile = {
    email: await getValue("Email", "EVALUATION_EMAIL"),
    name: await getValue("Name", "EVALUATION_NAME"),
    mobileNo: await getValue("Mobile number", "EVALUATION_MOBILE"),
    githubUsername: await getValue("GitHub username", "EVALUATION_GITHUB_USERNAME", "SARVESH-MS"),
    rollNo: await getValue("Roll number", "EVALUATION_ROLL_NO", "7376231CS301"),
    accessCode: await getValue("Access code", "EVALUATION_ACCESS_CODE")
  };

  let clientID = existing.EVALUATION_CLIENT_ID;
  let clientSecret = existing.EVALUATION_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    const registration = await registerClient(profile);
    clientID = registration.clientID;
    clientSecret = registration.clientSecret;
    output.write("\nRegistered successfully. Client credentials received.\n");
  } else {
    output.write("\nExisting client credentials found. Skipping registration.\n");
  }

  const auth = await getAuthToken({
    ...profile,
    clientID,
    clientSecret
  });

  writeEnv({
    ...profile,
    clientID,
    clientSecret,
    accessToken: auth.access_token
  });

  output.write("Authentication completed. Local .env file updated.\n");
} catch (error) {
  output.write(`Setup failed: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  rl?.close();
}
