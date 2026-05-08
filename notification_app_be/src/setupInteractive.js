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
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || defaultValue;
}

const rl = readline.createInterface({ input, output });
const existing = readExistingEnv();

try {
  const profile = {
    email: await ask("Email", existing.EVALUATION_EMAIL),
    name: await ask("Name", existing.EVALUATION_NAME),
    mobileNo: await ask("Mobile number", existing.EVALUATION_MOBILE),
    githubUsername: await ask("GitHub username", existing.EVALUATION_GITHUB_USERNAME || "SARVESH-MS"),
    rollNo: await ask("Roll number", existing.EVALUATION_ROLL_NO || "7376231CS301"),
    accessCode: await ask("Access code", existing.EVALUATION_ACCESS_CODE)
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
  rl.close();
}
