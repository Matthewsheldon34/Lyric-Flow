const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  // No Authorization header?
  if (!header) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  // Must be "Bearer <token>"
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);

    req.user = user; // Attach decoded payload
    next(); // Continue request
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
