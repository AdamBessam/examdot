import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HumeurScreen from './HumeurScreen';
import GalerieScreen from './GalerieScreen';

const AccueilScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadMarkedDates();
  }, []);

  const loadMarkedDates = async () => {
    try {
      const entries = await AsyncStorage.getItem('journalEntries');
      if (entries) {
        const parsedEntries = JSON.parse(entries);
        const marked = {};
        
        Object.keys(parsedEntries).forEach(date => {
          marked[date] = {
            marked: true,
            dotColor: '#6366f1',
            selectedColor: '#6366f1',
          };
        });
        
        setMarkedDates(marked);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dates:', error);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    
    // Mettre à jour les dates marquées
    const newMarkedDates = { ...markedDates };
    
    // Réinitialiser toutes les sélections
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date].selected) {
        newMarkedDates[date] = {
          ...newMarkedDates[date],
          selected: false,
        };
      }
    });
    
    // Marquer la date sélectionnée
    newMarkedDates[day.dateString] = {
      ...newMarkedDates[day.dateString],
      selected: true,
      selectedColor: '#6366f1',
    };
    
    setMarkedDates(newMarkedDates);
  };

  const ajouterHumeur = () => {
    if (!selectedDate) {
      Alert.alert('Attention', 'Veuillez sélectionner une date');
      return;
    }
    
    navigation.navigate('Humeur', { date: selectedDate });
  };

  const voirGalerie = () => {
    navigation.navigate('Galerie');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendrier de votre bien-être</Text>
      
      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#6366f1',
          selectedDayBackgroundColor: '#6366f1',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#6366f1',
          dayTextColor: '#2d3748',
          textDisabledColor: '#d1d5db',
          dotColor: '#6366f1',
          selectedDotColor: '#ffffff',
          arrowColor: '#6366f1',
          monthTextColor: '#2d3748',
          indicatorColor: '#6366f1',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType={'dot'}
        enableSwipeMonths={true}
      />
      
      {selectedDate && (
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateText}>
            Date sélectionnée : {selectedDate}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={ajouterHumeur}
        >
          <Text style={styles.buttonText}>Ajouter mon humeur</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={voirGalerie}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Voir mes entrées
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 20,
  },
  calendar: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  selectedDateContainer: {
    backgroundColor: '#e0e7ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedDateText: {
    fontSize: 16,
    color: '#4338ca',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#6366f1',
  },
});

export default AccueilScreen;