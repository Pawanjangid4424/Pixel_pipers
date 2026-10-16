/**
 * Sends the selected image to the Flask backend for pipe counting.
 *
 * POST {VITE_SERVER_URL}/frontend   (multipart/form-data)
 *   uploadImage          – the image file
 *   confidence_threshold – 0.1 … 0.9
 *   key                  – 0 = draw dots, 1 = draw numbers
 *   color                – marker colour, e.g. "#05eb09"
 * Response: { count: "53", image_url: "<url or data:image/jpeg;base64,...>" }
 *
 * The result is stored by app/slices/fileSlice.ts.
 */
import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { showToast } from '@/lib/validators';

export const sendImageToServer = createAsyncThunk(
  'file/sendImage',
  async ({ previewImage, confidence_threshold, toggleState, color }: any, { rejectWithValue }) => {
    if (!previewImage) {
      showToast('No image selected', 'warning');
      return rejectWithValue('No image selected');
    }

    // Turn the data-URL back into a Blob and build the multipart form the backend expects
    const formData = new FormData();
    const blob = await fetch(previewImage).then(res => res.blob());
    formData.append('uploadImage', blob);
    formData.append('confidence_threshold', confidence_threshold);
    formData.append('key', toggleState); // 0 = dot, 1 = number
    formData.append('color', color);

    try {
      showToast('Request Send to Server', 'info');
      // Bearer token must match "token" in Backend/PIPE_model/credentials.json
      const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/frontend`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${import.meta.env.VITE_ML_TOKEN}`,
        },
      });

      if (response.status === 200) showToast('Object Counted Successful', 'success');
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error uploading image', 'error');
      return rejectWithValue(error);
    }
  }
);
