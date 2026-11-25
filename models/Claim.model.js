const { Schema, model } = require("mongoose");

const claimSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "Hi! I'm interested in this item. Thank you for sharing!",
      select: false,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "withdrawn",
        "selected",
        "confirmed",
        "declined",
        "expired",
        "cancelled",
        "not_selected",
        "completed",
      ],
      required: true,
      default: "pending",
    },
    confirmationDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

claimSchema.index({ listing: 1, requester: 1 }, { unique: true });

const Claim = model("Claim", claimSchema);

module.exports = Claim;