// Configuration for Cloudinary uploads
export const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djepnj5ll';
export const CLOUDINARY_UPLOAD_PRESET = 'expo-upload';

export const uploadToCloudinary = async (uri, folder) => {
  try {
    console.log('Starting Cloudinary upload:', { uri, folder });
    
    const formData = new FormData();
    const isVideo = uri.toLowerCase().endsWith('.mp4');
    const fileType = isVideo ? 'video/mp4' : 'audio/m4a';
    const fileName = isVideo ? 'video.mp4' : 'audio.m4a';
    
    console.log('Preparing file for upload:', { fileType, fileName });
    
    // Fixed: Proper file object structure for React Native FormData
    formData.append('file', {
      uri: uri,
      type: fileType,
      name: fileName,
    });
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const uploadType = isVideo ? 'video' : 'raw';
    const uploadUrl = `${CLOUDINARY_URL}/${uploadType}/upload`;
    console.log('Making upload request to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Cloudinary upload successful:', {
      publicId: data.public_id,
      url: data.secure_url
    });
    
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Alternative approach if the above still doesn't work
export const uploadToCloudinaryAlternative = async (uri, folder) => {
  try {
    console.log('Starting Cloudinary upload (alternative method):', { uri, folder });
    
    // Read file as base64
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isVideo = uri.toLowerCase().endsWith('.mp4');
    const mimeType = isVideo ? 'video/mp4' : 'audio/m4a';
    const dataUri = `data:${mimeType};base64,${base64}`;

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const uploadType = isVideo ? 'video' : 'raw';
    const uploadUrl = `${CLOUDINARY_URL}/${uploadType}/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Cloudinary upload successful:', {
      publicId: data.public_id,
      url: data.secure_url
    });
    
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};