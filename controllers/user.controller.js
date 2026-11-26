const User = require("../models/User.model");
const Listing = require("../models/Listing.model");
const Claim = require("../models/Claim.model");

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

// GET All listings belonging to the authenticated user
const getMyListings = async (req, res) => {
  const userID = req.payload._id;

  // Retrieve all listings created by the authenticated user
  const listings = await Listing.find({
    giver: userID,
  })
    .select(
      "_id title imageUrl category quantity neighbourhood status requestsOpen selectedClaim requestDeadline collectionDeadline createdAt",
    )
    .sort({ createdAt: -1 });

  res.status(200).json(listings);
};

// GET All claims belonging to the authenticated user
const getMyClaims = async (req, res) => {
  const userID = req.payload._id;

  // Retrieve all claims made by the authenticated user
  const claims = await Claim.find({
    requester: userID,
  })
    .select("_id listing status confirmationDeadline createdAt updatedAt")
    .populate(
      "listing",
      "_id title imageUrl category quantity neighbourhood status requestsOpen requestDeadline collectionDeadline",
    )
    .sort({ createdAt: -1 });

  res.status(200).json(claims);
};

module.exports = { updateLocation, getMyListings, getMyClaims };
