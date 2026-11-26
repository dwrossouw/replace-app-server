const Notification = require("../models/Notification.model");
const mongoose = require("mongoose");

// GET Retrieve all notifications for the authenticated user
const getNotifications = async (req, res) => {
  const userID = req.payload._id;

  const notifications = await Notification.find({
    recipient: userID,
  }).sort({ createdAt: -1 });

  res.status(200).json(notifications);
};

// PATCH Mark an individual notification as read
const markNotificationAsRead = async (req, res) => {
  const userID = req.payload._id;
  const notificationID = req.params.id;

  if (!mongoose.isValidObjectId(notificationID)) {
    res.status(400).json({
      message: "Invalid notification ID.",
    });
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationID,
      recipient: userID,
    },
    {
      $set: { isRead: true },
    },
    {
      returnDocument: "after",
    },
  );

  if (!notification) {
    res.status(404).json({
      message: "Notification not found.",
    });
    return;
  }

  res.status(200).json(notification);
};

// PATCH Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  const userID = req.payload._id;

  await Notification.updateMany(
    {
      recipient: userID,
      isRead: false,
    },
    {
      $set: { isRead: true },
    },
  );

  res.status(200).json({
    message: "All notifications marked as read.",
  });
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
