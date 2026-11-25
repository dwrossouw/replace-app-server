const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing, getListings} = require("../controllers/listing.controller")

router.post("/", verifyToken, createListing);
router.get("/", getListings);
// router.get("/:id")
// router.patch("/:id");
// router.delete("/:id")

module.exports = router;
