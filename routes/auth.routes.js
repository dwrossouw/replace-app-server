// bcrypt hashes passwords and compares plain-text passwords with stored hashes.
const bcrypt = require("bcryptjs");
// jsonwebtoken creates and verifies signed authentication tokens.
const jwt = require("jsonwebtoken");
// Create an Express router for all authentication-related endpoints.
const router = require("express").Router();
// Import middleware that verifies a JWT and attaches its payload to the request.
const { verifyToken } = require("../middlewares/auth.middlewares");
// Import the Mongoose model used to read and create user documents.
const User = require("../models/User.model");

// POST /api/auth/signup
// Register a new user after validating the submitted account details.
router.post("/signup", async (req, res) => {
  // Read the required signup values from the JSON request body.
  const { fullName, displayName, email, password } = req.body;

  // Reject incomplete submissions before performing any database operations.
  if (!fullName || !displayName || !email || !password) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  // Require an email containing a local part, @ symbol, and domain.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(email) === false) {
    res
      .status(400)
      .json({ message: "Email address is not in the correct format." });
    return;
  }

  // Require 6-20 characters, with lowercase, uppercase, and numeric characters.
  // Common special characters are permitted by the final character range.
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9!@#$%^&*(),.?":{}|<>_-]{6,20}$/;

  if (passwordRegex.test(password) === false) {
    res.status(400).json({
      message:
        "Password does not match the requirements: minimum 6 characters,maximum 20 characters, must include lowercase and uppercase characters and a number or numbers. Special characters are allowed.",
    });
    return;
  }

  // Check for an existing account before creating another one with the same email.
  const foundUser = await User.findOne({
    email: email,
  });
  if (foundUser) {
    res.status(400).json({ message: "Email already in use." });
    return;
  }

  // Hash the password with a cost factor of 12. The original plain-text password is never saved to the database.
  const passwordHash = await bcrypt.hash(password, 12);

  // Build the user document with the validated information and password hash.
  const newUser = {
    fullName: fullName,
    displayName: displayName,
    email: email,
    passwordHash: passwordHash,
  };

  // Persist the new account and return a success response only after creation succeeds.
  await User.create(newUser);
  res.status(201).json({ message: "User created." });
});

// POST /api/auth/login
// Authenticate an existing user and issue a one-day JSON Web Token.
router.post("/login", async (req, res) => {
  // Retrieve the credentials supplied by the client.
  const { email, password } = req.body;

  // Both credentials are required to attempt authentication.
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  // Find the account with this email. PasswordHash is normally excluded from model queries, so select it explicitly because login needs it for comparison.
  const foundUser = await User.findOne({
    email: email,
  }).select("+passwordHash");

  // Do not reveal additional account details for an unknown email.
  if (!foundUser) {
    res.status(400).json({ message: "User not found with that email." });
    return;
  }

  // Compare the plain-text login password with the bcrypt hash stored for this user.
  const isPasswordCorrect = await bcrypt.compare(password, foundUser.passwordHash);
  if (!isPasswordCorrect) {
    res.status(400).json({ message: "Password not correct" });
    return;
  }

  // Include only the user identity and role in the signed JWT payload.
  const payload = {
    _id: foundUser._id,
    role: foundUser.role,
  };

  // Sign the payload with the server secret and make the token expire after one day.
  const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: "1d",
  });
  // Return the token and a copy of the non-sensitive payload to the client.
  res.status(200).json({ authToken, payload });
});

// GET /api/auth/verify
// Verify the Bearer token and return the payload stored by verifyToken middleware.
router.get("/verify", verifyToken, (req, res)=>{
    res.status(200).json(req.payload)
})

module.exports = router;

