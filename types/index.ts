// types.ts
export interface FoodItem {
  id: string;
  name: string;
  expiryDate: string; // YYYY-MM-DD
  condition: 'fresh' | 'ripe' | 'overripe' | 'rotten'; // Dari API
  tips?: string[];
  imageUri?: string;
  note?: string; // Manual Note
  createdAt: number;
}

export interface UploadSuccessResponse {
  success: boolean;
  message?: string;
  label?: string;
  expiryDate?: string;
  condition?: string; // Tambahan dari backend
  tips?: string[];
}

export interface FunFactResponse {
  date: string;
  funfact: string;
}

export interface UploadErrorResponse {
  success: false;
  message?: string;
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;
