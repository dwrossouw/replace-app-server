const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {createListing} = require("../controllers/listing.controller")

router.post("/", verifyToken, createListing);
// router.get("/");
// router.get("/:id")
// router.patch("/:id");
// router.delete("/:id")

module.exports = router;
