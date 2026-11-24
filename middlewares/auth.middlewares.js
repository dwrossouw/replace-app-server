const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  try {
    const authToken = req.headers.authorization.split(" ")[1];
    const payload = jwt.verify(authToken, process.env.TOKEN_SECRET);
    req.payload = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token not valid or doesn't exist." });
  }
}

function verifyAdmin(req, res, next) {
  if (req.payload.role === "admin") {
    next();
  } else {
    res.status(401).json({ message: "Route only for admin" });
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
};
