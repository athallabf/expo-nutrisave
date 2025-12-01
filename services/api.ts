import { FoodItem, UploadResponse } from "@/types";
import { Platform } from "react-native";

const getAPIBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000";
};

const API_BASE_URL = getAPIBaseURL();

const IS_MOCK_MODE = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadFoodImageReal = async (
  imageUri: string
): Promise<UploadResponse> => {
  const formData = new FormData();

  formData.append("image", {
    uri: imageUri,
    name: `photo_${Date.now()}.jpg`,
    type: "image/jpeg",
  } as any);

  try {
    console.log(`Sending image to Flask: ${API_BASE_URL}/classify`);

    const response = await fetch(`${API_BASE_URL}/classify`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return {
        success: false,
        message: `Server error: ${response.status}. ${errorText}`,
      };
    }

    const result = await response.json();
    console.log("Response from Flask + Gemini:", result);

    if (!result.label || !result.expiryDate) {
      return {
        success: false,
        message: "Backend tidak mengembalikan label atau tanggal expiry.",
      };
    }

    const newItem: FoodItem = {
      id: String(Date.now()),
      name: result.label,
      expiryDate: result.expiryDate,
      addedAt: new Date().toISOString(),
    };

    mockInventoryData.push(newItem);

    return {
      success: true,
      label: result.label,
      item: newItem,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      message: `Gagal terhubung ke server. Pastikan Flask menyala di port 5000. Error: ${error}`,
    };
  }
};

const getInventoryReal = async (): Promise<FoodItem[]> => {
  console.log("API: Mengambil data inventaris lokal...");
  await delay(500);
  return [...mockInventoryData];
};

const mockInventoryData: FoodItem[] = [
  {
    id: "1",
    name: "Contoh Susu",
    expiryDate: "2025-12-25",
    addedAt: new Date().toISOString(),
  },
];

const getInventoryMock = async (): Promise<FoodItem[]> => {
  await delay(1000);
  return [...mockInventoryData];
};

const uploadFoodImageMock = async (
  imageUri: string
): Promise<UploadResponse> => {
  await delay(2000);
  const newItem: FoodItem = {
    id: String(Date.now()),
    name: "Mock Apple",
    expiryDate: "2025-12-30",
    addedAt: new Date().toISOString(),
  };
  mockInventoryData.push(newItem);
  return { success: true, label: "Mock Apple", item: newItem };
};

export const getInventory = IS_MOCK_MODE ? getInventoryMock : getInventoryReal;
export const uploadFoodImage = IS_MOCK_MODE
  ? uploadFoodImageMock
  : uploadFoodImageReal;
