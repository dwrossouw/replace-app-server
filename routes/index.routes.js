const router = require("express").Router();

const authRouter = require("./auth.routes");
router.use("/auth", authRouter);

const userRouter = require("./user.routes");
router.use("/users", userRouter);

module.exports = router;