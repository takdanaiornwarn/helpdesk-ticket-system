
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();

const BASE_URL = "http://localhost:3000";

const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// Existing test data
const OWN_TICKET_ID = 19;
const OTHER_TICKET_ID = 1;

let userToken;
let adminToken;
let userId;
let adminId;

// Send API request
async function apiRequest(method, path, token, data) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(data !== undefined
      ? { body: JSON.stringify(data) }
      : {}),
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}

async function login(email, password) {
  const result = await apiRequest(
    "POST",
    "/api/auth/login",
    null,
    { email, password }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);

  return result.body.data;
}

describe("JWT and Authorization Tests", { concurrency: false }, () => {
  // Login once before all tests
  before(async () => {
    assert.ok(USER_EMAIL && USER_PASSWORD,
      "Missing TEST_USER_EMAIL or TEST_USER_PASSWORD");

    assert.ok(ADMIN_EMAIL && ADMIN_PASSWORD,
      "Missing TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD");

    const userLogin = await login(USER_EMAIL, USER_PASSWORD);
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

    assert.equal(userLogin.user.role, "USER");
    assert.equal(adminLogin.user.role, "ADMIN");

    userToken = userLogin.token;
    adminToken = adminLogin.token;
    userId = userLogin.user.id;
    adminId = adminLogin.user.id;
  });

  // TEST 1
  it("USER token should access /api/auth/me", async () => {
    const result = await apiRequest(
      "GET", "/api/auth/me", userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data.id, userId);
    assert.equal(result.body.data.role, "USER");
  });

  // TEST 2
  it("ADMIN token should access /api/auth/me", async () => {
    const result = await apiRequest(
      "GET", "/api/auth/me", adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data.id, adminId);
    assert.equal(result.body.data.role, "ADMIN");
  });

  // TEST 3
  it("Missing token should return 401", async () => {
    const result = await apiRequest(
      "GET", "/api/auth/me"
    );

    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });

  // TEST 4
  it("Invalid JWT should be rejected", async () => {
    const result = await apiRequest(
      "GET", "/api/auth/me", "invalid.jwt.token"
    );

    assert.ok([401, 403].includes(result.status));
    assert.equal(result.body.success, false);
  });

  // TEST 5
  it("USER should access categories", async () => {
    const result = await apiRequest(
      "GET", "/api/categories", userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 6
  it("USER should access own ticket", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${OWN_TICKET_ID}`,
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 7
  it("USER cannot access another user's ticket", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${OTHER_TICKET_ID}`,
      userToken
    );

    assert.equal(result.status, 404);
    assert.equal(result.body.success, false);
  });

  // TEST 8
  it("ADMIN can access another user's ticket", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${OTHER_TICKET_ID}`,
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 9
  it("USER cannot change ticket status", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${OWN_TICKET_ID}/status`,
      userToken,
      { status: "IN_PROGRESS" }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 10
  it("USER cannot assign tickets", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${OWN_TICKET_ID}/assign`,
      userToken,
      { assignedToId: null }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 11
  it("ADMIN can view assigned tickets", async () => {
    const result = await apiRequest(
      "GET",
      "/api/tickets/assigned/me",
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  });

  // TEST 12
  it("ADMIN can view ticket history", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${OWN_TICKET_ID}/history`,
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  });
});
