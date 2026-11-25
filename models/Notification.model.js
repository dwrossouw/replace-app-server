const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "new_claim",
        "claim_withdrawn",
        "claim_selected",
        "claim_confirmed",
        "claim_declined",
        "claim_expired",
        "claim_cancelled",
        "collection_updated",
        "listing_cancelled",
        "listing_expired",
        "claim_not_selected",
        "gift_completed",
      ],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = model("Notification", notificationSchema);

module.exports = Notification;
