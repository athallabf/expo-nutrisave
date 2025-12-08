// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, UploadResponse, FunFactResponse, Recipe } from "@/types";
import { FileSystemUploadType } from "./../node_modules/expo-file-system/src/legacy/FileSystem.types";
import { uploadAsync } from "./../node_modules/expo-file-system/src/legacy/FileSystem";
import { Platform } from "react-native";

const getAPIBaseURL = () => {
  if (Platform.OS === "android") return "https://fridgesense.loca.lt"; 
  return "https://fridgesense.loca.lt";
};

const API_BASE_URL = getAPIBaseURL();
const INVENTORY_KEY = "food_inventory_storage";

export const getFunFact = async (): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/funfact-today`);
    const data: FunFactResponse = await response.json();
    return data.funfact || "Makan buah itu sehat!";
  } catch (error) {
    console.log("Funfact Error:", error);
    return "Tahukah kamu? Menyimpan sayuran di suhu terlalu rendah bisa membuatnya cepat layu!";
  }
};


export const uploadFoodImage = async (imageUri: string): Promise<UploadResponse> => {
  try {
    console.log("Uploading to:", `${API_BASE_URL}/classify`);
    const response = await uploadAsync(`${API_BASE_URL}/classify`, imageUri, {
      fieldName: "image",
      httpMethod: "POST",
      uploadType: FileSystemUploadType.MULTIPART,
      headers: { Accept: "application/json" },
    });

    if (response.status !== 200) {
      return { success: false, message: `Server error: ${response.status}` };
    }

    const result = JSON.parse(response.body);
    return {
      success: true,
      label: result.label,
      expiryDate: result.expiryDate,
      condition: result.condition, // fresh, ripe, etc
      tips: result.tips,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, message: "Gagal terhubung ke AI server." };
  }
};

// --- LOCAL STORAGE (INVENTORY) ---

export const getInventory = async (): Promise<FoodItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(INVENTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Read Error", e);
    return [];
  }
};

export const saveItemToStorage = async (item: FoodItem) => {
  try {
    const currentItems = await getInventory();
    const newItems = [...currentItems, item];
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newItems));
  } catch (e) {
    console.error("Save Error", e);
  }
};

export const updateItemInStorage = async (updatedItem: FoodItem) => {
  try {
    const currentItems = await getInventory();
    const newItems = currentItems.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newItems));
  } catch (e) {
    console.error("Update Error", e);
  }
};

export const deleteItemFromStorage = async (id: string) => {
  try {
    const currentItems = await getInventory();
    const newItems = currentItems.filter(item => item.id !== id);
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newItems));
  } catch (e) {
    console.error("Delete Error", e);
  }
};

export const getRecipeSuggestions = async (ingredients: string[]): Promise<Recipe[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/suggest-recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Recipe API Error:", error);
    return [];
  }
};