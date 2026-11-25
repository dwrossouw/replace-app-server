const User = require("../models/User.model");

const updateLocation = async (req, res) => {
  const userID = req.payload._id;
  const { neighbourhood, location } = req.body;

  if (typeof neighbourhood !== "string" || !neighbourhood.trim()) {
    res.status(400).json({ message: "Invalid input." });
    return;
  }

  if (
    !location ||
    location.type !== "Point" ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2 ||
    !Number.isFinite(location.coordinates[0]) ||
    !Number.isFinite(location.coordinates[1]) ||
    location.coordinates[0] > 180 ||
    location.coordinates[0] < -180 ||
    location.coordinates[1] > 90 ||
    location.coordinates[1] < -90
  ) {
    res.status(400).json({ message: "Invalid location coordinates." });
    return;
  }

  const updateInfo = {
    $set: {
      neighbourhood: neighbourhood,
      location: location,
    },
  };

  const updatedUser = await User.findByIdAndUpdate(userID, updateInfo, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!updatedUser) {
    res.status(401).json({ message: "User doesn't exist." });
  } else {
    res.status(200).json({ message: "Location updated successfully." });
  }
};

module.exports = {updateLocation};
