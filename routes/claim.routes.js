const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const { withdrawClaim, reactivateClaim } = require("../controllers/claim.controller");

router.patch("/:id/withdraw", verifyToken, withdrawClaim);
router.patch("/:id/reactivate", verifyToken, reactivateClaim)

module.exports = router;