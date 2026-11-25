const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing, getListings, getListingDetails} = require("../controllers/listing.controller")

router.post("/", verifyToken, createListing);
router.get("/", getListings);
router.get("/:id", getListingDetails);
// router.patch("/:id");
// router.delete("/:id")

module.exports = router;
