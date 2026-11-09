
// ============================================
// STEP 12.5 - AUTOMATED TICKET WORKFLOW TESTS
// Status, Assignment and History
// ============================================

require("dotenv").config();

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

// Credentials from .env
const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// Generate unique test data
const uniqueId = randomUUID().slice(0, 8);
const categoryName = `Auto Workflow Category ${uniqueId}`;
const ticketTitle = `Auto Workflow Ticket ${uniqueId}`;

// Shared test variables
let userToken;
let adminToken;
let userId;
let adminId;
let ticketId;

// ============================================
// HELPER: Send HTTP request
// ============================================

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

// ============================================
// HELPER: Login
// ============================================

async function login(email, password, role) {
  const result = await apiRequest(
    "POST",
    "/api/auth/login",
    null,
    { email, password }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.user.role, role);

  return result.body.data;
}

// ============================================
// HELPER: Get resource ID
// ============================================

function extractId(body, resource) {
  const id =
    body.data?.id ??
    body.data?.[resource]?.id ??
    body[resource]?.id;

  assert.ok(
    Number.isInteger(id) && id > 0,
    `Cannot find ${resource} ID in response`
  );

  return id;
}

// ============================================
// WORKFLOW TEST SUITE
// ============================================

describe("Ticket Workflow Tests", { concurrency: false }, () => {

  // SETUP: Create temporary category and ticket
  before(async () => {
    assert.ok(
      USER_EMAIL && USER_PASSWORD,
      "Missing TEST_USER credentials in .env"
    );

    assert.ok(
      ADMIN_EMAIL && ADMIN_PASSWORD,
      "Missing TEST_ADMIN credentials in .env"
    );

    const userLogin = await login(
      USER_EMAIL,
      USER_PASSWORD,
      "USER"
    );

    const adminLogin = await login(
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      "ADMIN"
    );

    userToken = userLogin.token;
    adminToken = adminLogin.token;
    userId = userLogin.user.id;
    adminId = adminLogin.user.id;

    // Create a temporary category
    const categoryResult = await apiRequest(
      "POST",
      "/api/categories",
      adminToken,
      { name: categoryName }
    );

    assert.equal(categoryResult.status, 201);
    assert.equal(categoryResult.body.success, true);

    // Create a temporary ticket
    const ticketResult = await apiRequest(
      "POST",
      "/api/tickets",
      userToken,
      {
        title: ticketTitle,
        description: "Automated workflow testing",
        priority: "MEDIUM",
        categoryName: categoryName,
      }
    );

    assert.equal(ticketResult.status, 201);
    assert.equal(ticketResult.body.success, true);

    ticketId = extractId(ticketResult.body, "ticket");
  });

  // CLEANUP: Delete only this run's test data
  after(async () => {
    try {
      const testTickets = await prisma.ticket.findMany({
        where: {
          title: ticketTitle,
        },
        select: {
          id: true,
        },
      });

      for (const ticket of testTickets) {
        // Remove test history before deleting ticket
        await prisma.ticketHistory.deleteMany({
          where: {
            ticketId: ticket.id,
          },
        });

        await prisma.ticket.delete({
          where: {
            id: ticket.id,
          },
        });
      }

      // Remove this run's temporary category
      await prisma.category.deleteMany({
        where: {
          name: categoryName,
        },
      });

    } finally {
      await prisma.$disconnect();
    }
  });

  // ==========================================
  // PART A: TICKET STATUS
  // ==========================================

  // TEST 1
  it("New ticket has NEW status - 200", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}`,
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const ticket = result.body.data?.ticket ?? result.body.data;

    assert.equal(ticket.status, "NEW");
  });

  // TEST 2
  it("USER cannot update ticket status - 403", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/status`,
      userToken,
      { status: "IN_PROGRESS" }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 3
  it("Invalid ticket status - 400", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/status`,
      adminToken,
      { status: "INVALID_STATUS" }
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });

  // TEST 4
  it("ADMIN changes status to IN_PROGRESS - 200", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/status`,
      adminToken,
      {
        status: "IN_PROGRESS",
        note: "Started automated processing",
      }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 5
  it("Duplicate status returns 409", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/status`,
      adminToken,
      { status: "IN_PROGRESS" }
    );

    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
  });

  // TEST 6
  it("USER can read own ticket history - 200", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}/history`,
      userToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));

    const hasStatusChange = result.body.data.some(
      (history) =>
        history.oldStatus === "NEW" &&
        history.newStatus === "IN_PROGRESS"
    );

    assert.equal(hasStatusChange, true);
  });

  // ==========================================
  // PART B: TICKET ASSIGNMENT
  // ==========================================

  // TEST 7
  it("ADMIN assigns ticket to self - 200", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/assign`,
      adminToken,
      { assignedToId: adminId }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 8
  it("Duplicate assignment returns 409", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/assign`,
      adminToken,
      { assignedToId: adminId }
    );

    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
  });

  // TEST 9
  it("Assigned ticket appears in ADMIN list - 200", async () => {
    const result = await apiRequest(
      "GET",
      "/api/tickets/assigned/me",
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));

    const found = result.body.data.some(
      (ticket) => ticket.id === ticketId
    );

    assert.equal(found, true);
  });

  // TEST 10
  it("USER cannot assign ticket - 403", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/assign`,
      userToken,
      { assignedToId: null }
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  // TEST 11
  it("Cannot assign ticket to USER - 400", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/assign`,
      adminToken,
      { assignedToId: userId }
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });

  // TEST 12
  it("ADMIN unassigns ticket - 200", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/assign`,
      adminToken,
      { assignedToId: null }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 13
  it("Unassigned ticket is absent from ADMIN list", async () => {
    const result = await apiRequest(
      "GET",
      "/api/tickets/assigned/me",
      adminToken
    );

    assert.equal(result.status, 200);

    const found = result.body.data.some(
      (ticket) => ticket.id === ticketId
    );

    assert.equal(found, false);
  });

  // ==========================================
  // PART C: TICKET HISTORY
  // ==========================================

  // TEST 14
  it("ADMIN resolves ticket - 200", async () => {
    const result = await apiRequest(
      "PATCH",
      `/api/tickets/${ticketId}/status`,
      adminToken,
      {
        status: "RESOLVED",
        note: "Workflow completed",
      }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
  });

  // TEST 15
  it("ADMIN reads both status history records - 200", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}/history`,
      adminToken
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const histories = result.body.data;

    assert.ok(Array.isArray(histories));
    assert.equal(histories.length, 2);

    assert.ok(
      histories.some(
        (h) =>
          h.oldStatus === "NEW" &&
          h.newStatus === "IN_PROGRESS"
      )
    );

    assert.ok(
      histories.some(
        (h) =>
          h.oldStatus === "IN_PROGRESS" &&
          h.newStatus === "RESOLVED" &&
          h.note === "Workflow completed"
      )
    );
  });

  // TEST 16
  it("History without JWT returns 401", async () => {
    const result = await apiRequest(
      "GET",
      `/api/tickets/${ticketId}/history`,
      null
    );

    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });
});
