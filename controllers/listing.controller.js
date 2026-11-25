const Listing = require("../models/Listing.model");
const User = require("../models/User.model");
const mongoose = require("mongoose");

// POST Create a new listing
const createListing = async (req, res) => {
  const userID = req.payload._id;
  const {
    title,
    description,
    category,
    quantity,
    imageUrl,
    imagePublicId,
    neighbourhood,
    collectionLocation,
    requestDeadline,
    collectionDeadline,
    collectionInstructions,
  } = req.body;

  const giver = await User.findById(userID).select("+location");

  if (!giver) {
    res.status(401).json({ message: "User not found with that id." });
    return;
  }

  if (!giver.location) {
    res.status(403).json({ message: "User does not have a location." });
    return;
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof category !== "string" ||
    !category.trim() ||
    (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) ||
    typeof imageUrl !== "string" ||
    !imageUrl.trim() ||
    typeof imagePublicId !== "string" ||
    !imagePublicId.trim() ||
    typeof neighbourhood !== "string" ||
    !neighbourhood.trim() ||
    (collectionInstructions !== undefined &&
      typeof collectionInstructions !== "string")
  ) {
    res.status(400).json({ message: "Invalid listing information." });
    return;
  }

  if (
    !collectionLocation ||
    collectionLocation.type !== "Point" ||
    !Array.isArray(collectionLocation.coordinates) ||
    collectionLocation.coordinates.length !== 2 ||
    !Number.isFinite(collectionLocation.coordinates[0]) ||
    !Number.isFinite(collectionLocation.coordinates[1]) ||
    collectionLocation.coordinates[0] > 180 ||
    collectionLocation.coordinates[0] < -180 ||
    collectionLocation.coordinates[1] > 90 ||
    collectionLocation.coordinates[1] < -90
  ) {
    res.status(400).json({ message: "Invalid location coordinates." });
    return;
  }

  const requestDate = new Date(requestDeadline);
  const collectionDate = new Date(collectionDeadline);
  const now = new Date();

  if (
    typeof requestDeadline !== "string" ||
    typeof collectionDeadline !== "string" ||
    Number.isNaN(requestDate.getTime()) ||
    Number.isNaN(collectionDate.getTime()) ||
    requestDate <= now ||
    collectionDate <= requestDate
  ) {
    res
      .status(400)
      .json({ message: "Invalid request or collection deadline." });
    return;
  }

  const newListing = await Listing.create({
    giver: userID,
    title: title,
    description: description,
    category: category,
    quantity: quantity,
    imageUrl: imageUrl,
    imagePublicId: imagePublicId,
    neighbourhood: neighbourhood,
    collectionLocation: collectionLocation,
    collectionInstructions: collectionInstructions,
    requestDeadline: requestDate,
    collectionDeadline: collectionDate,
  });

  res.status(201).json({
    message: "Listing created successfully.",
    listingId: newListing._id,
  });
};

// GET Retrieve and filter available listings
const getListings = async (req, res) => {
  const { category } = req.query;
  const filter = {
    status: "available",
    requestsOpen: true,
    requestDeadline: { $gt: new Date() },
  };
  if (category) {
    filter.category = category;
  }

  const listings = await Listing.find(filter).populate(
    "giver",
    "displayName neighbourhood",
  );

  res.status(200).json(listings);
};

// // GET Retrieve individual listing details
// router.get("/:id", async (req, res) => {});
const getListingDetails = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid listing ID" });
    return;
  }
  const listingDetails = await Listing.findById(id).populate(
    "giver",
    "displayName neighbourhood",
  );

  if(!listingDetails){
    res.status(404).json({message: "Listing not found."})
  }
  res.status(200).json(listingDetails);
};

// // PATCH Update listing information
// router.patch("/:id", verifyToken, async (req, res) => {});

// // DELETE Cancel a listing
// router.delete("/:id", verifyToken, async (req, res) => {});

module.exports = { createListing, getListings, getListingDetails };
