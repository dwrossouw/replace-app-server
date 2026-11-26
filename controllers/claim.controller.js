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

module.exports = {createClaim};