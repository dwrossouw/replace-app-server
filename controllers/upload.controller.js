const { uploadImage } = require("../utils/cloudinary.utils");

const uploadListingImage = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded." });
    return;
  }

  const result = await uploadImage(req.file.buffer);

  res.status(200).json({
    imageUrl: result.secure_url,
    imagePublicId: result.public_id,
  });
};

module.exports = {uploadListingImage};