const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const { withdrawClaim } = require("../controllers/claim.controller");

router.patch("/:id/withdraw", verifyToken, withdrawClaim);

module.exports = router;