const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing, getListings, getListingDetails, updateListing, deleteListing} = require("../controllers/listing.controller")
const upload = require("../middlewares/upload.middlewares");
const { createClaim } = require("../controllers/claim.controller");

router.post("/", verifyToken, upload.single("image"), createListing);
router.get("/", getListings);
router.get("/:id", getListingDetails);
router.patch("/:id", verifyToken,upload.single("image"), updateListing);
router.delete("/:id", verifyToken, deleteListing)

router.post("/:id/claims", verifyToken, createClaim);

module.exports = router;
