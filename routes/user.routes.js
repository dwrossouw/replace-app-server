const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {updateLocation, getMyListings, getMyClaims} = require("../controllers/user.controller");

router.patch("/me/location", verifyToken, updateLocation);
router.get("/me/listings", verifyToken, getMyListings);
router.get("/me/claims", verifyToken, getMyClaims);
  
module.exports = router;
