const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing, getListings, getListingDetails, updateListing, deleteListing, reopenListing, getCollectionDetails, completeListing} = require("../controllers/listing.controller")
const upload = require("../middlewares/upload.middlewares");
const { createClaim, getListingClaims} = require("../controllers/claim.controller");

router.post("/", verifyToken, upload.single("image"), createListing);
router.get("/", getListings);
router.get("/:id", getListingDetails);
router.patch("/:id", verifyToken,upload.single("image"), updateListing);
router.delete("/:id", verifyToken, deleteListing)
router.post("/:id/claims", verifyToken, createClaim);
router.get("/:id/claims", verifyToken, getListingClaims);
router.patch("/id/reopen", verifyToken, reopenListing);
router.get("/:id/collection", verifyToken, getCollectionDetails);
router.patch("/:id/complete", verifyToken, completeListing)

module.exports = router;
