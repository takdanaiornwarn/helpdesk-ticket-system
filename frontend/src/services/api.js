
// ========================================
// HELPDESK API SERVICE
// STEP 13.7.1 - ERROR HANDLING
// ========================================

// Notify App when an authenticated session expires
function notifySessionExpired() {
  window.dispatchEvent(
    new Event("helpdesk:session-expired")
  );
}

// ========================================
// SHARED RESPONSE HANDLER
// ========================================

async function handleResponse(
  response,
  { skipSessionEvent = false } = {}
) {
  let result;

  try {
    result = await response.json();
  } catch {
    if (response.status === 401 && !skipSessionEvent) {
      notifySessionExpired();
    }

    const error = new Error(
      response.status >= 500
        ? "The server returned an invalid response. Check the Backend."
        : "Invalid response from server"
    );

    error.status = response.status;
    throw error;
  }

  if (!response.ok || result.success === false) {
    if (response.status === 401 && !skipSessionEvent) {
      notifySessionExpired();
    }

    const error = new Error(
      result.message ||
        `Request failed (HTTP ${response.status})`
    );

    error.status = response.status;
    throw error;
  }

  return result;
}

// ========================================
// SHARED FETCH HANDLER
// ========================================

async function apiRequest(
  url,
  options = {},
  responseOptions = {}
) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    const error = new Error(
      "Cannot connect to the server. Check your internet connection and Backend."
    );

    error.status = 0;
    throw error;
  }

  return handleResponse(response, responseOptions);
}

// ========================================
// AUTHENTICATION HELPERS
// ========================================

function authHeaders(token) {
  if (!token) {
    throw new Error("Authentication token is missing");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function jsonHeaders(token) {
  return {
    ...authHeaders(token),
    "Content-Type": "application/json",
  };
}

function validateId(value, label = "ID") {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}`);
  }

  return id;
}

// ========================================
// 1. LOGIN
// POST /api/auth/login
// ========================================

export async function loginUser(email, password) {
  const result = await apiRequest(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
    {
      // Invalid login credentials must not trigger
      // a global session-expired event.
      skipSessionEvent: true,
    }
  );

  if (!result.data?.token || !result.data?.user) {
    throw new Error("Invalid login response");
  }

  return result.data;
}

// ========================================
// 2. GET CURRENT USER
// GET /api/auth/me
// ========================================

export async function getCurrentUser(token) {
  const result = await apiRequest("/api/auth/me", {
    headers: authHeaders(token),
  });

  if (!result.data) {
    throw new Error("Invalid user data from server");
  }

  return result.data;
}

// ========================================
// 3. GET ALL ACCESSIBLE TICKETS
// GET /api/tickets
// ========================================

export async function getTickets(token) {
  const result = await apiRequest("/api/tickets", {
    headers: authHeaders(token),
  });

  const tickets =
    result.data?.tickets ??
    result.data ??
    result.tickets;

  if (!Array.isArray(tickets)) {
    throw new Error("Invalid ticket data from server");
  }

  return tickets;
}

// ========================================
// 4. GET TICKET DETAILS
// GET /api/tickets/:id
// ========================================

export async function getTicketById(token, ticketId) {
  const id = validateId(ticketId, "ticket ID");

  const result = await apiRequest(
    `/api/tickets/${id}`,
    {
      headers: authHeaders(token),
    }
  );

  const ticket =
    result.data?.ticket ??
    result.data ??
    result.ticket;

  if (
    !ticket ||
    typeof ticket !== "object" ||
    Array.isArray(ticket) ||
    Number(ticket.id) !== id
  ) {
    throw new Error("Invalid ticket details from server");
  }

  return ticket;
}

// ========================================
// 5. GET CATEGORIES
// GET /api/categories
// ========================================

export async function getCategories(token) {
  const result = await apiRequest("/api/categories", {
    headers: authHeaders(token),
  });

  const categories =
    result.data?.categories ??
    result.data ??
    result.categories;

  if (!Array.isArray(categories)) {
    throw new Error("Invalid category data from server");
  }

  return categories;
}

// ========================================
// 6. CREATE TICKET
// POST /api/tickets
// ========================================

export async function createTicket(token, ticketData) {
  const result = await apiRequest("/api/tickets", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      categoryName: ticketData.categoryName,
    }),
  });

  return result.data?.ticket ?? result.data ?? result.ticket;
}

// ========================================
// 7. UPDATE TICKET
// PUT /api/tickets/:id
// ========================================

export async function updateTicket(
  token,
  ticketId,
  ticketData
) {
  const id = validateId(ticketId, "ticket ID");

  const result = await apiRequest(
    `/api/tickets/${id}`,
    {
      method: "PUT",
      headers: jsonHeaders(token),
      body: JSON.stringify({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
      }),
    }
  );

  return result.data?.ticket ?? result.data ?? result.ticket;
}

// ========================================
// 8. DELETE TICKET
// DELETE /api/tickets/:id
// ========================================

export async function deleteTicket(token, ticketId) {
  const id = validateId(ticketId, "ticket ID");

  return apiRequest(`/api/tickets/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// ========================================
// 9. UPDATE TICKET STATUS (ADMIN)
// PATCH /api/tickets/:id/status
// ========================================

export async function updateTicketStatus(
  token,
  ticketId,
  status,
  note = ""
) {
  const id = validateId(ticketId, "ticket ID");

  const allowedStatuses = [
    "NEW",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid ticket status");
  }

  const body = { status };

  if (note.trim()) {
    body.note = note.trim();
  }

  return apiRequest(`/api/tickets/${id}/status`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
}

// ========================================
// 10. GET TICKET HISTORY
// GET /api/tickets/:id/history
// ========================================

export async function getTicketHistory(token, ticketId) {
  const id = validateId(ticketId, "ticket ID");

  const result = await apiRequest(
    `/api/tickets/${id}/history`,
    {
      headers: authHeaders(token),
    }
  );

  const histories =
    result.data?.histories ??
    result.data ??
    result.histories;

  if (!Array.isArray(histories)) {
    throw new Error("Invalid ticket history data");
  }

  return histories;
}

// ========================================
// 11. ASSIGN / REASSIGN / UNASSIGN (ADMIN)
// PATCH /api/tickets/:id/assign
// ========================================

export async function assignTicket(
  token,
  ticketId,
  assignedToId
) {
  const id = validateId(ticketId, "ticket ID");

  const adminId =
    assignedToId === null
      ? null
      : validateId(assignedToId, "ADMIN User ID");

  return apiRequest(`/api/tickets/${id}/assign`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      assignedToId: adminId,
    }),
  });
}

// ========================================
// 12. GET MY ASSIGNED TICKETS (ADMIN)
// GET /api/tickets/assigned/me
// ========================================

export async function getAssignedTickets(token) {
  const result = await apiRequest(
    "/api/tickets/assigned/me",
    {
      headers: authHeaders(token),
    }
  );

  const tickets =
    result.data?.tickets ??
    result.data ??
    result.tickets;

  if (!Array.isArray(tickets)) {
    throw new Error("Invalid assigned tickets data");
  }

  return tickets;
}

// ========================================
// 13. CREATE CATEGORY (ADMIN)
// POST /api/categories
// ========================================

export async function createCategory(token, categoryName) {
  const name = categoryName.trim();

  if (!name) {
    throw new Error("Category name is required");
  }

  return apiRequest("/api/categories", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name }),
  });
}

// ========================================
// 14. UPDATE CATEGORY (ADMIN)
// PUT /api/categories/:id
// ========================================

export async function updateCategory(
  token,
  categoryId,
  categoryName
) {
  const id = validateId(categoryId, "category ID");
  const name = categoryName.trim();

  if (!name) {
    throw new Error("Category name is required");
  }

  return apiRequest(`/api/categories/${id}`, {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name }),
  });
}

// ========================================
// 15. DELETE CATEGORY (ADMIN)
// DELETE /api/categories/:id
// ========================================

export async function deleteCategory(token, categoryId) {
  const id = validateId(categoryId, "category ID");

  return apiRequest(`/api/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
