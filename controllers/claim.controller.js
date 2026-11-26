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

// PATCH Select a recipient
const selectClaim = async (req, res) => {
  const claimID = req.params.id;
  const giverID = req.payload._id;

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

  // Retrieve the associated listing
  const listing = await Listing.findById(claim.listing);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Verify listing ownership
  if (!listing.giver.equals(giverID)) {
    res.status(403).json({
      message: "Only the listing owner can select a recipient.",
    });
    return;
  }

  const now = new Date();

  // Validate eligibility for selection
  if (
    claim.status !== "pending" ||
    listing.status !== "available" ||
    listing.selectedClaim !== null ||
    listing.collectionDeadline <= now
  ) {
    res.status(409).json({
      message: "This claim cannot be selected.",
    });
    return;
  }

  // Calculate the confirmation deadline
  const confirmationDeadline = new Date(
    Math.min(
      now.getTime() + 3 * 60 * 60 * 1000,
      listing.collectionDeadline.getTime()
    )
  );

  // Conditionally update the listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      giver: giverID,
      status: "available",
      selectedClaim: null,
      collectionDeadline: { $gt: new Date() },
    },
    {
      $set: {
        requestsOpen: false,
        selectedClaim: claim._id,
      },
    },
    {
      returnDocument: "before",
      runValidators: true,
    }
  );

  // Check whether the listing update succeeded
  if (!updatedListing) {
    res.status(409).json({
      message: "This listing is no longer eligible for selection.",
    });
    return;
  }

  // Conditionally update the claim
  const updatedClaim = await Claim.findOneAndUpdate(
    {
      _id: claim._id,
      listing: listing._id,
      status: "pending",
    },
    {
      $set: {
        status: "selected",
        confirmationDeadline: confirmationDeadline,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Reverse the listing update if the claim no longer matches
  if (!updatedClaim) {
    const rollback = await Listing.updateOne(
      {
        _id: listing._id,
        status: "available",
        selectedClaim: claim._id,
        requestsOpen: false,
      },
      {
        $set: {
          selectedClaim: null,
          requestsOpen:
            updatedListing.requestsOpen &&
            updatedListing.requestDeadline > new Date() &&
            updatedListing.collectionDeadline > new Date(),
        },
      }
    );

    if (rollback.matchedCount === 0) {
      res.status(500).json({
        message: "Selection failed and requires reconciliation.",
      });
      return;
    }

    res.status(409).json({
      message: "This claim is no longer available for selection.",
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Recipient selected successfully.",
    claimId: updatedClaim._id,
    confirmationDeadline: updatedClaim.confirmationDeadline,
  });
};

// PATCH Confirm a selected claim
const confirmClaim = async (req, res) => {
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
      message: "You cannot confirm another user's claim.",
    });
    return;
  }

  const now = new Date();

  // Validate claim status and confirmation deadline
  if (
    claim.status !== "selected" ||
    !claim.confirmationDeadline ||
    claim.confirmationDeadline <= now
  ) {
    res.status(409).json({
      message: "This claim is no longer eligible for confirmation.",
    });
    return;
  }

  // Retrieve the associated listing
  const listing = await Listing.findById(claim.listing);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Validate listing eligibility
  if (
    listing.status !== "available" ||
    !listing.selectedClaim ||
    !listing.selectedClaim.equals(claim._id) ||
    listing.requestsOpen !== false ||
    listing.collectionDeadline <= now
  ) {
    res.status(409).json({
      message: "This listing is no longer eligible for confirmation.",
    });
    return;
  }

  // Conditionally reserve the listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      status: "available",
      selectedClaim: claim._id,
      requestsOpen: false,
      collectionDeadline: { $gt: new Date() },
    },
    {
      $set: {
        status: "reserved",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedListing) {
    res.status(409).json({
      message: "This listing could not be reserved.",
    });
    return;
  }

  // Conditionally confirm the claim
  const updatedClaim = await Claim.findOneAndUpdate(
    {
      _id: claim._id,
      requester: requesterID,
      listing: listing._id,
      status: "selected",
      confirmationDeadline: { $gt: new Date() },
    },
    {
      $set: {
        status: "confirmed",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Reverse the listing update if confirmation fails
  if (!updatedClaim) {
    const rollback = await Listing.updateOne(
      {
        _id: listing._id,
        status: "reserved",
        selectedClaim: claim._id,
        requestsOpen: false,
      },
      {
        $set: {
          status: "available",
        },
      }
    );

    if (rollback.matchedCount === 0) {
      res.status(500).json({
        message: "Confirmation failed and requires reconciliation.",
      });
      return;
    }

    res.status(409).json({
      message: "This claim could not be confirmed.",
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Claim confirmed successfully.",
    claimId: updatedClaim._id,
    listingId: updatedListing._id,
  });
};

// PATCH Decline a selected claim
const declineClaim = async (req, res) => {
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
      message: "You cannot decline another user's claim.",
    });
    return;
  }

  // Validate claim status
  if (claim.status !== "selected") {
    res.status(409).json({
      message: "Only selected claims can be declined.",
    });
    return;
  }

  // Retrieve the associated listing
  const listing = await Listing.findById(claim.listing);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Validate listing state
  if (
    listing.status !== "available" ||
    !listing.selectedClaim ||
    !listing.selectedClaim.equals(claim._id) ||
    listing.requestsOpen !== false
  ) {
    res.status(409).json({
      message: "This listing is no longer eligible for declining.",
    });
    return;
  }

  // Conditionally decline the claim
  const updatedClaim = await Claim.findOneAndUpdate(
    {
      _id: claim._id,
      requester: requesterID,
      listing: listing._id,
      status: "selected",
    },
    {
      $set: {
        status: "declined",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedClaim) {
    res.status(409).json({
      message: "This claim could not be declined.",
    });
    return;
  }

  // Release the selected claim from the listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      status: "available",
      selectedClaim: claim._id,
      requestsOpen: false,
    },
    {
      $set: {
        selectedClaim: null,
        requestsOpen: false,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Handle an unsuccessful listing update
  if (!updatedListing) {
    // Check the current listing state before attempting rollback
    const currentListing = await Listing.findById(listing._id);

    if (
      currentListing &&
      currentListing.status === "available" &&
      currentListing.selectedClaim?.equals(claim._id) &&
      currentListing.requestsOpen === false
    ) {
      const rollback = await Claim.updateOne(
        {
          _id: claim._id,
          status: "declined",
        },
        {
          $set: {
            status: "selected",
          },
        }
      );

      if (rollback.matchedCount > 0) {
        res.status(409).json({
          message: "This listing could not be released.",
        });
        return;
      }
    }

    res.status(500).json({
      message: "Declining the claim requires reconciliation.",
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Claim declined successfully.",
    claimId: updatedClaim._id,
    listingId: updatedListing._id,
  });
};

// PATCH Cancel a confirmed claim
const cancelClaim = async (req, res) => {
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
      message: "You cannot cancel another user's claim.",
    });
    return;
  }

  // Validate claim status
  if (claim.status !== "confirmed") {
    res.status(409).json({
      message: "Only confirmed claims can be cancelled.",
    });
    return;
  }

  // Retrieve the associated listing
  const listing = await Listing.findById(claim.listing);

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  // Validate listing state
  if (
    listing.status !== "reserved" ||
    !listing.selectedClaim ||
    !listing.selectedClaim.equals(claim._id) ||
    listing.requestsOpen !== false
  ) {
    res.status(409).json({
      message: "This listing is no longer eligible for cancellation.",
    });
    return;
  }

  // Conditionally cancel the claim
  const updatedClaim = await Claim.findOneAndUpdate(
    {
      _id: claim._id,
      requester: requesterID,
      listing: listing._id,
      status: "confirmed",
    },
    {
      $set: {
        status: "cancelled",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedClaim) {
    res.status(409).json({
      message: "This claim could not be cancelled.",
    });
    return;
  }

  // Release the reserved listing
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      status: "reserved",
      selectedClaim: claim._id,
      requestsOpen: false,
    },
    {
      $set: {
        status: "available",
        selectedClaim: null,
        requestsOpen: false,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  // Handle an unsuccessful listing update
  if (!updatedListing) {
    const currentListing = await Listing.findById(listing._id);

    // Attempt rollback only if the listing is still reserved
    // for the same claim
    if (
      currentListing &&
      currentListing.status === "reserved" &&
      currentListing.selectedClaim?.equals(claim._id) &&
      currentListing.requestsOpen === false
    ) {
      const rollback = await Claim.updateOne(
        {
          _id: claim._id,
          status: "cancelled",
        },
        {
          $set: {
            status: "confirmed",
          },
        }
      );

      if (rollback.matchedCount > 0) {
        res.status(409).json({
          message: "This listing could not be released.",
        });
        return;
      }
    }

    res.status(500).json({
      message: "Cancelling the claim requires reconciliation.",
    });
    return;
  }

  // Return successful response
  res.status(200).json({
    message: "Claim cancelled successfully.",
    claimId: updatedClaim._id,
    listingId: updatedListing._id,
  });
};


module.exports = {
  createClaim,
  getListingClaims,
  withdrawClaim,
  reactivateClaim,
  selectClaim,
  confirmClaim,
  declineClaim,
  cancelClaim
};
