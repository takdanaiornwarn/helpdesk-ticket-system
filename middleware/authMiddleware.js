
const jwt = require("jsonwebtoken");

// Authentication Middleware
function authenticateToken(req, res, next) {
  // 1. Get Authorization Header
  const authHeader = req.headers.authorization;

  // 2. Check Bearer Token
  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
  }

  // 3. Extract Token
  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
  }

  try {
    // 4. Verify JWT Token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    // 5. Validate User ID
    if (
      !Number.isSafeInteger(decoded.id) ||
      decoded.id <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 6. Store User ID in Request
    req.userId = decoded.id;

    // 7. Continue to Next Function
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;
