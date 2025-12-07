import { FoodItem } from "@/types";
import { useFocusEffect } from "expo-router";
import formatDate from "@/helper/formatDate";
import React, { useCallback, useState, useEffect } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';
import * as api from "../../services/api";

// --- HELPER TRANSLATE & WARNA ---
const translateCondition = (cond: string) => {
  const map: Record<string, string> = {
    'fresh': 'Segar',
    'ripe': 'Matang',
    'overripe': 'Terlalu Matang', // Tambahan
    'rotten': 'Busuk'
  };
  return map[cond] || cond;
};

const getConditionColor = (cond: string) => {
  switch (cond) {
    case 'fresh': return { bg: '#D1FAE5', text: '#059669' };    // Hijau
    case 'ripe': return { bg: '#FEF3C7', text: '#D97706' };     // Kuning
    case 'overripe': return { bg: '#FFEDD5', text: '#EA580C' }; // Oranye
    case 'rotten': return { bg: '#FEE2E2', text: '#DC2626' };   // Merah
    default: return { bg: '#F3F4F6', text: '#374151' };
  }
};

// --- Detail Modal ---
const DetailModal = ({ item, visible, onClose, onDelete, onUpdate }: any) => {
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (item) setNote(item.note || "");
    setIsEditing(false);
  }, [item]);

  if (!item) return null;

  const days = Math.ceil((new Date(item.expiryDate).getTime() - new Date().setHours(0,0,0,0)) / (86400000));
  const conditionStyle = getConditionColor(item.condition);

  const handleSaveNote = async () => {
    const updated = { ...item, note };
    await onUpdate(updated);
    setIsEditing(false);
  };

  const scheduleReminder = async () => {
    const triggerDate = new Date(item.expiryDate);
    triggerDate.setHours(8, 0, 0, 0); 
    triggerDate.setDate(triggerDate.getDate() - 1); 

    if (triggerDate.getTime() < Date.now()) {
      Alert.alert("Info", "Tanggal kedaluwarsa sudah dekat/lewat.");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Peringatan Kedaluwarsa",
        body: `Jangan lupa! ${item.name} akan kedaluwarsa besok.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    Alert.alert("Sukses", "Pengingat berhasil diatur.");
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={[styles.itemModalName, { textTransform: 'capitalize' }]}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
          </View>

          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.detailImage} />
          ) : (
             <View style={[styles.detailImage, {backgroundColor:'#eee', justifyContent:'center', alignItems:'center'}]}>
                <Text style={{fontSize:40}}>🥦</Text>
             </View>
          )}

          <View style={styles.infoRow}>
            {/* TAMPILAN KONDISI DI MODAL */}
            <View style={[styles.tag, { backgroundColor: conditionStyle.bg }]}>
              <Text style={{ color: conditionStyle.text, fontWeight: 'bold' }}>
                {translateCondition(item.condition)}
              </Text>
            </View>
            <Text style={{color: days < 0 ? 'red' : 'gray'}}>
              {days < 0 ? `Expired ${Math.abs(days)} hari lalu` : `${days} hari lagi`}
            </Text>
          </View>

          <Text style={styles.sectionHeader}>Catatan:</Text>
          <View style={styles.noteContainer}>
             {isEditing ? (
               <TextInput style={styles.inputEdit} value={note} onChangeText={setNote} multiline />
             ) : (
               <Text style={styles.noteText}>{note || "Belum ada catatan."}</Text>
             )}
             <TouchableOpacity onPress={isEditing ? handleSaveNote : () => setIsEditing(true)}>
               <Ionicons name={isEditing ? "checkmark-circle" : "create-outline"} size={24} color="#10B981" />
             </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Tips Penyimpanan (Sesuai Kondisi):</Text>
          <ScrollView style={styles.tipsScroll}>
            {item.tips && item.tips.length > 0 ? (
                item.tips.map((tip: string, idx: number) => (
                    <View key={idx} style={styles.tipRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                ))
            ) : (
                <Text style={{color: '#9CA3AF', fontStyle: 'italic'}}>Tidak ada tips khusus.</Text>
            )}
          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.reminderButton} onPress={scheduleReminder}>
              <Ionicons name="alarm-outline" size={20} color="#FFF" />
              <Text style={styles.btnText}>Ingatkan Saya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const InventoryScreen = () => {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All"); 
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const data = await api.getInventory();
    const sorted = data.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    setItems(sorted);
    setFilteredItems(sorted);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadInventory(); }, [loadInventory]));

  // LOGIKA FILTER
  useEffect(() => {
    let result = items;
    
    // 1. Filter Nama
    if (search) {
      result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }

    // 2. Filter Kondisi (fresh, ripe, overripe, rotten)
    if (filter !== "All") {
      result = result.filter(i => i.condition === filter);
    }

    setFilteredItems(result);
  }, [search, filter, items]);

  const handleDelete = async (id: string) => {
    await api.deleteItemFromStorage(id);
    loadInventory();
    setSelectedItem(null);
  };

  const handleUpdate = async (updatedItem: FoodItem) => {
    await api.updateItemInStorage(updatedItem);
    loadInventory(); 
    setSelectedItem(updatedItem); 
  };

  const renderItem = ({ item }: { item: FoodItem }) => {
    const days = Math.ceil((new Date(item.expiryDate).getTime() - new Date().setHours(0,0,0,0)) / (86400000));
    const conditionStyle = getConditionColor(item.condition);

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)}>
        <View style={styles.imageContainer}>
             {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
             ) : (
                <Text style={{fontSize: 24}}>🥦</Text> 
             )}
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.itemName, { textTransform: 'capitalize' }]}>{item.name}</Text>
          <Text style={styles.expiryDate}>Exp: {formatDate(item.expiryDate)}</Text>
          
          {/* Badge Kondisi di List */}
          <View style={{flexDirection: 'row', marginTop: 4}}>
             <View style={[styles.miniBadge, { backgroundColor: conditionStyle.bg }]}>
                <Text style={[styles.miniBadgeText, { color: conditionStyle.text }]}>
                   {translateCondition(item.condition)}
                </Text>
             </View>
          </View>
        </View>

        {/* Badge Hari */}
        <View style={[styles.badge, { backgroundColor: days < 0 ? '#FEE2E2' : days <=3 ? '#FEF3C7' : '#D1FAE5' }]}>
          <Text style={[styles.badgeText, { color: days < 0 ? '#EF4444' : days <=3 ? '#D97706' : '#059669' }]}>
            {days < 0 ? "Exp" : `${days} h`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterChip = ({ label, value }: any) => (
    <TouchableOpacity 
      style={[styles.chip, filter === value && styles.chipActive]} 
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Makanan</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            placeholder="Cari makanan..." 
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* 4 FILTER UTAMA SESUAI API */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
          <FilterChip label="Semua" value="All" />
          <FilterChip label="Segar" value="fresh" />
          <FilterChip label="Matang" value="ripe" />
          <FilterChip label="Terlalu Matang" value="overripe" />
          <FilterChip label="Busuk" value="rotten" />
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInventory} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{color: '#9CA3AF'}}>Tidak ada item dengan filter ini.</Text>
          </View>
        }
      />

      <DetailModal 
        item={selectedItem} 
        visible={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  center: { alignItems: 'center', marginTop: 50 },
  header: { backgroundColor: "#FFF", paddingTop: 60, paddingBottom: 15, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 3 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 15 },
  searchBar: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 10, borderRadius: 12, alignItems: 'center' },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { color: '#4B5563' },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: "#FFF", padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  imageContainer: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden', marginRight: 16, backgroundColor: "#F3F4F6", justifyContent: 'center', alignItems: 'center' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  infoBox: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  itemModalName: { fontSize: 22, fontWeight: "bold", color: "#111827" },
  expiryDate: { fontSize: 12, color: "#9CA3AF" },
  
  // Style Badge Kondisi (Baru)
  miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },

  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  detailCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '85%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', textTransform: 'capitalize' },
  detailImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 15, resizeMode: 'cover' },
  infoRow: { justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 10 },
  noteContainer: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'space-between' },
  noteText: { color: '#4B5563', flex: 1, fontStyle: 'italic' },
  inputEdit: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, marginRight: 10, minHeight: 40 },
  tipsScroll: { maxHeight: 150 },
  tipRow: { flexDirection: 'row', marginBottom: 6 },
  bulletPoint: { color: '#10B981', marginRight: 8 },
  tipText: { flex: 1, color: '#4B5563' },
  actionButtons: { flexDirection: 'row', marginTop: 20, gap: 10 },
  reminderButton: { flex: 1, flexDirection: 'row', backgroundColor: '#F59E0B', padding: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
  deleteButton: { backgroundColor: '#EF4444', padding: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', width: 60 },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});

export default InventoryScreen;