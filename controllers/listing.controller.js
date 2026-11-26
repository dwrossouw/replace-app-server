const Listing = require("../models/Listing.model");
const User = require("../models/User.model");
const Claim = require("../models/Claim.model")
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

// PATCH Reopen a listing for new requests
const reopenListing = async (req, res) => {
  const listingID = req.params.id;
  const giverID = req.payload._id;

  // Validate the listing ID
  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({
      message: "Invalid listing ID.",
    });
    return;
  }

  // Retrieve the listing
  const listing = await Listing.findById(listingID);

  if (!listing) {
    res.status(404).json({
      message: "Listing not found.",
    });
    return;
  }

  // Verify listing ownership
  if (!listing.giver.equals(giverID)) {
    res.status(403).json({
      message: "Only the listing owner can reopen this listing.",
    });
    return;
  }

  const now = new Date();

  // Validate listing eligibility
  if (
    listing.status !== "available" ||
    listing.selectedClaim !== null ||
    listing.requestsOpen !== false ||
    listing.requestDeadline <= now ||
    listing.collectionDeadline <= now
  ) {
    res.status(409).json({
      message: "This listing is not eligible for reopening.",
    });
    return;
  }

  const updateTime = new Date();

  // Conditionally reopen the listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listingID,
      giver: giverID,
      status: "available",
      selectedClaim: null,
      requestsOpen: false,
      requestDeadline: { $gt: updateTime },
      collectionDeadline: { $gt: updateTime },
    },
    {
      $set: {
        requestsOpen: true,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Check whether the update succeeded
  if (!updatedListing) {
    res.status(409).json({
      message: "This listing could not be reopened.",
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Listing reopened successfully.",
    listingId: updatedListing._id,
  });
};

// GET Private collection details
const getCollectionDetails = async (req, res) => {
  const listingID = req.params.id;
  const userID = req.payload._id;

  // Prevent caching of private collection information
  res.set("Cache-Control", "no-store");

  // Validate the listing ID
  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({
      message: "Invalid listing ID.",
    });
    return;
  }

  // Retrieve the listing, including private collection fields
  const listing = await Listing.findById(listingID).select(
    "+collectionLocation +collectionInstructions"
  );

  if (!listing) {
    res.status(404).json({
      message: "Listing not found.",
    });
    return;
  }

  // Check whether the authenticated user is the giver
  const isGiver = listing.giver.equals(userID);

  // If the user is not the giver, verify recipient eligibility
  if (!isGiver) {
    const now = new Date();

    // Validate listing state
    if (
      listing.status !== "reserved" ||
      !listing.selectedClaim ||
      listing.collectionDeadline <= now
    ) {
      res.status(403).json({
        message: "You do not have access to collection details.",
      });
      return;
    }

    // Verify that the user is the confirmed recipient
    const confirmedClaim = await Claim.findOne({
      _id: listing.selectedClaim,
      listing: listing._id,
      requester: userID,
      status: "confirmed",
    });

    if (!confirmedClaim) {
      res.status(403).json({
        message: "You do not have access to collection details.",
      });
      return;
    }
  }

  // Return only the necessary collection information
  res.status(200).json({
    listingId: listing._id,
    neighbourhood: listing.neighbourhood,
    collectionLocation: listing.collectionLocation,
    collectionInstructions: listing.collectionInstructions,
    collectionDeadline: listing.collectionDeadline,
  });
};

// PATCH Mark a gift as successfully collected
const completeListing = async (req, res) => {
  const listingID = req.params.id;
  const giverID = req.payload._id;

  // Validate the listing ID
  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({
      message: "Invalid listing ID.",
    });
    return;
  }

  // Retrieve the listing
  const listing = await Listing.findById(listingID);

  if (!listing) {
    res.status(404).json({
      message: "Listing not found.",
    });
    return;
  }

  // Verify listing ownership
  if (!listing.giver.equals(giverID)) {
    res.status(403).json({
      message: "Only the listing owner can complete this gift.",
    });
    return;
  }

  // Validate listing state
  if (
    listing.status !== "reserved" ||
    !listing.selectedClaim ||
    listing.requestsOpen !== false
  ) {
    res.status(409).json({
      message: "This listing is not eligible for completion.",
    });
    return;
  }

  // Retrieve and validate the confirmed claim
  const selectedClaim = await Claim.findOne({
    _id: listing.selectedClaim,
    listing: listing._id,
    status: "confirmed",
  });

  if (!selectedClaim) {
    res.status(409).json({
      message: "No confirmed claim was found for this listing.",
    });
    return;
  }

  // Conditionally complete the listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      giver: giverID,
      status: "reserved",
      selectedClaim: selectedClaim._id,
      requestsOpen: false,
    },
    {
      $set: {
        status: "completed",
        requestsOpen: false,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedListing) {
    res.status(409).json({
      message: "This listing could not be completed.",
    });
    return;
  }

  // Conditionally complete the recipient's claim
  const updatedClaim = await Claim.findOneAndUpdate(
    {
      _id: selectedClaim._id,
      listing: listing._id,
      status: "confirmed",
    },
    {
      $set: {
        status: "completed",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Attempt compensation if the claim update fails
  if (!updatedClaim) {
    const currentClaim = await Claim.findById(selectedClaim._id);

    if (currentClaim && currentClaim.status === "confirmed") {
      const rollback = await Listing.updateOne(
        {
          _id: listing._id,
          status: "completed",
          selectedClaim: selectedClaim._id,
          requestsOpen: false,
        },
        {
          $set: {
            status: "reserved",
          },
        }
      );

      if (rollback.matchedCount > 0) {
        res.status(409).json({
          message: "The recipient's claim could not be completed.",
        });
        return;
      }
    }

    res.status(500).json({
      message: "Gift completion requires reconciliation.",
    });
    return;
  }

  // Close all remaining pending claims
  let closedClaims;

  try {
    closedClaims = await Claim.updateMany(
      {
        listing: listing._id,
        _id: { $ne: selectedClaim._id },
        status: "pending",
      },
      {
        $set: {
          status: "not_selected",
        },
      },
      {
        runValidators: true,
      }
    );
  } catch (error) {
    console.error("Failed to close remaining claims:", error);

    // The gift has already been completed.
    // Do not reverse the successful collection.
    res.status(200).json({
      message: "Gift completed successfully.",
      listingId: updatedListing._id,
      claimId: updatedClaim._id,
      pendingClaimsCleanupRequired: true,
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Gift completed successfully.",
    listingId: updatedListing._id,
    claimId: updatedClaim._id,
    closedClaims: closedClaims.modifiedCount,
    pendingClaimsCleanupRequired: false,
  });
};

module.exports = {
  createListing,
  getListings,
  getListingDetails,
  updateListing,
  deleteListing,
  reopenListing,
  getCollectionDetails,
  completeListing
};
