import "dotenv/config";
import { getAuthToken, registerClient } from "./authClient.js";

const command = process.argv[2];

const profile = {
  email: process.env.EVALUATION_EMAIL,
  name: process.env.EVALUATION_NAME,
  mobileNo: process.env.EVALUATION_MOBILE,
  githubUsername: process.env.EVALUATION_GITHUB_USERNAME,
  rollNo: process.env.EVALUATION_ROLL_NO,
  accessCode: process.env.EVALUATION_ACCESS_CODE,
  clientID: process.env.EVALUATION_CLIENT_ID,
  clientSecret: process.env.EVALUATION_CLIENT_SECRET
};

function requireFields(fields) {
  const missingFields = fields.filter((field) => !profile[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required env values: ${missingFields.join(", ")}`);
  }
}

if (command === "register") {
  requireFields(["email", "name", "mobileNo", "githubUsername", "rollNo", "accessCode"]);
  const result = await registerClient(profile);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else if (command === "auth") {
  requireFields(["email", "name", "rollNo", "accessCode", "clientID", "clientSecret"]);
  const result = await getAuthToken(profile);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write("Use: node src/setupCredentials.js register|auth\n");
}
