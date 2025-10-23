const { supabaseAdmin } = require('../supabase');
const fs = require('fs');
const path = require('path');

class StorageService {
  constructor() {
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'ThoughtLane_Media';
  }

  /**
   * Upload a file to Supabase Storage
   * @param {Object} file - Multer file object
   * @returns {Promise<string>} - Public URL of uploaded file
   */
  async uploadFile(file) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.path);
      
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to Supabase Storage using admin client (bypasses RLS)
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Delete local file after successful upload
      fs.unlinkSync(file.path);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      // Clean up local file on error
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param {string} fileUrl - Public URL of the file
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileUrl) {
    try {
      if (!fileUrl) return false;

      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split(`/storage/v1/object/public/${this.bucketName}/`);
      
      if (pathParts.length < 2) {
        throw new Error('Invalid file URL');
      }

      const filePath = pathParts[1];

      // Delete using admin client (bypasses RLS)
      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} filePath - Path to file in storage
   * @returns {string} - Public URL
   */
  getPublicUrl(filePath) {
    const { data } = supabaseAdmin.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

module.exports = new StorageService();
