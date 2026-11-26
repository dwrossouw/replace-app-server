const Claim = require("../models/Claim.model");
const User = require("../models/User.model");
const Listing = require("../models/Listing.model");
const mongoose = require("mongoose");

//POST Create a new claim
const createClaim = async (req, res) => {
  const requesterID = req.payload._id;
  const { id } = req.params;
  const { message, collectionAcknowledged } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid listing ID" });
    return;
  }

  if (collectionAcknowledged !== true) {
    res
      .status(400)
      .json({ message: "You must acknowledge the collection requirements." });
    return;
  }

  if (
    message !== undefined &&
    (typeof message !== "string" || message.length > 500)
  ) {
    res.status(400).json({ message: "Invalid claim message." });
    return;
  }

  const requester = await User.findById(requesterID);

  if (!requester) {
    res.status(401).json({ message: "Requester no longer exists." });
    return;
  }

  const listing = await Listing.findById(id);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  if (requester._id.equals(listing.giver)) {
    res.status(403).json({ message: "You cannot claim your own listing." });
    return;
  }

  const now = new Date();

  if (
    listing.status !== "available" ||
    listing.requestsOpen !== true ||
    listing.requestDeadline <= now ||
    listing.collectionDeadline <= now
  ) {
    res.status(409).json({
      message: "This listing is no longer accepting requests.",
    });
    return;
  }

  const existingClaim = await Claim.findOne({
    listing: id,
    requester: requesterID,
  });

  if (existingClaim) {
    res.status(409).json({
      message: "You already have a claim for this listing.",
    });
    return;
  }

  const newClaim = await Claim.create({
    listing: id,
    requester: requesterID,
    message: message,
  });

  res
    .status(201)
    .json({ message: "Claim created successfully.", claimId: newClaim._id });
};

// GET View all claims for particular item
const getListingClaims = async (req, res) => {
  const listingID = req.params.id;
  const giverID = req.payload._id;

  if (!mongoose.isValidObjectId(listingID)) {
    res.status(400).json({ message: "Invalid listing ID" });
    return;
  }

  const listingDetails = await Listing.findById(listingID);

  if (!listingDetails) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  if (!listingDetails.giver.equals(giverID)) {
    res.status(403).json({ message: "Listing does not belong to user." });
    return;
  }

  const claims = await Claim.find({ listing: listingID })
    .select("+message")
    .populate("requester", "displayName neighbourhood")
    .sort({ createdAt: -1 });

  res.status(200).json(claims);
};

// PATCH Withdraw a claim

const withdrawClaim = async (req, res) => {
  const claimID = req.params.id;
  const requesterID = req.payload._id;

  // Validate the claim ID
  if (!mongoose.isValidObjectId(claimID)) {
    res.status(400).json({ message: "Invalid claim ID." });
    return;
  }

  // Retrieve the claim
  const claim = await Claim.findById(claimID);

  if (!claim) {
    res.status(404).json({ message: "Claim not found." });
    return;
  }

  // Verify claim ownership
  if (!claim.requester.equals(requesterID)) {
    res.status(403).json({
      message: "You cannot withdraw another user's claim.",
    });
    return;
  }

  // Only pending claims can be withdrawn
  if (claim.status !== "pending") {
    res.status(409).json({
      message: "Only pending claims can be withdrawn.",
    });
    return;
  }

  // Update and save the claim
  claim.status = "withdrawn";

  await claim.save();

  res.status(200).json({
    message: "Claim withdrawn successfully.",
  });
};

// PATCH Reactivate a withdrawn claim
const reactivateClaim = async (req, res) => {
  const claimID = req.params.id;
  const requesterID = req.payload._id;
  const { collectionAcknowledged } = req.body ?? {};

  // Validate the claim ID
  if (!mongoose.isValidObjectId(claimID)) {
    res.status(400).json({ message: "Invalid claim ID." });
    return;
  }

  // Retrieve the claim
  const claim = await Claim.findById(claimID);

  if (!claim) {
    res.status(404).json({ message: "Claim not found." });
    return;
  }

  // Verify claim ownership
  if (!claim.requester.equals(requesterID)) {
    res.status(403).json({
      message: "You cannot reactivate another user's claim.",
    });
    return;
  }

  // Only withdrawn claims can be reactivated
  if (claim.status !== "withdrawn") {
    res.status(409).json({
      message: "Only withdrawn claims can be reactivated.",
    });
    return;
  }

  // Retrieve the associated listing
  const listing = await Listing.findById(claim.listing);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Verify that the listing is still accepting requests
  const now = new Date();

  if (
    listing.status !== "available" ||
    listing.requestsOpen !== true ||
    listing.requestDeadline <= now ||
    listing.collectionDeadline <= now
  ) {
    res.status(409).json({
      message: "This listing is no longer accepting requests.",
    });
    return;
  }

  // Validate collection acknowledgement
  if (collectionAcknowledged !== true) {
    res.status(400).json({
      message: "You must acknowledge the collection requirements.",
    });
    return;
  }

  // Reactivate the existing claim
  claim.status = "pending";
  claim.confirmationDeadline = null;

  await claim.save();

  res.status(200).json({
    message: "Claim reactivated successfully.",
  });
};

module.exports = { createClaim, getListingClaims, withdrawClaim, reactivateClaim };
