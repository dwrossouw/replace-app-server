const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth.middlewares");
const {updateLocation} = require("../controllers/user.controller");

router.patch("/me/location", verifyToken, updateLocation);
  
module.exports = router;
