// app/(tabs)/index.tsx
import {
  registerForPushNotificationsAsync,
  sendPushNotification
} from "@/services/notifications";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import * as api from "../../services/api";

const { width } = Dimensions.get("window");

const HomeScreen = () => {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scaleAnim = new Animated.Value(1);

  // Dapatkan token hanya untuk keperluan tombol tes di UI ini
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });
  }, []);

  const handleSendNotification = async () => {
    if (expoPushToken) {
      await sendPushNotification(expoPushToken);
      Alert.alert("Notifikasi Terkirim!", "Cek bar notifikasi perangkat Anda.");
    } else {
      Alert.alert(
        "Token Belum Siap",
        "Expo Push Token belum berhasil didapatkan. Coba lagi nanti."
      );
    }
  };

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);
    try {
      const result = await api.uploadFoodImage(imageUri);

      if (result.success) {
        Alert.alert(
          "🎉 Berhasil!",
          `Makanan teridentifikasi sebagai: ${result.label}.\n\n✅ Item telah ditambahkan ke inventaris.`,
          [
            {
              text: "Lihat Inventaris",
              onPress: () => router.push("/(tabs)/inventory")
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
    } finally {
      setIsProcessing(false);
    }
  };

  const selectFromGallery = async () => {
    try {
      // Request permission to access media library
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Izin Diperlukan",
          "Mohon berikan izin untuk mengakses galeri foto Anda."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Error in selectFromGallery:", error);
      Alert.alert(
        "⚠️ Error",
        error.message || "Terjadi kesalahan saat memilih gambar dari galeri."
      );
    }
  };

  const animatePress = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start(() => callback());
  };

  return (
    <LinearGradient
      colors={["#a6ad4dff", "#a25f4bff"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.heroSection}>
            <Text style={styles.emoji}>🥬</Text>
            <Text style={styles.title}>NutriSave</Text>
            <Text style={styles.subtitle}>Kurangi limbah makanan Anda</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Makanan Disimpan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0kg</Text>
                <Text style={styles.statLabel}>Limbah Dikurangi</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[styles.actionCard, styles.primaryCard]}
              onPress={() => animatePress(() => router.push("/camera"))}
              activeOpacity={isProcessing ? 1 : 0.8}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={
                  isProcessing ? ["#CCCCCC", "#AAAAAA"] : ["#4CAF50", "#45a049"]
                }
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIcon}>
                  <Text style={styles.iconEmoji}>
                    {isProcessing ? "⏳" : "📷"}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>
                  {isProcessing ? "Memproses AI..." : "Tambah Makanan"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isProcessing
                    ? "Mohon tunggu sebentar"
                    : "Foto makananmu untuk mulai melacak"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={selectFromGallery}
            activeOpacity={isProcessing ? 1 : 0.8}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={
                isProcessing ? ["#CCCCCC", "#AAAAAA"] : ["#FF9800", "#F57C00"]
              }
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.iconEmoji}>
                  {isProcessing ? "⏳" : "🖼️"}
                </Text>
              </View>
              <Text style={styles.cardTitle}>
                {isProcessing ? "Memproses AI..." : "Pilih dari Galeri"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isProcessing
                  ? "Mohon tunggu sebentar"
                  : "Gunakan foto yang sudah ada"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={() => router.push("/(tabs)/inventory")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.iconEmoji}>📦</Text>
              </View>
              <Text style={styles.cardTitle}>Lihat Inventaris</Text>
              <Text style={styles.cardSubtitle}>Kelola stok makanan Anda</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Tips Card */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Tips Hari Ini</Text>
            <Text style={styles.tipsText}>
              Simpan buah-buahan di tempat yang sejuk dan kering untuk
              memperpanjang umur simpannya!
            </Text>
          </View>

          {/* Developer Options */}
          <TouchableOpacity
            style={styles.devCard}
            onPress={handleSendNotification}
            disabled={!expoPushToken}
          >
            <Text style={styles.devTitle}>🔧 Developer</Text>
            <Text style={styles.devText}>Tes Notifikasi Push</Text>
            {!expoPushToken && (
              <Text style={styles.devStatus}>Token belum siap...</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30
  },
  heroSection: {
    alignItems: "center"
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 30,
    textAlign: "center"
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    backdropFilter: "blur(10px)"
  },
  statItem: {
    alignItems: "center",
    flex: 1
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 20
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center"
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 16
  },
  actionCard: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65
  },
  primaryCard: {
    marginBottom: 4
  },
  secondaryCard: {
    marginBottom: 4
  },
  cardGradient: {
    padding: 24,
    minHeight: 120,
    justifyContent: "center"
  },
  cardIcon: {
    alignSelf: "flex-start",
    marginBottom: 12
  },
  iconEmoji: {
    fontSize: 32
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20
  },
  tipsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8
  },
  tipsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20
  },
  devCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  devTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4
  },
  devText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4
  },
  devStatus: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic"
  }
});

export default HomeScreen;
