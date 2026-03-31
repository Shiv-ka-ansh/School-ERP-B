const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (file, options = {}) => {
  try {
    if (!file) throw new Error('No file provided');

    // Default transformation for student photos
    const defaultTransform = [
      { width: 300, height: 300, crop: 'fill' },
      { quality: 'auto' }
    ];

    const result = await cloudinary.uploader.upload(file.path, {
      folder: options.folder || 'smps/general',
      public_id: options.public_id,
      transformation: options.transformation || defaultTransform
    });

    // Remove file from local server after upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return result.secure_url;
  } catch (error) {
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

exports.deleteImage = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  } catch (error) {
    throw error;
  }
};
