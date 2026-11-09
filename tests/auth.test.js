
// ==========================================
// STEP 12.2 - AUTOMATED AUTH API TESTS
// Node.js Built-in Test Runner
// ==========================================

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const BASE_URL = "http://localhost:3000";

// Generate a unique email for each test run
const testEmail = `autotest-${randomUUID()}@example.com`;
const testPassword = "ExampleAuthTest123!";

let registeredUserId;
let jwtToken;

// ------------------------------------------
// HELPER: Send POST JSON request
// ------------------------------------------
async function postJson(path, data) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await response.json();

  return { response, body };
}

// ==========================================
// AUTHENTICATION TEST SUITE
// ==========================================

describe("Register and Login API Tests", { concurrency: false }, () => {

  // TEST 1: Register successfully
  it("Register should return 201", async () => {
    const { response, body } = await postJson(
      "/api/auth/register",
      {
        name: "Automated Test User",
        email: testEmail,
        password: testPassword,
      }
    );

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.email, testEmail);
    assert.equal(body.data.role, "USER");

    // Password hash must not be exposed
    assert.equal(
      Object.hasOwn(body.data, "passwordHash"),
      false
    );

    registeredUserId = body.data.id;
  });

  // TEST 2: Duplicate email
  it("Duplicate email should return 409", async () => {
    const { response, body } = await postJson(
      "/api/auth/register",
      {
        name: "Duplicate Test User",
        email: testEmail,
        password: testPassword,
      }
    );

    assert.equal(response.status, 409);
    assert.equal(body.success, false);
  });

  // TEST 3: Invalid email format
  it("Invalid email should return 400", async () => {
    const { response, body } = await postJson(
      "/api/auth/register",
      {
        name: "Invalid Email Test",
        email: "invalid-email",
        password: testPassword,
      }
    );

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });

  // TEST 4: Short password
  it("Short password should return 400", async () => {
    const { response, body } = await postJson(
      "/api/auth/register",
      {
        name: "Short Password Test",
        email: `short-${randomUUID()}@example.com`,
        password: "12345",
      }
    );

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });

  // TEST 5: Prevent ADMIN role registration
  it("Register with ADMIN role should return 400", async () => {
    const { response, body } = await postJson(
      "/api/auth/register",
      {
        name: "Unauthorized Admin",
        email: `admin-${randomUUID()}@example.com`,
        password: testPassword,
        role: "ADMIN",
      }
    );

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });

  // TEST 6: Login successfully
  it("Valid login should return 200 and JWT", async () => {
    const { response, body } = await postJson(
      "/api/auth/login",
      {
        email: testEmail,
        password: testPassword,
      }
    );

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testEmail);
    assert.equal(body.data.user.role, "USER");

    // Validate JWT format
    assert.equal(typeof body.data.token, "string");
    assert.equal(body.data.token.split(".").length, 3);

    jwtToken = body.data.token;
  });

  // TEST 7: Incorrect password
  it("Invalid password should return 401", async () => {
    const { response, body } = await postJson(
      "/api/auth/login",
      {
        email: testEmail,
        password: "WrongPassword123!",
      }
    );

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  // TEST 8: Nonexistent email
  it("Nonexistent email should return 401", async () => {
    const { response, body } = await postJson(
      "/api/auth/login",
      {
        email: `missing-${randomUUID()}@example.com`,
        password: testPassword,
      }
    );

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  // TEST 9: Missing password
  it("Missing password should return 400", async () => {
    const { response, body } = await postJson(
      "/api/auth/login",
      {
        email: testEmail,
      }
    );

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });

  // TEST 10: Access protected API using JWT
  it("Valid JWT should access /api/auth/me", async () => {
    assert.ok(jwtToken, "JWT token is missing");

    const response = await fetch(
      `${BASE_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    );

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, registeredUserId);
    assert.equal(body.data.email, testEmail);
    assert.equal(body.data.role, "USER");

    // Sensitive information must not be returned
    assert.equal(
      Object.hasOwn(body.data, "passwordHash"),
      false
    );
  });

});
