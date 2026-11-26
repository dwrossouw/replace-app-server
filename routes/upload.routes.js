const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload.middleware");
const { uploadListingImage } = require("../controllers/upload.controller");

router.post("/", verifyToken, upload.single("image"), uploadListingImage);

module.exports = router;