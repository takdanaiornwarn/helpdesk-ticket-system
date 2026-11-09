
// =============================================
// STEP 12.4 - CATEGORY & TICKET CRUD TESTING
// Node.js Built-in Test Runner
// =============================================

require("dotenv").config();

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const BASE_URL = "http://localhost:3000";

// Test credentials from .env
const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// Unique test data
const uniqueId = randomUUID().slice(0, 8);

const categoryName = `Auto CRUD ${uniqueId}`;
const updatedCategoryName = `Auto CRUD Updated ${uniqueId}`;

const ticketTitle = `Auto Ticket ${uniqueId}`;
const updatedTicketTitle = `Updated Auto Ticket ${uniqueId}`;

// Variables shared between tests
let userToken;
let adminToken;
let categoryId = null;
let ticketId = null;

// =============================================
// HELPER: Send HTTP Requests
// =============================================

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

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  return {
    status: response.status,
    body,
  };
}

// =============================================
// HELPER: Login
// =============================================

async function login(email, password, expectedRole) {
  const result = await apiRequest(
    "POST",
    "/api/auth/login",
    null,
    { email, password }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.user.role, expectedRole);

  return result.body.data.token;
}

// =============================================
// HELPER: Extract Created ID
// =============================================

function extractId(body, resource) {
  const id =
    body.data?.id ??
    body.data?.[resource]?.id ??
    body[resource]?.id;

  assert.ok(
    Number.isInteger(id) && id > 0,
    `Cannot find ${resource} ID in API response`
  );

  return id;
}

// =============================================
// CATEGORY & TICKET CRUD TEST SUITE
// =============================================

describe("Category and Ticket CRUD Tests", { concurrency: false }, () => {

  // Login before testing
  before(async () => {
    assert.ok(
      USER_EMAIL && USER_PASSWORD,
      "Missing TEST_USER credentials in .env"
    );

    assert.ok(
      ADMIN_EMAIL && ADMIN_PASSWORD,
      "Missing TEST_ADMIN credentials in .env"
    );

    userToken = await login(
      USER_EMAIL,
      USER_PASSWORD,
      "USER"
    );

    adminToken = await login(
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      "ADMIN"
    );
  });

  // -----------------------------------------
  // CLEANUP: Remove temporary test data
  // -----------------------------------------

  after(async () => {
    const errors = [];

    // Delete remaining test ticket
    if (ticketId !== null && userToken) {
      try {
        const result = await apiRequest(
          "DELETE",
          `/api/tickets/${ticketId}`,
          userToken
        );

        if (![200, 204, 404].includes(result.status)) {
          errors.push(`Ticket cleanup: HTTP ${result.status}`);
        }
      } catch (error) {
        errors.push(`Ticket cleanup: ${error.message}`);
      }
    }

    // Delete remaining test category
    if (categoryId !== null && adminToken) {
      try {
        const result = await apiRequest(
          "DELETE",
          `/api/categories/${categoryId}`,
          adminToken
        );

        if (![200, 204, 404].includes(result.status)) {
          errors.push(`Category cleanup: HTTP ${result.status}`);
        }
      } catch (error) {
        errors.push(`Category cleanup: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Cleanup failed: ${errors.join("; ")}`
      );
    }
  });

  // =========================================
  // PART A: CATEGORY CRUD
  // =========================================

  // TEST 1: ADMIN creates category
  it("ADMIN creates category - 201", async () => {
    const result = await apiRequest(
      "POST",
      "/api/categories",
      adminToken,
      { name: categoryName }
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);

    categoryId = extractId(result.body, "category");
  });

  // TEST 2: USER reads categories
  it("USER reads categories - 200", async () => {
    const result = await apiRequest(
      "GET",
      "/api/categories",
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 3: USER cannot create category
  it("USER cannot create category - 403", async () => {
    const result = await apiRequest(
      "POST",
      "/api/categories",
      userToken,
      { name: "Unauthorized Category" }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 4: ADMIN updates category
  it("ADMIN updates category - 200", async () => {
    const result = await apiRequest(
      "PUT",
      `/api/categories/${categoryId}`,
      adminToken,
      { name: updatedCategoryName }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 5: Invalid category name
  it("Invalid category name - 400", async () => {
    const result = await apiRequest(
      "POST",
      "/api/categories",
      adminToken,
      { name: "   " }
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });

  // =========================================
  // PART B: TICKET CRUD
  // =========================================

  // TEST 6: USER creates ticket
  it("USER creates ticket - 201", async () => {
    const result = await apiRequest(
      "POST",
      "/api/tickets",
      userToken,
      {
        title: ticketTitle,
        description: "Automated CRUD testing",
        priority: "MEDIUM",
        categoryName: updatedCategoryName
      }
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);

    ticketId = extractId(result.body, "ticket");
  });

  // TEST 7: USER reads own ticket
  it("USER reads own ticket - 200", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}`,
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 8: ADMIN reads ticket
  it("ADMIN reads ticket - 200", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}`,
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  
  // TEST 9: USER updates own ticket
  it("USER updates ticket - 200", async () => {
    const result = await apiRequest(
      "PUT",
      `/api/tickets/${ticketId}`,
      userToken,
      {
        title: updatedTicketTitle,
        description: "Updated automated CRUD testing",
        priority: "HIGH"
      }
    );

    // Show API response if the test fails
    if (result.status !== 200) {
      console.log("Update Ticket Error:", result.body);
    }

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });


  // TEST 10: Invalid ticket update
  it("Invalid ticket update - 400", async () => {
    const result = await apiRequest(
      "PUT",
      `/api/tickets/${ticketId}`,
      userToken,
      {
        title: ""
      }
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });

  // TEST 11: Ticket creation without JWT
  it("Create ticket without JWT - 401", async () => {
    const result = await apiRequest(
      "POST",
      "/api/tickets",
      null,
      {
        title: "Unauthorized Ticket",
        description: "Should not be created",
        categoryName: updatedCategoryName
      }
    );

    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });

  // =========================================
  // PART C: CATEGORY DELETE PROTECTION
  // =========================================

  // TEST 12: USER cannot delete category
  it("USER cannot delete category - 403", async () => {
    const result = await apiRequest(
      "DELETE",
      `/api/categories/${categoryId}`,
      userToken
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 13: Cannot delete category in use
  it("Cannot delete category with tickets - 409", async () => {
    const result = await apiRequest(
      "DELETE",
      `/api/categories/${categoryId}`,
      adminToken
    );

    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
  });

  // =========================================
  // PART D: DELETE TEST DATA
  // =========================================

  // TEST 14: USER deletes own ticket
  it("USER deletes ticket - 200", async () => {
    const result = await apiRequest(
      "DELETE",
      `/api/tickets/${ticketId}`,
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 15: Deleted ticket returns 404
  it("Deleted ticket returns 404", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}`,
      userToken
    );

    assert.equal(result.status, 404);
    assert.equal(result.body.success, false);
  });

  // TEST 16: ADMIN deletes unused category
  it("ADMIN deletes category - 200", async () => {
    const result = await apiRequest(
      "DELETE",
      `/api/categories/${categoryId}`,
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 17: Confirm category deleted
  it("Deleted category is absent - 200", async () => {
    const result = await apiRequest(
      "GET",
      "/api/categories",
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const categories = Array.isArray(result.body.data)
      ? result.body.data
      : result.body.categories;

    if (Array.isArray(categories)) {
      assert.equal(
        categories.some((c) => c.id === categoryId),
        false
      );
    }
  });

});
