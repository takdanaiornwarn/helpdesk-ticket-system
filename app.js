
require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const authenticateToken = require("./middleware/authMiddleware");

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());


// ==========================================
// CATEGORY VALIDATION HELPER
// ==========================================

function validateCategoryInput(body) {

  // 1. Body must be a JSON object
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      valid: false,
      message: "Request body must be a JSON object",
    };
  }

  // 2. Allow only the "name" field
  const allowedFields = ["name"];
  const receivedFields = Object.keys(body);

  const invalidFields = receivedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return {
      valid: false,
      message: "Only the name field is allowed",
    };
  }

  // 3. Name must be a string
  if (typeof body.name !== "string") {
    return {
      valid: false,
      message: "Category name must be a string",
    };
  }

  // 4. Remove leading/trailing whitespace
  const categoryName = body.name.trim();

  // 5. Name must not be empty
  if (!categoryName) {
    return {
      valid: false,
      message: "Category name is required",
    };
  }

  // 6. Maximum 100 characters
  if (categoryName.length > 100) {
    return {
      valid: false,
      message: "Category name must not exceed 100 characters",
    };
  }

  // 7. Validation passed
  return {
    valid: true,
    name: categoryName,
  };
}


// ==========================================
// TICKET VALIDATION HELPER
// CREATE / UPDATE
// ==========================================

function validateTicketInput(body, mode = "create") {
  // 1. Validate request body
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      valid: false,
      message: "Request body must be a JSON object",
    };
  }

  // 2. Allowed fields
  const allowedFields =
    mode === "create"
      ? ["title", "description", "priority", "categoryName"]
      : ["title", "description", "priority"];

  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return {
      valid: false,
      message: "Request contains invalid fields",
    };
  }

  // 3. Validate title
  if (typeof body.title !== "string") {
    return {
      valid: false,
      message: "Title must be a string",
    };
  }

  const title = body.title.trim();

  if (!title) {
    return {
      valid: false,
      message: "Title is required",
    };
  }

  if (title.length > 150) {
    return {
      valid: false,
      message: "Title must not exceed 150 characters",
    };
  }

  // 4. Validate description
  if (typeof body.description !== "string") {
    return {
      valid: false,
      message: "Description must be a string",
    };
  }

  const description = body.description.trim();

  if (!description) {
    return {
      valid: false,
      message: "Description is required",
    };
  }

  if (description.length > 2000) {
    return {
      valid: false,
      message: "Description must not exceed 2000 characters",
    };
  }

  // 5. Validate priority
  const priority =
    mode === "create" && body.priority === undefined
      ? "MEDIUM"
      : body.priority;

  if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) {
    return {
      valid: false,
      message: "Priority must be LOW, MEDIUM or HIGH",
    };
  }

  // 6. Prepare validated data
  const data = {
    title,
    description,
    priority,
  };

  // 7. Validate categoryName for CREATE
  if (mode === "create") {
    if (typeof body.categoryName !== "string") {
      return {
        valid: false,
        message: "Category name must be a string",
      };
    }

    const categoryName = body.categoryName.trim();

    if (!categoryName) {
      return {
        valid: false,
        message: "Category name is required",
      };
    }

    if (categoryName.length > 100) {
      return {
        valid: false,
        message: "Category name must not exceed 100 characters",
      };
    }

    data.categoryName = categoryName;
  }

  // 8. Validation successful
  return {
    valid: true,
    data,
  };
}

// ==========================================
// INVALID JSON ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  // Handle malformed JSON from express.json()
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
    });
  }

  // Pass other errors to the next error handler
  next(err);
});


// ==========================================
// HOME API
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Helpdesk API is running",
    success: true,
  });
});


// ==========================================
// REGISTER API (PostgreSQL + bcrypt)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.post("/api/auth/register", async (req, res, next) => {
  try {

    // 1. Validate request body
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
    }

    // 2. Receive user information
    const { name, email, password } = req.body;

    // 3. Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // 4. Validate allowed fields
    const allowedFields = [
      "name",
      "email",
      "password",
    ];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Request contains invalid fields",
      });
    }

    // 5. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 6. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // 7. Validate password length
    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters",
      });
    }

    // 8. Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // 9. Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 10. Return success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: newUser,
    });

  } catch (error) {
    // 11. Handle duplicate email
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // 12. Forward unexpected errors
    // to Centralized Error Handler
    return next(error);
  }
});



// ==========================================
// LOGIN API (PostgreSQL + bcrypt + JWT)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.post("/api/auth/login", async (req, res, next) => {
  try {
    // 1. Validate request body
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
    }

    // 2. Receive login information
    const { email, password } = req.body;

    // 3. Validate required fields
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 4. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 5. Find user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // 6. Check user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 7. Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 8. Check JWT configuration
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // 9. Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        algorithm: "HS256",
      }
    );

    // 10. Return success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: token,
        tokenType: "Bearer",
      },
    });

  } catch (error) {
    // 11. Forward unexpected errors
    // to Centralized Error Handler
    return next(error);
  }
});



// ==========================================
// GET CURRENT USER (PROTECTED API)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/auth/me", authenticateToken, async (req, res, next) => {
  try {
    // 1. Get current user from PostgreSQL
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 2. Check if user still exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 3. Return success response
    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });

  } catch (error) {
    // 4. Forward unexpected errors
    // to Centralized Error Handler
    return next(error);
  }
});



// ==========================================
// GET ALL TICKETS (USER / ADMIN)
// WITH ASSIGNED TO INFORMATION
// AND CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/tickets", authenticateToken, async (req, res, next) => {
  try {
    

    // 1. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 2. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 3. Set access permission
    // ADMIN: View all tickets
    // USER: View only own tickets
    const whereCondition =
      currentUser.role === "ADMIN"
        ? {}
        : {
            createdById: currentUser.id,
          };

    // 4. Get tickets from PostgreSQL
    const tickets = await prisma.ticket.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,

        // Ticket creator
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        // Assigned administrator
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        // Ticket category
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 5. Return success response
    return res.status(200).json({
      success: true,
      total: tickets.length,
      data: tickets,
    });

  } catch (error) {
    // Forward errors to Centralized Error Handler
    return next(error);
  }
});




// ==========================================
// GET TICKET BY ID (USER / ADMIN)
// WITH ASSIGNED TO INFORMATION
// AND CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/tickets/:id", authenticateToken, async (req, res, next) => {
  try {
    // 1. Get Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    // 2. Validate Ticket ID
    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId) ||
      ticketId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 3. Get current user from PostgreSQL
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 4. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 5. Set access permission
    // ADMIN: View any ticket
    // USER: View only own tickets
    const whereCondition =
      currentUser.role === "ADMIN"
        ? {
            id: ticketId,
          }
        : {
            id: ticketId,
            createdById: currentUser.id,
          };

    // 6. Find ticket with permission check
    const ticket = await prisma.ticket.findFirst({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,

        // Ticket creator
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        // Assigned administrator
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        // Ticket category
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 7. Check ticket exists and permission
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // 8. Return success response
    return res.status(200).json({
      success: true,
      data: ticket,
    });

  } catch (error) {
    // Forward error to Centralized Error Handler
    return next(error);
  }
});



// ==========================================
// POST CREATE TICKET (USER / ADMIN)
// WITH VALIDATION & CENTRALIZED ERROR HANDLING
// ==========================================

app.post("/api/tickets", authenticateToken, async (req, res, next) => {
  try {
    
    // 1. Validate tic
    // ket input
    const validation = validateTicketInput(req.body, "create");

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // 2. Get validated data
    const {
      title,
      description,
      priority,
      categoryName,
    } = validation.data;

    // 3. Find category
    const category = await prisma.category.findUnique({
      where: {
        name: categoryName,
      },
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // 4. Create ticket using authenticated User ID
    const newTicket = await prisma.ticket.create({
      data: {
        title: title,
        description: description,
        priority: priority,

        createdBy: {
          connect: {
            id: req.userId,
          },
        },

        category: {
          connect: {
            id: category.id,
          },
        },
      },

      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,

        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 5. Return success response
    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: newTicket,
    });

  } catch (error) {
    // Forward unexpected errors to Centralized Error Handler
    return next(error);
  }
});



 

// ==========================================
// PUT UPDATE TICKET (USER / ADMIN)
// WITH VALIDATION & CENTRALIZED ERROR HANDLING
// ==========================================

app.put("/api/tickets/:id", authenticateToken, async (req, res, next) => {
  try {
    
    // 1. Get Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    // 2. Validate Ticket ID
    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 3. Get current user from PostgreSQL
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 4. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 5. Validate Ticket Input
    const validation = validateTicketInput(
      req.body,
      "update"
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // 6. Get validated data
    const {
      title,
      description,
      priority,
    } = validation.data;

    // 7. Set update permission
    // ADMIN can update any ticket
    // USER can update only own tickets
    const whereCondition =
      currentUser.role === "ADMIN"
        ? {
            id: ticketId,
          }
        : {
            id: ticketId,
            createdById: currentUser.id,
          };

    // 8. Update Ticket in PostgreSQL
    const updatedTicket = await prisma.ticket.update({
      where: whereCondition,
      data: {
        title: title,
        description: description,
        priority: priority,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 9. Return success response
    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
    });

  } catch (error) {
    // Ticket not found or no permission
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Forward unexpected errors to Centralized Handler
    return next(error);
  }
});




// ==========================================
// DELETE TICKET (USER / ADMIN)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.delete("/api/tickets/:id", authenticateToken, async (req, res, next) => {
  try {

    // 1. Get Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    // 2. Validate Ticket ID
    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId) ||
      ticketId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 3. Get current user from PostgreSQL
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 4. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 5. Set delete permission
    // ADMIN can delete any ticket
    // USER can delete only own tickets
    const whereCondition =
      currentUser.role === "ADMIN"
        ? {
            id: ticketId,
          }
        : {
            id: ticketId,
            createdById: currentUser.id,
          };

    // 6. Delete Ticket with permission check
    const deletedTicket = await prisma.ticket.delete({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
      },
    });

    // 7. Return success response
    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
      data: deletedTicket,
    });

  } catch (error) {
    // Ticket not found or no permission
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Forward unexpected errors to Centralized Handler
    return next(error);
  }
});



// ==========================================
// PATCH UPDATE TICKET STATUS (ADMIN ONLY)
// WITH PRISMA TRANSACTION
// AND CENTRALIZED ERROR HANDLING
// ==========================================

app.patch("/api/tickets/:id/status", authenticateToken, async (req, res, next) => {
  try {
    // 1. Validate Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId) ||
      ticketId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 2. Validate request body
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
    }

    const { status, note } = req.body;

    // 3. Validate Ticket Status
    const allowedStatuses = [
      "NEW",
      "IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    // 4. Validate Note (optional)
    if (
      note !== undefined &&
      (typeof note !== "string" || note.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Note must be a string (max 500 characters)",
      });
    }

    // 5. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 6. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 7. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 8. Find Ticket
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // 9. Prevent duplicate status
    if (ticket.status === status) {
      return res.status(409).json({
        success: false,
        message: "Ticket already has this status",
      });
    }

    // 10. Update Ticket and create History
    // Both operations must succeed together
    const result = await prisma.$transaction(async (tx) => {

      // Update Ticket Status
      const updatedTicket = await tx.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          status: status,
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      });

      // Create Ticket History
      const history = await tx.ticketHistory.create({
        data: {
          ticketId: ticketId,
          actorId: currentUser.id,
          oldStatus: ticket.status,
          newStatus: status,
          note: typeof note === "string"
            ? note.trim()
            : null,
        },
        select: {
          id: true,
          oldStatus: true,
          newStatus: true,
          createdAt: true,
        },
      });

      return {
        updatedTicket,
        history,
      };
    });

    // 11. Return success response
    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: result,
    });

  } catch (error) {
    // Ticket no longer exists
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Forward unexpected errors
    return next(error);
  }
});



// ==========================================
// GET TICKET HISTORY (USER / ADMIN)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/tickets/:id/history", authenticateToken, async (req, res, next) => {
  try {

    // 1. Get Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    // 2. Validate Ticket ID
    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId) ||
      ticketId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 3. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 4. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 5. Set access permission
    // ADMIN can view any ticket history
    // USER can view only own ticket history
    const whereCondition =
      currentUser.role === "ADMIN"
        ? {
            id: ticketId,
          }
        : {
            id: ticketId,
            createdById: currentUser.id,
          };

    // 6. Find ticket with permission check
    const ticket = await prisma.ticket.findFirst({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    // 7. Check ticket exists and permission
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // 8. Get ticket history from PostgreSQL
    const histories = await prisma.ticketHistory.findMany({
      where: {
        ticketId: ticket.id,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        ticketId: true,
        actorId: true,
        oldStatus: true,
        newStatus: true,
        note: true,
        createdAt: true,
      },
    });

    // 9. Return success response
    return res.status(200).json({
      success: true,
      message: "Ticket history retrieved successfully",
      ticket: ticket,
      total: histories.length,
      data: histories,
    });

  } catch (error) {
    // Forward unexpected errors
    // to Centralized Error Handler
    return next(error);
  }
});


// ==========================================
// PATCH ASSIGN TICKET (ADMIN ONLY)
// ==========================================



// ==========================================
// PATCH ASSIGN / REASSIGN / UNASSIGN TICKET
// ADMIN ONLY
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.patch("/api/tickets/:id/assign", authenticateToken, async (req, res, next) => {
  try {


    // 1. Validate Ticket ID
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(ticketId) ||
      ticketId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
    }

    // 2. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 3. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 4. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 5. Validate request body
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
    }

    const allowedFields = ["assignedToId"];

    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Only assignedToId is allowed",
      });
    }

    const { assignedToId } = req.body;

    // Allow positive integer or null
    if (
      assignedToId !== null &&
      (
        !Number.isSafeInteger(assignedToId) ||
        assignedToId <= 0 ||
        assignedToId > 2147483647
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "assignedToId must be a positive integer or null",
      });
    }

    // 6. Find Ticket
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // 7. Prevent duplicate assignment
    if (ticket.assignedToId === assignedToId) {
      return res.status(409).json({
        success: false,
        message: "Ticket already has this assignee",
      });
    }

    // 8. Validate the new assignee
    let assignedUser = null;

    if (assignedToId !== null) {
      assignedUser = await prisma.user.findUnique({
        where: {
          id: assignedToId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          message: "Assigned user not found",
        });
      }

      if (assignedUser.role !== "ADMIN") {
        return res.status(400).json({
          success: false,
          message: "Tickets can only be assigned to ADMIN users",
        });
      }
    }

    // 9. Update Ticket in PostgreSQL
    const updatedTicket = await prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: {
        assignedToId: assignedToId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdById: true,
        assignedToId: true,
        updatedAt: true,
      },
    });

    // 10. Return success response
    return res.status(200).json({
      success: true,
      message:
        assignedToId === null
          ? "Ticket unassigned successfully"
          : "Ticket assigned successfully",
      data: {
        ticket: updatedTicket,
        assignedTo: assignedUser,
      },
    });

  } catch (error) {
    // Ticket not found
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Forward unexpected errors to centralized handler
    return next(error);
  }
});




// ==========================================
// GET MY ASSIGNED TICKETS (ADMIN ONLY)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/tickets/assigned/me", authenticateToken, async (req, res, next) => {
  try {
    // 1. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 2. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 3. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 4. Find tickets assigned to current ADMIN
    const tickets = await prisma.ticket.findMany({
      where: {
        assignedToId: currentUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        assignedToId: true,

        // Ticket creator
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        // Assigned administrator
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        // Ticket category
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 5. Return success response
    return res.status(200).json({
      success: true,
      message: "Assigned tickets retrieved successfully",
      total: tickets.length,
      data: tickets,
    });

  } catch (error) {
    // Forward unexpected errors
    // to Centralized Error Handler
    return next(error);
  }
});


// ==========================================
// GET ALL CATEGORIES (USER / ADMIN)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.get("/api/categories", authenticateToken, async (req, res, next) => {
  try {

    // 1. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 2. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 3. Get all categories from PostgreSQL
    const categories = await prisma.category.findMany({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 4. Return response
    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      total: categories.length,
      data: categories,
    });

  } catch (error) {
    // Forward error to Centralized Error Handler
    return next(error);
  }
});



// ==========================================
// POST CREATE CATEGORY (ADMIN ONLY)
// WITH VALIDATION & CENTRALIZED ERROR HANDLING
// ==========================================

app.post("/api/categories", authenticateToken, async (req, res, next) => {
  try {
    
    // 1. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 2. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 3. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 4. Validate request body type
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
    }

    // 5. Reject fields other than "name"
    const allowedFields = ["name"];
    const receivedFields = Object.keys(req.body);

    const invalidFields = receivedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Only the name field is allowed",
      });
    }

    // 6. Validate input using helper
    const validation = validateCategoryInput(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // 7. Get validated category name
    const categoryName = validation.name;

    // 8. Check duplicate category name
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: "insensitive",
        },
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    // 9. Create category
    const newCategory = await prisma.category.create({
      data: {
        name: categoryName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 10. Return success response
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });

  } catch (error) {
    // Handle duplicate category name
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Forward unexpected errors to centralized handler
    return next(error);
  }
});



// ==========================================
// PUT UPDATE CATEGORY (ADMIN ONLY)
// WITH VALIDATION & CENTRALIZED ERROR HANDLING
// ==========================================

app.put("/api/categories/:id", authenticateToken, async (req, res, next) => {
  try {
    // 1. Validate Category ID
    const idParam = req.params.id;
    const categoryId = Number(idParam);

    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // 2. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 3. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 4. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 5. Validate category input
    const validation = validateCategoryInput(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // 6. Get validated category name
    const categoryName = validation.name;

    // 7. Find existing category by ID
    const currentCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!currentCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 8. Check duplicate name (case-insensitive)
    // Exclude the current category
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        id: {
          not: categoryId,
        },
        name: {
          equals: categoryName,
          mode: "insensitive",
        },
      },
    });

    if (duplicateCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    // 9. Handle unchanged name
    if (currentCategory.name === categoryName) {
      return res.status(200).json({
        success: true,
        message: "Category name unchanged",
        data: currentCategory,
      });
    }

    // 10. Update category in PostgreSQL
    const updatedCategory = await prisma.category.update({
      where: {
        id: categoryId,
      },
      data: {
        name: categoryName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 11. Return success response
    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });

  } catch (error) {
    // Handle duplicate category name
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Handle category not found
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Forward unexpected errors to centralized handler
    return next(error);
  }
});




// ==========================================
// DELETE CATEGORY (ADMIN ONLY)
// WITH CENTRALIZED ERROR HANDLING
// ==========================================

app.delete("/api/categories/:id", authenticateToken, async (req, res, next) => {
  try {
  
    // 1. Validate Category ID
    const idParam = req.params.id;
    const categoryId = Number(idParam);

    if (
      !/^[1-9]\d*$/.test(idParam) ||
      !Number.isSafeInteger(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // 2. Get current user
    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    // 3. Check user exists
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 4. ADMIN only
    if (currentUser.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 5. Find category by ID
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 6. Count tickets using this category
    const ticketCount = await prisma.ticket.count({
      where: {
        categoryId: categoryId,
      },
    });

    // 7. Prevent deleting category with tickets
    if (ticketCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category with existing tickets",
        ticketCount: ticketCount,
      });
    }

    // 8. Delete category
    const deletedCategory = await prisma.category.delete({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 9. Return success response
    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: deletedCategory,
    });

  } catch (error) {
    // Foreign key or required relation error
    if (error.code === "P2003" || error.code === "P2014") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category with existing tickets",
      });
    }

    // Category not found
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Forward unexpected errors to centralized handler
    return next(error);
  }
});


// ==========================================
// GLOBAL 404 NOT FOUND HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});


// ==========================================
// CENTRALIZED ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  // 1. Check if response was already sent
  if (res.headersSent) {
    return next(err);
  }

  // 2. Log error on the server
  console.error("Centralized Error:", err);

  // 3. Determine HTTP status
  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  // 4. Return consistent JSON response
  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : "Request could not be processed",
  });
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
