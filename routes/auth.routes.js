const router = require("express").Router();
const { signup, login, verifyUser } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middlewares");

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify", verifyToken, verifyUser);

module.exports = router;
