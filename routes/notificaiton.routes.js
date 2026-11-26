const router = require("express").Router();
const { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } = require("../controllers/notification.controller");
const { verifyToken } = require("../middlewares/auth.middlewares");

router.get("/", verifyToken, getNotifications);

router.patch("/read-all", verifyToken, markAllNotificationsAsRead);

router.patch("/:id/read", verifyToken, markNotificationAsRead);

module.exports = router;