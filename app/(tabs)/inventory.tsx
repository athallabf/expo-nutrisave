// app/(tabs)/inventory.tsx
import { FoodItem } from "@/types"; // Import tipe dari file terpusat
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import * as api from "../../services/api";

// Fungsi helper untuk memformat tanggal menjadi relatif
const formatRelativeDate = (dateString: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalisasi waktu hari ini
  const expiryDate = new Date(dateString);
  expiryDate.setHours(0, 0, 0, 0); // Normalisasi waktu kedaluwarsa

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Lewat ${Math.abs(diffDays)} hari`;
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  return `Dalam ${diffDays} hari`;
};

// Fungsi helper untuk memberikan warna berdasarkan tanggal kedaluwarsa
const getExpiryStyle = (dateString: string) => {
  const today = new Date();
  const expiryDate = new Date(dateString);
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return styles.expiryPassed;
  if (diffDays <= 3) return styles.expirySoon;
  return styles.expirySafe;
};

const { width } = Dimensions.get("window");

const InventoryScreen = () => {
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const loadInventory = useCallback(async () => {
    try {
      const data = await api.getInventory();
      // Urutkan data berdasarkan tanggal kedaluwarsa terdekat
      const sortedData = data.sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      setInventory(sortedData);
    } catch (error) {
      console.error("Gagal memuat inventaris:", error);
      // Di sini Anda bisa menambahkan state error untuk ditampilkan di UI
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // useFocusEffect akan menjalankan callback setiap kali layar ini menjadi fokus.
  // Ini memastikan data selalu terbaru setelah kembali dari layar lain (misal: kamera).
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadInventory();
    }, [loadInventory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInventory();
  }, [loadInventory]);

  const getExpiryIcon = (dateString: string) => {
    const today = new Date();
    const expiryDate = new Date(dateString);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "🚨";
    if (diffDays <= 3) return "⚠️";
    return "✅";
  };

  const renderItem = ({ item }: { item: FoodItem }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.itemContainer} activeOpacity={0.7}>
        <LinearGradient
          colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
          style={styles.itemGradient}
        >
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIcon}>
                {getExpiryIcon(item.expiryDate)}
              </Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text
                  style={[styles.itemExpiry, getExpiryStyle(item.expiryDate)]}
                >
                  {formatRelativeDate(item.expiryDate)}
                </Text>
              </View>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionEmoji}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionEmoji}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Animate items when they load
  React.useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start();
    }
  }, [loading, fadeAnim]);

  if (loading && !refreshing) {
    return (
      <LinearGradient
        colors={["#a6ad4dff", "#a25f4bff"]}
        style={styles.container}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Memuat inventaris...</Text>
        </View>
      </LinearGradient>
    );
  }

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📦</Text>
      <Text style={styles.emptyTitle}>Inventaris Kosong</Text>
      <Text style={styles.emptySubText}>
        Mulai tambahkan makanan untuk melacak tanggal kedaluwarsanya!
      </Text>
      <TouchableOpacity style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>+ Tambah Makanan Pertama</Text>
      </TouchableOpacity>
    </View>
  );

  const getSummary = () => {
    const expired = inventory.filter((item) => {
      const today = new Date();
      const expiryDate = new Date(item.expiryDate);
      return expiryDate < today;
    }).length;

    const expiringSoon = inventory.filter((item) => {
      const today = new Date();
      const expiryDate = new Date(item.expiryDate);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).length;

    return { expired, expiringSoon, total: inventory.length };
  };

  const summary = getSummary();

  return (
    <LinearGradient
      colors={["#a6ad4dff", "#a25f4bff"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventaris Makanan</Text>
        {inventory.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: "#FF9800" }]}>
                {summary.expiringSoon}
              </Text>
              <Text style={styles.summaryLabel}>Segera Exp</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: "#f7928bff" }]}>
                {summary.expired}
              </Text>
              <Text style={styles.summaryLabel}>Kedaluwarsa</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FFFFFF"]}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={
          inventory.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backdropFilter: "blur(10px)"
  },
  summaryItem: {
    alignItems: "center",
    flex: 1
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 12
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center"
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20
  },
  emptyListContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  itemContainer: {
    marginVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84
  },
  itemGradient: {
    padding: 16
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2
  },
  itemExpiry: {
    fontSize: 12,
    fontWeight: "500"
  },
  itemActions: {
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)"
  },
  actionEmoji: {
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center"
  },
  emptySubText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30
  },
  emptyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"
  },
  expiryPassed: {
    color: "#F44336",
    fontWeight: "bold"
  },
  expirySoon: {
    color: "#FF9800",
    fontWeight: "600"
  },
  expirySafe: {
    color: "#4CAF50",
    fontWeight: "500"
  }
});

export default InventoryScreen;
