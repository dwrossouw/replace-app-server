const Listing = require("../models/Listing.model");
const User = require("../models/User.model");
const Claim = require("../models/Claim.model");
const mongoose = require("mongoose");
const { uploadImage } = require("../utils/cloudinary.utils");

// POST Create a new listing
const createListing = async (req, res) => {
  const userID = req.payload._id;

  if (!req.file) {
  res.status(400).json({ message: "A listing image is required." });
  return;
}

let listingData;

try {
  listingData = JSON.parse(req.body.listing);
} catch (error) {
  res.status(400).json({ message: "Invalid listing data." });
  return;
}

if (
  !listingData ||
  typeof listingData !== "object" ||
  Array.isArray(listingData)
) {
  res.status(400).json({ message: "Invalid listing data." });
  return;
}

  const {
    title,
    description,
    category,
    quantity,
    neighbourhood,
    collectionLocation,
    requestDeadline,
    collectionDeadline,
    collectionInstructions,
  } = listingData;

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

  const uploadResult = await uploadImage (req.file.buffer);

  const newListing = await Listing.create({
    giver: userID,
    title: title,
    description: description,
    category: category,
    quantity: quantity,
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
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

  if (!listingDetails) {
    res.status(404).json({ message: "Listing not found." });
  }
  res.status(200).json(listingDetails);
};

// // PATCH Update listing information
// router.patch("/:id", verifyToken, async (req, res) => {});
const updateListing = async (req, res) => {
  const userID = req.payload._id;
  const listingID = req.params.id;

  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({ message: "Invalid listing ID" });
    return;
  }

  const listingDetails = await Listing.findById(listingID);

  if (!listingDetails) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  if (!listingDetails.giver.equals(userID)) {
    res.status(403).json({ message: "Listing does not belong to user." });
    return;
  }

  if (listingDetails.status !== "available") {
    res.status(409).json({ message: "Listing status has changed." });
    return;
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "quantity",
    "imageUrl",
    "imagePublicId",
    "neighbourhood",
    "collectionLocation",
    "requestDeadline",
    "collectionDeadline",
  ];

  const updatedDetails = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updatedDetails[field] = req.body[field];
    }
  }

  if (Object.keys(updatedDetails).length === 0) {
    res.status(400).json({ message: "No fields to update." });
    return;
  }

  listingDetails.set(updatedDetails);

  if (
    updatedDetails.requestDeadline !== undefined ||
    updatedDetails.collectionDeadline !== undefined
  ) {
    if (listingDetails.requestDeadline <= new Date()) {
      res.status(400).json({
        message: "Request deadline must be in the future.",
      });
      return;
    }

    if (listingDetails.collectionDeadline <= listingDetails.requestDeadline) {
      res.status(400).json({
        message: "Collection deadline must be after the request deadline.",
      });
      return;
    }
  }

  await listingDetails.save();
  res.status(200).json({ message: "Listing updated successfully." });
};

// // DELETE Cancel a listing
// router.delete("/:id", verifyToken, async (req, res) => {});
const deleteListing = async (req, res) => {
  const userID = req.payload._id;
  const listingID = req.params.id;

  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({ message: "Invalid listing ID" });
    return;
  }

  const listingDetails = await Listing.findById(listingID);

  if (!listingDetails) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  if (!listingDetails.giver.equals(userID)) {
    res.status(403).json({ message: "Listing does not belong to user." });
    return;
  }

  if (listingDetails.status !== "available") {
    res.status(409).json({ message: "Listing status has changed." });
    return;
  }

  listingDetails.set({status: "cancelled", requestsOpen: false});
  await listingDetails.save();
  res.status(200).json({ message: "Listing cancelled successfully." });

};

module.exports = {
  createListing,
  getListings,
  getListingDetails,
  updateListing,
  deleteListing
};
