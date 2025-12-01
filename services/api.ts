import { FoodItem, UploadResponse } from "@/types";
import { uploadAsync } from "expo-file-system";
import { Platform } from "react-native";
import { FileSystemUploadType } from "./../node_modules/expo-file-system/src/legacy/FileSystem.types";

const getAPIBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") return "http://localhost:5000";
  return Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000";
};

const API_BASE_URL = getAPIBaseURL();

const IS_MOCK_MODE = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadViaWeb = async (imageUri: string): Promise<UploadResponse> => {
  try {
    const imgResponse = await fetch(imageUri);
    const blob = await imgResponse.blob();

    const formData = new FormData();
    formData.append("image", blob, "upload.jpg");

    const response = await fetch(`${API_BASE_URL}/classify`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

const uploadFoodImageReal = async (
  imageUri: string
): Promise<UploadResponse> => {
  try {
    let result: any;

    if (Platform.OS === "web") {
      console.log("Environment: WEB detected. Using fetch...");
      result = await uploadViaWeb(imageUri);
    }

    else {
      console.log("Environment: NATIVE detected. Using FileSystem...");
      const response = await uploadAsync(`${API_BASE_URL}/classify`, imageUri, {
        fieldName: "image",
        httpMethod: "POST",
        uploadType: FileSystemUploadType.MULTIPART,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status !== 200) {
        return { success: false, message: `Server error: ${response.status}` };
      }
      result = JSON.parse(response.body);
    }

    console.log("Backend Result:", result);

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
      message: `Gagal terhubung ke server (${API_BASE_URL}). Error: ${error}`,
    };
  }
};

const getInventoryReal = async (): Promise<FoodItem[]> => {
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
