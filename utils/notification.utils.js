const Notification = require("../models/Notification.model");

// Create a notification for a user
const createNotification = async (recipient, listing, type, message) => {
  try {
    await Notification.create({
      recipient,
      listing,
      type,
      message,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

module.exports = { createNotification };