// services/api.ts
import { FoodItem, UploadResponse } from "@/types";
import { Platform } from "react-native";

/**
 * PENTING: Untuk pengembangan, buat file `.env` di root proyek Anda dan tambahkan:
 * EXPO_PUBLIC_API_URL=http://<IP_ADDRESS_LOKAL_ANDA>:8000/api
 * Contoh: EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api
 */
// For Android emulator, use 10.0.2.2 to access localhost
// For iOS simulator or web, use localhost
const getAPIBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000";
};

const API_BASE_URL = getAPIBaseURL();

const IS_MOCK_MODE = false; // Menggunakan backend real

// --- HELPER FUNCTIONS ---
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- IMPLEMENTASI API SUNGGUHAN ---

const getInventoryReal = async (): Promise<FoodItem[]> => {
  // For now, return the mock data since we don't have a real database yet
  // In the future, this should fetch from a real API endpoint
  console.log("API: Mengambil data inventaris (using mock data for now)...");
  await delay(500); // Small delay to simulate network
  return [...mockInventoryData];
};

// Generate dummy expiry date based on food type
const generateDummyExpiryDate = (foodLabel: string): string => {
  const today = new Date();
  let daysToAdd = 7; // Default 7 days

  // Different expiry periods for different food types
  const foodExpiryMap: { [key: string]: number } = {
    // Fruits (shorter expiry)
    apple: 10,
    banana: 5,
    orange: 14,
    grape: 7,
    strawberry: 3,
    mango: 7,
    pineapple: 5,

    // Vegetables (medium expiry)
    tomato: 7,
    carrot: 21,
    potato: 30,
    onion: 30,
    lettuce: 7,
    broccoli: 5,
    spinach: 3,

    // Meat/Protein (shorter expiry)
    chicken: 2,
    beef: 3,
    fish: 2,
    egg: 21,

    // Dairy
    milk: 7,
    cheese: 14,
    yogurt: 10,

    // Others
    bread: 3,
    rice: 365
  };

  // Try to find expiry days based on food label
  const lowerLabel = foodLabel.toLowerCase();
  for (const [food, days] of Object.entries(foodExpiryMap)) {
    if (lowerLabel.includes(food)) {
      daysToAdd = days;
      break;
    }
  }

  // Add some randomness (±2 days)
  daysToAdd += Math.floor(Math.random() * 5) - 2;
  daysToAdd = Math.max(1, daysToAdd); // Minimum 1 day

  const expiryDate = new Date(
    today.getTime() + daysToAdd * 24 * 60 * 60 * 1000
  );
  return expiryDate.toISOString().split("T")[0];
};

const uploadFoodImageReal = async (
  imageUri: string
): Promise<UploadResponse> => {
  const formData = new FormData();

  // Create file object for React Native
  formData.append("image", {
    uri: imageUri,
    name: `photo_${Date.now()}.jpg`,
    type: "image/jpeg"
  } as any);

  try {
    console.log(
      `Sending image to backend for classification at ${API_BASE_URL}/classify...`
    );

    const response = await fetch(`${API_BASE_URL}/classify`, {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type manually, let the browser set it with boundary
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return {
        success: false,
        message: `Server error: ${response.status}. ${errorText}`
      };
    }

    const result = await response.json();
    console.log("Classification result:", result);

    if (!result.label) {
      return {
        success: false,
        message: "Backend tidak mengembalikan label makanan."
      };
    }

    // Create new food item with dummy expiry date
    const newItem: FoodItem = {
      id: String(Date.now()),
      name: result.label,
      expiryDate: generateDummyExpiryDate(result.label),
      addedAt: new Date().toISOString()
    };

    // Add to mock inventory for now (until we have real database)
    mockInventoryData.push(newItem);

    return {
      success: true,
      label: result.label,
      item: newItem
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      message: `Tidak dapat terhubung ke server: ${error}`
    };
  }
};

// --- IMPLEMENTASI MOCK (untuk pengembangan) ---

const mockInventoryData: FoodItem[] = [
  {
    id: "1",
    name: "Susu UHT",
    expiryDate: "2025-10-25",
    addedAt: "2025-10-15T00:00:00.000Z"
  },
  {
    id: "2",
    name: "Roti Tawar",
    expiryDate: "2025-10-20",
    addedAt: "2025-10-18T00:00:00.000Z"
  },
  {
    id: "3",
    name: "Telur Ayam",
    expiryDate: "2025-11-05",
    addedAt: "2025-10-15T00:00:00.000Z"
  },
  {
    id: "4",
    name: "Apel",
    expiryDate: "2025-10-22",
    addedAt: "2025-10-19T00:00:00.000Z"
  }
];

const getInventoryMock = async (): Promise<FoodItem[]> => {
  console.log("API: Mengambil data inventaris (mock)...");
  await delay(1000);
  return [...mockInventoryData];
};

const uploadFoodImageMock = async (
  imageUri: string
): Promise<UploadResponse> => {
  console.log(`API: Mengunggah gambar dari ${imageUri} (mock)...`);
  await delay(2000);

  if (Math.random() < 0.1) {
    console.log("API: Simulasi kegagalan identifikasi.");
    return { success: false, message: "Gagal mengidentifikasi gambar." };
  }

  const possibleLabels = ["Apel", "Pisang", "Tomat", "Wortel", "Ayam Fillet"];
  const randomLabel =
    possibleLabels[Math.floor(Math.random() * possibleLabels.length)];

  const newItem: FoodItem = {
    id: String(Date.now()),
    name: randomLabel,
    // Simulasi tanggal kedaluwarsa 7 hari dari sekarang
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    addedAt: new Date().toISOString()
  };

  // Menambahkan item baru ke data mock untuk simulasi
  mockInventoryData.push(newItem);

  console.log(`API: Berhasil! Teridentifikasi sebagai ${randomLabel}.`);
  return { success: true, label: randomLabel, item: newItem };
};

// --- EKSPOR FUNGSI ---
// Switch antara implementasi nyata dan mock berdasarkan flag
export const getInventory = IS_MOCK_MODE ? getInventoryMock : getInventoryReal;
export const uploadFoodImage = IS_MOCK_MODE
  ? uploadFoodImageMock
  : uploadFoodImageReal;
