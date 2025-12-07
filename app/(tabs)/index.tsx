import {
  registerForPushNotificationsAsync,
} from "@/services/notifications";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import formatDate from "@/helper/formatDate";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as api from "../../services/api";
import { FoodItem } from "@/types";

// Helper Translate
const translateCondition = (cond: string) => {
  const map: any = {
    'fresh': 'Segar',
    'ripe': 'Matang',
    'overripe': 'Terlalu Matang',
    'rotten': 'Busuk'
  };
  return map[cond] || cond;
};

// Component Tombol Aksi (Kamera/Galeri)
const ActionButton = ({ title, subtitle, icon, color, onPress, disabled, loading }: any) => (
  <TouchableOpacity
    style={[styles.actionCard, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.9}
    disabled={disabled}
  >
    <View style={styles.actionIconCircle}>
      {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={28} color={color} />}
    </View>
    <View style={styles.actionTextContainer}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
  </TouchableOpacity>
);

// Component Modal Hasil Scan
const ResultModal = ({ visible, data, onClose, onSave }: any) => {
  const [note, setNote] = useState("");

  // Reset note saat modal muncul baru
  useEffect(() => {
    if (visible) setNote("");
  }, [visible, data]);

  if (!data) return null;

  // Logic Warna sesuai kondisi (Sinkron dengan Inventory)
  let conditionColor = '#F3F4F6';
  let conditionTextColor = '#374151';

  switch (data.condition) {
    case 'fresh': 
      conditionColor = '#D1FAE5'; conditionTextColor = '#059669'; break;
    case 'ripe': 
      conditionColor = '#FEF3C7'; conditionTextColor = '#D97706'; break;
    case 'overripe': 
      conditionColor = '#FFEDD5'; conditionTextColor = '#EA580C'; break;
    case 'rotten': 
      conditionColor = '#FEE2E2'; conditionTextColor = '#DC2626'; break;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hasil Analisis AI</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: data.uri }} style={styles.resultImage} />

            <View style={styles.resultInfoContainer}>
              <View>
                <Text style={[styles.resultLabel, { textTransform: 'capitalize' }]}>
                  {data.label}
                </Text>
                <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
                  <Text style={[styles.conditionText, { color: conditionTextColor }]}>
                    {translateCondition(data.condition)}
                  </Text>
                </View>
              </View>
              <View style={styles.expiryBadge}>
                <Ionicons name="time-outline" size={16} color="#B45309" />
                <Text style={styles.expiryText}>{formatDate(data.expiryDate)}</Text>
              </View>
            </View>

            {/* Input Manual Note */}
            <Text style={styles.inputLabel}>Catatan (Opsional):</Text>
            <TextInput 
              style={styles.inputNote} 
              placeholder="Misal: Beli di pasar pagi..."
              value={note}
              onChangeText={setNote}
              multiline
            />

            <View style={styles.tipsContainer}>
              <View style={styles.tipsHeaderRow}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.tipsTitle}>Saran Penyimpanan</Text>
              </View>
              {data.tips?.map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={() => onSave(note)}>
            <Text style={styles.saveButtonText}>Simpan ke Inventaris</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const HomeScreen = () => {
  const router = useRouter();
  const [totalItems, setTotalItems] = useState(0);
  const [funFact, setFunFact] = useState("Loading fun fact...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load Initial Data
  useEffect(() => {
    api.getFunFact().then(setFunFact);
    registerForPushNotificationsAsync();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Update total items saat layar fokus
  useFocusEffect(
    useCallback(() => {
      const loadCount = async () => {
        const items = await api.getInventory();
        setTotalItems(items.length);
      };
      loadCount();
    }, [])
  );

  // --- LOGIC UTAMA (DIPAKAI KAMERA & GALERI) ---
  const processImage = async (imageUri: string) => {
    setIsProcessing(true);
    try {
      // Kita panggil API, tapi JANGAN langsung save.
      // Kita setScanResult dulu agar Modal muncul.
      const result = await api.uploadFoodImage(imageUri);
      
      if (result.success) {
        setScanResult({
          uri: imageUri,
          label: result.label,
          expiryDate: result.expiryDate,
          condition: result.condition,
          tips: result.tips,
        });
      } else {
        Alert.alert("Gagal", result.message || "Tidak dapat mengenali makanan.");
      }
    } catch (error) {
      console.error("Processing Error:", error);
      Alert.alert("Error", "Terjadi kesalahan sistem.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Fungsi Buka Kamera (SAMA FLOW DENGAN GALERI)
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert("Izin Ditolak", "Aplikasi membutuhkan izin kamera untuk fitur ini.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1] // Optional: agar kotak
    });

    if (!result.canceled) {
      // Panggil fungsi proses yang sama!
      processImage(result.assets[0].uri);
    }
  };

  // 2. Fungsi Buka Galeri
  const selectFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      quality: 0.5,
    });
    if (!res.canceled) {
      processImage(res.assets[0].uri);
    }
  };

  // 3. Simpan ke Inventory (Dipanggil dari Modal)
  const saveToInventory = async (note: string) => {
    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: scanResult.label,
      expiryDate: scanResult.expiryDate,
      condition: scanResult.condition,
      tips: scanResult.tips,
      imageUri: scanResult.uri,
      note: note, // Note masuk di sini
      createdAt: Date.now()
    };
    
    await api.saveItemToStorage(newItem);
    setScanResult(null); // Tutup Modal
    setTotalItems(prev => prev + 1); // Update UI Angka
    
    // Opsional: Langsung pindah ke tab Inventory atau toast
    Alert.alert("Berhasil", "Makanan disimpan ke Inventaris!", [
      { text: "OK", onPress: () => router.push("/(tabs)/inventory") }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerBg}>
        <LinearGradient colors={["#10B981", "#059669"]} style={styles.headerGradient} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Halo, Food Saver! 👋</Text>
            <Text style={styles.headerSubtitle}>Ayo selamatkan makananmu.</Text>
          </View>
        </View>

        <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Makanan Disimpan</Text>
          </View>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipCardTitle}>💡 Fun Fact Hari Ini</Text>
          </View>
          <Text style={styles.tipContent}>{funFact}</Text>
        </View>

        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionContainer}>
          {/* TOMBOL KAMERA */}
          <ActionButton
            title={isProcessing ? "Menganalisis..." : "Foto Makanan"}
            subtitle="Identifikasi AI & Kondisi"
            icon="camera"
            color="#10B981"
            onPress={takePhoto} // LANGSUNG PANGGIL FUNGSI LOKAL
            disabled={isProcessing}
            loading={isProcessing}
          />
          
          {/* TOMBOL GALERI */}
          <ActionButton
            title="Upload Galeri"
            subtitle="Pilih dari foto yang ada"
            icon="images"
            color="#3B82F6"
            onPress={selectFromGallery}
            disabled={isProcessing}
          />
        </View>
      </ScrollView>

      {/* MODAL HASIL (Akan muncul baik dari Kamera maupun Galeri) */}
      <ResultModal 
        visible={!!scanResult} 
        data={scanResult} 
        onClose={() => setScanResult(null)}
        onSave={saveToInventory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  headerBg: { height: 260, marginBottom: 20 },
  headerGradient: { ...StyleSheet.absoluteFillObject, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  headerSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  statsCard: { flexDirection: 'row', backgroundColor: "#FFFFFF", marginHorizontal: 24, marginTop: 24, padding: 20, borderRadius: 20, elevation: 5, justifyContent: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: "bold", color: "#111827" },
  statLabel: { fontSize: 14, color: "#6B7280" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginBottom: 16, marginTop: 10 },
  actionContainer: { gap: 16 },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, elevation: 3 },
  actionIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFF", justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  actionSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
  tipCard: { marginBottom: 24, backgroundColor: "#ECFDF5", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#D1FAE5" },
  tipHeader: { marginBottom: 8 },
  tipCardTitle: { fontSize: 16, fontWeight: "bold", color: "#065F46" },
  tipContent: { fontSize: 14, color: "#047857", lineHeight: 22 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  resultImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 15 },
  resultInfoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  resultLabel: { fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize' },
  conditionBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  conditionText: { fontSize: 12, fontWeight: 'bold' },
  expiryBadge: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 8, borderRadius: 20, alignItems: 'center', gap: 6 },
  expiryText: { color: '#B45309', fontWeight: 'bold' },
  tipsContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, marginVertical: 15 },
  tipsHeaderRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tipsTitle: { fontWeight: 'bold' },
  tipItem: { flexDirection: 'row', marginBottom: 4 },
  tipBullet: { color: '#10B981', marginRight: 8 },
  tipText: { flex: 1, color: '#4B5563' },
  saveButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
  inputLabel: { fontWeight: '600', marginBottom: 6, color: '#374151' },
  inputNote: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 10 },
});

export default HomeScreen;