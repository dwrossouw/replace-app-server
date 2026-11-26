const router = require("express").Router();

const authRouter = require("./auth.routes");
router.use("/auth", authRouter);

const userRouter = require("./user.routes");
router.use("/users", userRouter);

const listingRouter = require("./listing.routes");
router.use("/listings", listingRouter);

module.exports = router;