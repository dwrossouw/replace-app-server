const {Schema} = require("mongoose");

const locationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return (
            value.length === 2 &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1]) &&
            value[0] <= 180 &&
            value[0] >= -180 &&
            value[1] <= 90 &&
            value[1] >= -90
          );
        },
        message: "Invalid coordinates.",
      },
    },
  },
  {
    _id: false,
  },
);

module.exports = locationSchema;
