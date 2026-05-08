const apiBase = process.env.EVALUATION_API_BASE || "http://4.224.186.213/evaluation-service";

async function postJson(path, payload) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `Request failed: ${path}`);
  }

  return body;
}

export function registerClient(profile) {
  return postJson("/register", {
    email: profile.email,
    name: profile.name,
    mobileNo: profile.mobileNo,
    githubUsername: profile.githubUsername,
    rollNo: profile.rollNo,
    accessCode: profile.accessCode
  });
}

export function getAuthToken(profile) {
  return postJson("/auth", {
    email: profile.email,
    name: profile.name,
    rollNo: profile.rollNo,
    accessCode: profile.accessCode,
    clientID: profile.clientID,
    clientSecret: profile.clientSecret
  });
}
