import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, TouchableOpacity } from 'react-native';
import formatDate from '@/helper/formatDate';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from 'expo-router';
import * as api from '../../services/api';
import { FoodItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';

LocaleConfig.locales['id'] = {
  monthNames: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'],
  dayNames: ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],
  dayNamesShort: ['Min','Sen','Sel','Rab','Kam','Jum','Sab'],
  today: 'Hari ini'
};
LocaleConfig.defaultLocale = 'id';

export default function CalendarScreen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await api.getInventory();
    setItems(data);

    const marks: any = {};
    data.forEach(item => {
      const date = item.expiryDate;
      const color = (item.condition === 'rotten' || item.condition === 'overripe') ? '#EF4444' : '#F59E0B';
      
      marks[date] = { 
        marked: true, 
        dotColor: color,
        activeOpacity: 0
      };
    });
    setMarkedDates(marks);
  };

  const onDayPress = (day: any) => {
    const date = day.dateString;
    const itemsOnDate = items.filter(i => i.expiryDate === date);
    
    if (itemsOnDate.length > 0) {
        setSelectedDate(date);
        setSelectedItems(itemsOnDate);
        setModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kalender</Text>
      <View style={styles.calendarWrapper}>
        <Calendar
          markedDates={markedDates}
          onDayPress={onDayPress}
          theme={{
            todayTextColor: '#10B981',
            arrowColor: '#10B981',
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold'
          }}
        />
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: '#EF4444'}]} />
            <Text style={styles.legendText}>Busuk</Text>
        </View>
        <View style={styles.legendItem}>
            <View style={[styles.dot, {backgroundColor: '#F59E0B'}]} />
            <Text style={styles.legendText}>Segar/Matang</Text>
        </View>
      </View>

      {/* Modal Detail per Tanggal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Item Expired: {formatDate(selectedDate)}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>
                <FlatList 
                    data={selectedItems}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                        <View style={styles.itemRow}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemCond}>{item.condition}</Text>
                        </View>
                    )}
                />
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1F2937' },
  calendarWrapper: { borderRadius: 16, overflow: 'hidden', elevation: 4, backgroundColor: '#FFF', padding: 10, paddingBottom: 20 },
  legend: { marginTop: 24, flexDirection: 'row', gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#6B7280', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 250 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 16, textTransform: 'capitalize' },
  itemCond: { fontSize: 14, color: '#6B7280' }
});