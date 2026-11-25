// JSON Web Token library used to verify Bearer tokens and decode their payload.
const jwt = require("jsonwebtoken");

// Authenticate a request before allowing it to continue to the route handler.
function verifyToken(req, res, next) {
  try {
    // Authorization headers use the format "Bearer <token>". Split on the space and take the second value, which contains the JWT itself.
    const authToken = req.headers.authorization.split(" ")[1];

    // Verify both the signature and expiration using the server-side secret.
    // A valid token returns its payload, such as the user ID and role.
    const payload = jwt.verify(authToken, process.env.TOKEN_SECRET);

    // Store the decoded payload on the request so later middleware and routes can inspect the authenticated user's information.
    req.payload = payload;

    // Continue to the next middleware or route handler.
    next();
  } catch (error) {
    // Missing, malformed, expired, or incorrectly signed tokens are unauthorized.
    res.status(401).json({ message: "Token not valid or doesn't exist." });
  }
}

// Restrict access to routes that require an admin role.
function verifyAdmin(req, res, next) {
  // verifyToken must run first so req.payload contains the signed JWT payload.
  if (req.payload.role === "admin") {
    // The current user has the required role, so continue to the protected route.
    next();
  } else {
    // Users without the admin role receive a 401 response and are not authorized.
    res.status(401).json({ message: "Route only for admin" });
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
};
