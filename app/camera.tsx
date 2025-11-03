import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import * as api from "../services/api";

const { width, height } = Dimensions.get("window");

const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const [captureAnim] = useState(new Animated.Value(1));
  const [focusAnim] = useState(new Animated.Value(0));

  if (!permission) {
    return <View />; // Tampilan kosong selagi menunggu status izin
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.permissionContainer}
      >
        <View style={styles.permissionContent}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
          <Text style={styles.message}>
            Kami memerlukan akses kamera untuk mengidentifikasi makanan Anda
            secara otomatis
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <LinearGradient
              colors={["#4CAF50", "#45a049"]}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>
                📱 Berikan Izin Kamera
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const animateCapture = () => {
    Animated.sequence([
      Animated.timing(captureAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(captureAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const animateFocus = () => {
    Animated.sequence([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsProcessing(true);
      animateCapture();
      animateFocus();

      try {
        // Ambil gambar dengan kualitas 70% untuk mengurangi ukuran file
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7
        });
        if (!photo?.uri) {
          throw new Error("Gagal mengambil gambar.");
        }

        const result = await api.uploadFoodImage(photo.uri);

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
            result.message ||
              "Tidak dapat mengidentifikasi makanan. Coba lagi dengan pencahayaan yang lebih baik."
          );
        }
      } catch (error: any) {
        console.error("Error in takePicture:", error);
        Alert.alert(
          "⚠️ Error",
          error.message || "Terjadi kesalahan saat memproses gambar."
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        {/* Header */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Makanan</Text>
          <View style={styles.placeholder} />
        </LinearGradient>

        {/* Focus Animation */}
        <Animated.View
          style={[
            styles.focusIndicator,
            {
              opacity: focusAnim,
              transform: [{ scale: focusAnim }]
            }
          ]}
        />

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.instructionsGradient}
          >
            <Text style={styles.instructionsText}>
              🥄 Arahkan kamera ke makanan Anda
            </Text>
            <Text style={styles.instructionsSubText}>
              Pastikan makanan terlihat jelas dan pencahayaan cukup
            </Text>
          </LinearGradient>
        </View>

        {/* Loading Overlay */}
        {isProcessing && (
          <LinearGradient
            colors={["rgba(102,126,234,0.9)", "rgba(118,75,162,0.9)"]}
            style={styles.loadingOverlay}
          >
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                🤖 Mengidentifikasi makanan...
              </Text>
              <Text style={styles.loadingSubText}>Mohon tunggu sebentar</Text>
            </View>
          </LinearGradient>
        )}

        {/* Capture Button */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                isProcessing && styles.captureButtonDisabled
              ]}
              onPress={takePicture}
              disabled={isProcessing}
            >
              <View style={styles.captureButtonInner}>
                <Text style={styles.captureButtonText}>
                  {isProcessing ? "⏳" : "📷"}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black"
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  permissionContent: {
    alignItems: "center",
    paddingHorizontal: 40
  },
  permissionEmoji: {
    fontSize: 80,
    marginBottom: 24
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center"
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 32,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 24
  },
  permissionButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  permissionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center"
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  },
  camera: {
    flex: 1
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)"
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center"
  },
  placeholder: {
    width: 80
  },
  focusIndicator: {
    position: "absolute",
    top: height / 2 - 50,
    left: width / 2 - 50,
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  },
  instructionsContainer: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0
  },
  instructionsGradient: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    alignItems: "center"
  },
  instructionsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4
  },
  instructionsSubText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 50
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(158, 158, 158, 0.7)",
    borderColor: "#9E9E9E"
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(102,126,234,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  captureButtonText: {
    fontSize: 24
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 40
  },
  loadingText: {
    color: "white",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center"
  },
  loadingSubText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center"
  }
});

export default CameraScreen;
