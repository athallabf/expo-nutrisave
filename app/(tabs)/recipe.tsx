import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
} from 'react-native';
import { Recipe , FoodItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { useFocusEffect } from 'expo-router';

const getConditionStyle = (cond: string) => {
  switch (cond) {
    case 'fresh': return { color: '#059669', bg: '#D1FAE5', border: '#10B981' };
    case 'ripe': return { color: '#D97706', bg: '#FEF3C7', border: '#F59E0B' };
    case 'overripe': return { color: '#EA580C', bg: '#FFEDD5', border: '#F97316' };
    default: return { color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' };
  }
};

export default function RecipesScreen() {
  const [availableItems, setAvailableItems] = useState<FoodItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadIngredients();
    }, [])
  );

  const loadIngredients = async () => {
    const allItems = await api.getInventory();
    
    const validConditions = ['fresh', 'ripe', 'overripe'];
    const validItems = allItems.filter(item => validConditions.includes(item.condition));
    
    validItems.sort((a, b) => {
      const priority: any = { 'overripe': 1, 'ripe': 2, 'fresh': 3 };
      return priority[a.condition] - priority[b.condition];
    });

    setAvailableItems(validItems);
    
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    if (selectedIds.size === availableItems.length) {
      setSelectedIds(new Set()); 
    } else {
      const allIds = availableItems.map(i => i.id);
      setSelectedIds(new Set(allIds));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      Alert.alert("Pilih Bahan", "Silakan pilih minimal satu bahan makanan untuk dimasak.");
      return;
    }

    setLoading(true);
    setRecipes([]); 

    const selectedNames = availableItems
      .filter(item => selectedIds.has(item.id))
      .map(item => item.name);

    const uniqueNames = Array.from(new Set(selectedNames));
    
    try {
        const result = await api.getRecipeSuggestions(uniqueNames);
        setRecipes(result);
    } catch (e) {
        Alert.alert("Gagal", "Tidak bisa mendapatkan resep saat ini.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buat Resep</Text>
        <Text style={styles.subtitle}>Pilih bahan yang mau dimasak hari ini.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.selectionHeader}>
            <Text style={styles.sectionTitle}>Stok Tersedia ({availableItems.length})</Text>
            {availableItems.length > 0 && (
                <TouchableOpacity onPress={selectAll}>
                    <Text style={styles.selectAllText}>
                        {selectedIds.size === availableItems.length ? "Batal Semua" : "Pilih Semua"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>

        {availableItems.length === 0 ? (
            <View style={styles.emptyStock}>
                <Text style={styles.emptyText}>Tidak ada bahan layak masak.</Text>
            </View>
        ) : (
            <View style={styles.chipsContainer}>
                {availableItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const style = getConditionStyle(item.condition);
                    
                    return (
                        <TouchableOpacity 
                            key={item.id} 
                            style={[
                                styles.chip, 
                                isSelected ? { backgroundColor: style.bg, borderColor: style.border } : styles.chipInactive
                            ]}
                            onPress={() => toggleSelection(item.id)}
                            activeOpacity={0.7}
                        >
                            {isSelected && <Ionicons name="checkmark-circle" size={16} color={style.color} style={{marginRight: 4}} />}
                            <Text style={[
                                styles.chipText, 
                                isSelected ? { color: style.color, fontWeight: 'bold' } : { color: '#6B7280' }
                            ]}>
                                {item.name}
                            </Text>
                            <View style={[styles.dot, { backgroundColor: style.border }]} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        )}

        <TouchableOpacity 
            style={[styles.genButton, selectedIds.size === 0 && styles.genButtonDisabled]} 
            onPress={handleGenerate}
            disabled={loading || selectedIds.size === 0}
        >
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <>
                    <Ionicons name="sparkles" size={20} color="#FFF" />
                    <Text style={styles.genText}>
                        Buat Resep ({selectedIds.size} Bahan)
                    </Text>
                </>
            )}
        </TouchableOpacity>

        {recipes.length > 0 && <Text style={styles.sectionTitle}>Saran Masakan:</Text>}
        
        {recipes.map((recipe, index) => (
            <View key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="restaurant" size={24} color="#8B5CF6" />
                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                </View>
                
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>🛒 Bahan Tambahan:</Text>
                <Text style={styles.missingText}>
                    {recipe.missingIngredients.length > 0 
                        ? recipe.missingIngredients.join(', ') 
                        : "Tidak perlu beli bahan lain! ✨"}
                </Text>

                <Text style={styles.sectionLabel}>📝 Langkah:</Text>
                {recipe.steps.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                        <Text style={styles.stepNum}>{idx + 1}</Text>
                        <Text style={styles.stepText}>{step}</Text>
                    </View>
                ))}
            </View>
        ))}

        <View style={{height: 40}} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  scrollContent: { padding: 20 },
  
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 5 },
  selectAllText: { color: '#8B5CF6', fontWeight: '600' },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, marginBottom: 4 },
  chipInactive: { backgroundColor: '#FFF', borderColor: '#E5E7EB' },
  chipText: { fontSize: 14, textTransform: 'capitalize' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  
  emptyStock: { padding: 20, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 20 },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },

  genButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 30, elevation: 3, shadowColor: '#8B5CF6', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3 },
  genButtonDisabled: { backgroundColor: '#C4B5FD', elevation: 0 },
  genText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  recipeTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginTop: 12, marginBottom: 6 },
  missingText: { color: '#EF4444', fontStyle: 'italic', fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', marginBottom: 8, gap: 10 },
  stepNum: { fontWeight: 'bold', color: '#FFF', backgroundColor: '#8B5CF6', width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontSize: 12 },
  stepText: { flex: 1, color: '#374151', lineHeight: 22 },
});