
// ==========================================
// STEP 12.1 - AUTOMATED API SMOKE TESTS
// Node.js Built-in Test Runner
// ==========================================

const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL = "http://localhost:3000";

// ------------------------------------------
// TEST 1: Check server is running
// ------------------------------------------
test("GET / should return 200", async () => {
  const response = await fetch(`${BASE_URL}/`);

  assert.equal(response.status, 200);
});

// ------------------------------------------
// TEST 2: Protected API without JWT
// ------------------------------------------
test("GET /api/auth/me without token should return 401", async () => {
  const response = await fetch(`${BASE_URL}/api/auth/me`);

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

// ------------------------------------------
// TEST 3: Unknown API endpoint
// ------------------------------------------
test("Unknown endpoint should return 404", async () => {
  const response = await fetch(
    `${BASE_URL}/api/unknown-test`
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "API endpoint not found");
});

// ------------------------------------------
// TEST 4: Invalid JSON format
// ------------------------------------------
test("Invalid JSON should return 400", async () => {
  const response = await fetch(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{invalid-json",
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Invalid JSON format");
});

// ------------------------------------------
// TEST 5: Login missing password
// ------------------------------------------
test("Login without password should return 400", async () => {
  const response = await fetch(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "testuser@example.com",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

// ------------------------------------------
// TEST 6: Login with invalid credentials
// ------------------------------------------
test("Login with invalid credentials should return 401", async () => {
  const response = await fetch(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "nonexistent-smoke-test@example.com",
        password: "WrongPassword123!",
      }),
    }
  );

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});
