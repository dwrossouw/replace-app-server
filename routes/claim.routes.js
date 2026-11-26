const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const { withdrawClaim, reactivateClaim, selectClaim, confirmClaim, declineClaim, cancelClaim } = require("../controllers/claim.controller");

router.patch("/:id/withdraw", verifyToken, withdrawClaim);
router.patch("/:id/reactivate", verifyToken, reactivateClaim)
router.patch("/:id/select", verifyToken, selectClaim)
router.patch("/:id/confirm", confirmClaim)
router.patch("/:id/decline", verifyToken, declineClaim)
router.patch("/:id/cancel", verifyToken, cancelClaim)

module.exports = router;