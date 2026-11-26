const Listing = require("../models/Listing.model");
const User = require("../models/User.model");
const Claim = require("../models/Claim.model");
const mongoose = require("mongoose");
const { uploadImage, deleteImage } = require("../utils/cloudinary.utils");

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

  const uploadResult = await uploadImage(req.file.buffer);

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
  console.log("query object: ", req.query);
  const { category, lng, lat, radiusKm = 2 } = req.query;

  if (
    typeof lng !== "string" ||
    !lng.trim() ||
    typeof lat !== "string" ||
    !lat.trim()
  ) {
    res.status(400).json({ message: "Invalid coordinates." });
    return;
  }

  const longitude = Number(lng);
  const latitude = Number(lat);
  const radius = Number(radiusKm);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude > 180 ||
    longitude < -180 ||
    latitude > 90 ||
    latitude < -90
  ) {
    res.status(400).json({ message: "Invalid coordinates." });
    return;
  }

  const allowedRadii = [1, 2, 3, 5];

  if (
    (typeof radiusKm !== "string" && radiusKm !== 2) ||
    !allowedRadii.includes(radius)
  ) {
    res.status(400).json({
      message: "Invalid radius. Allowed distances are 1, 2, 3 and 5 km.",
    });
    return;
  }

  const filter = {
    status: "available",
    requestsOpen: true,
    requestDeadline: { $gt: new Date() },
    collectionLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: radius * 1000,
      },
    },
  };

  const allowedCategories = Listing.schema.path("category").enumValues;

  if (category !== undefined) {
    if (typeof category !== "string" || !allowedCategories.includes(category)) {
      res.status(400).json({ message: "Invalid category." });
      return;
    }

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

// PATCH Update listing information
const updateListing = async (req, res) => {
  const userID = req.payload._id;
  const listingID = req.params.id;

  // Validate listing ID
  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({ message: "Invalid listing ID." });
    return;
  }

  // Retrieve listing, including the private image public ID
  const listingDetails =
    await Listing.findById(listingID).select("+imagePublicId");

  if (!listingDetails) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Verify ownership
  if (!listingDetails.giver.equals(userID)) {
    res.status(403).json({ message: "Listing does not belong to user." });
    return;
  }

  // Verify listing status
  if (listingDetails.status !== "available") {
    res.status(409).json({ message: "Listing status has changed." });
    return;
  }

  // Support both multipart form-data and raw JSON
  let listingData;

  if (req.is("multipart/form-data")) {
    try {
      listingData =
        req.body.listing !== undefined ? JSON.parse(req.body.listing) : {};
    } catch (error) {
      res.status(400).json({ message: "Invalid listing data." });
      return;
    }
  } else {
    listingData = req.body ?? {};
  }

  // Validate the listing data object
  if (
    !listingData ||
    typeof listingData !== "object" ||
    Array.isArray(listingData)
  ) {
    res.status(400).json({ message: "Invalid listing data." });
    return;
  }

  // Define fields the user is allowed to update
  const allowedFields = [
    "title",
    "description",
    "category",
    "quantity",
    "neighbourhood",
    "collectionLocation",
    "requestDeadline",
    "collectionDeadline",
  ];

  const updatedDetails = {};

  for (const field of allowedFields) {
    if (listingData[field] !== undefined) {
      updatedDetails[field] = listingData[field];
    }
  }

  // Allow image-only updates
  if (Object.keys(updatedDetails).length === 0 && !req.file) {
    res.status(400).json({ message: "No fields to update." });
    return;
  }

  // Remember the original image public ID
  const oldImagePublicId = listingDetails.imagePublicId;

  // Apply listing changes
  listingDetails.set(updatedDetails);

  // Validate updated deadlines
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

  // Validate the document before uploading a new image
  await listingDetails.validate();

  let newImagePublicId = null;

  try {
    // Upload a new image only if one was provided
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer);

      newImagePublicId = uploadResult.public_id;

      listingDetails.set({
        imageUrl: uploadResult.secure_url,
        imagePublicId: uploadResult.public_id,
      });
    }

    // Save the updated listing
    await listingDetails.save();
  } catch (error) {
    // Remove the newly uploaded image if saving fails
    if (newImagePublicId) {
      try {
        await deleteImage(newImagePublicId);
      } catch (cleanupError) {
        console.error("New image cleanup failed:", cleanupError);
      }
    }

    throw error;
  }

  // Delete the old image only after a successful database save
  if (
    newImagePublicId &&
    oldImagePublicId &&
    oldImagePublicId !== newImagePublicId
  ) {
    try {
      await deleteImage(oldImagePublicId);
    } catch (cleanupError) {
      console.error("Old image cleanup failed:", cleanupError);
    }
  }

  res.status(200).json({
    message: "Listing updated successfully.",
  });
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

  listingDetails.set({ status: "cancelled", requestsOpen: false });
  await listingDetails.save();
  res.status(200).json({ message: "Listing cancelled successfully." });
};

module.exports = {
  createListing,
  getListings,
  getListingDetails,
  updateListing,
  deleteListing,
};
