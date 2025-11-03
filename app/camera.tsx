import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import * as api from "../services/api";

const CameraScreen = () => {
  const router = useRouter();

  const processImage = async (imageUri: string) => {
    try {
      const result = await api.uploadFoodImage(imageUri);

      if (result.success) {
        Alert.alert(
          "🎉 Berhasil!",
          `Makanan teridentifikasi sebagai: ${result.label}.\n\n✅ Item telah ditambahkan ke inventaris.`,
          [
            {
              text: "Lihat Inventaris",
              onPress: () => {
                router.back();
                router.push("/(tabs)/inventory");
              }
            },
            { text: "Tambah Lagi", style: "cancel" }
          ]
        );
      } else {
        Alert.alert(
          "❌ Gagal",
          result.message || "Tidak dapat mengidentifikasi makanan. Coba lagi."
        );
      }
    } catch (error: any) {
      console.error("Error in processImage:", error);
      Alert.alert(
        "⚠️ Error",
        error.message || "Terjadi kesalahan saat memproses gambar."
      );
    }
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Izin Diperlukan",
          "Mohon berikan izin kamera untuk mengambil foto makanan."
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("Error in openCamera:", error);
      Alert.alert(
        "⚠️ Error",
        error.message || "Terjadi kesalahan saat membuka kamera."
      );
      router.back();
    }
  };

  // Automatically open camera when this screen loads
  useEffect(() => {
    openCamera();
  }, []);

  // Return null since we're using built-in camera
  return null;
};

export default CameraScreen;
