const { Schema, model } = require("mongoose");
const locationSchema = require("./location.schema");

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, `Full name is required.`],
      select: false,
      trim: true,
    },
    displayName: {
      type: String,
      required: [true, `Display name is required.`],
      trim: true,
    },
    email: {
      type: String,
      required: [true, `Email is required.`],
      select: false,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, `Password is required.`],
      select: false,
    },
    neighbourhood: {
      type: String,
      trim: true,
    },
    location: {
      type: locationSchema,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

const User = model("User", userSchema);

module.exports = User;
