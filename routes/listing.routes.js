const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing, getListings, getListingDetails, updateListing, deleteListing} = require("../controllers/listing.controller")

router.post("/", verifyToken, createListing);
router.get("/", getListings);
router.get("/:id", getListingDetails);
router.patch("/:id", verifyToken, updateListing);
router.delete("/:id", verifyToken, deleteListing)

module.exports = router;
