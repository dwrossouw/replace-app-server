const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const User = require("../models/User.model");

// Signup route - POST
// /api/auth/signup
router.post("/signup", async (req, res) => {
  const { fullName, displayName, email, password } = req.body;

  if (!fullName || !displayName || !email || !password) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(email) === false) {
    res
      .status(400)
      .json({ message: "Email address is not in the correct format." });
    return;
  }

  const passwordRegex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9!@#$%^&*(),.?":{}|<>_-]{6,20}$/;

  if (passwordRegex.test(password) === false) {
    res.status(400).json({
      message:
        "Password does not match the requirements: minimum 6 characters,maximum 20 characters, must include lowercase and uppercase characters and a number or numbers. Special characters are allowed.",
    });
    return;
  }

  const foundUser = await User.findOne({
    email: email,
  });
  if (foundUser) {
    res.status(400).json({ message: "Email already in use." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = {
    fullName: fullName,
    displayName: displayName,
    email: email,
    passwordHash: passwordHash,
  };

  await User.create(newUser);
  res.status(201).json({ message: "User created." });
});

// Login route POST
// /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const foundUser = await User.findOne({
    email: email,
  }).select("+passwordHash");

  if (!foundUser) {
    res.status(400).json({ message: "User not found with that email." });
    return;
  }

  const isPasswordCorrect = await bcrypt.compare(password, foundUser.passwordHash);
  if (!isPasswordCorrect) {
    res.status(400).json({ message: "Password not correct" });
    return;
  }

  const payload = {
    _id: foundUser._id,
    role: foundUser.role,
  };

  const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: "1d",
  });
  res.status(200).json({ authToken, payload });
});

// Verify user GET
// /api/auth/verify
router.get("/verify", verifyToken, (req, res)=>{
    res.status(200).json(req.payload)
})

module.exports = router;

