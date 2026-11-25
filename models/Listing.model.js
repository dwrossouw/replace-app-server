const { Schema, model } = require("mongoose");
const locationSchema = require("./location.schema");

const listingSchema = new Schema(
  {
    giver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      enum: [
        "Furniture",
        "Home & Kitchen",
        "Clothing & Accessories",
        "Electronics",
        "Books & Media",
        "Toys & Games",
        "Sports & Outdoors",
        "Garden & Plants",
        "Baby & Kids",
        "Other",
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      validate: {
        validator: function (value) {
          return Number.isInteger(value);
        },
        message: "Quantity must be a whole number.",
      },
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    neighbourhood: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    collectionLocation: {
      type: locationSchema,
      required: true,
      select: false,
    },
    collectionInstructions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      select: false,
    },
    requestDeadline: {
      type: Date,
      required: true,
    },
    collectionDeadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.requestDeadline;
        },
        message: "Collection deadline must be after the request deadline.",
      },
    },
    status: {
      type: String,
      enum: ["available", "reserved", "completed", "cancelled", "expired"],
      default: "available",
      required: true,
    },
    requestsOpen: {
      type: Boolean,
      required: true,
      default: true,
    },
    selectedClaim: {
      type: Schema.Types.ObjectId,
      ref: "Claim",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

listingSchema.index({collectionLocation: "2dsphere"});

const Listing = model("Listing", listingSchema);

module.exports = Listing;
