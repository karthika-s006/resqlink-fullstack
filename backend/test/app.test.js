import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "../src/app.js";

async function startTestServer(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test("health and API report MongoDB as unavailable instead of hanging", async (t) => {
  const baseUrl = await startTestServer(t, createApp({ databaseReady: () => false }));
  const health = await fetch(`${baseUrl}/api/health`);
  const apiResponse = await fetch(`${baseUrl}/api/resources`);

  assert.equal(health.status, 503);
  assert.equal((await health.json()).database, "disconnected");
  assert.match((await apiResponse.json()).message, /MongoDB is unavailable/);
});

test("local Vite origins 5173 and 5174 are allowed by CORS", async (t) => {
  const baseUrl = await startTestServer(t, createApp({ databaseReady: () => false }));
  for (const origin of ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"]) {
    const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: origin } });
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
});

test("unconfigured external origins are not granted CORS access", async (t) => {
  const baseUrl = await startTestServer(t, createApp({ databaseReady: () => false }));
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://untrusted.example" } });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("registration validates required fields and protected routes reject anonymous users", async (t) => {
  const baseUrl = await startTestServer(t, createApp({ databaseReady: () => true }));
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const adminDashboard = await fetch(`${baseUrl}/api/admin/dashboard`);
  const requests = await fetch(`${baseUrl}/api/requests`);

  assert.equal(registration.status, 400);
  assert.match((await registration.json()).message, /required/);
  assert.equal(adminDashboard.status, 401);
  assert.equal(requests.status, 401);
});