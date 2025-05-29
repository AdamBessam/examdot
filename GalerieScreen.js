import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GalerieScreen = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const moods = {
    1: { emoji: '😢', label: 'Très triste', color: '#ef4444' },
    2: { emoji: '😞', label: 'Triste', color: '#f97316' },
    3: { emoji: '😐', label: 'Neutre', color: '#eab308' },
    4: { emoji: '😊', label: 'Content', color: '#22c55e' },
    5: { emoji: '😄', label: 'Très heureux', color: '#16a34a' },
  };

  useEffect(() => {
    loadEntries();
    
    // Recharger quand on revient sur cet écran
    const unsubscribe = navigation.addListener('focus', () => {
      loadEntries();
    });

    return unsubscribe;
  }, [navigation]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const savedEntries = await AsyncStorage.getItem('journalEntries');
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        const entriesArray = Object.values(parsedEntries);
        
        // Trier par date (plus récent en premier)
        entriesArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setEntries(entriesArray);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger vos entrées');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (date) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette entrée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const savedEntries = await AsyncStorage.getItem('journalEntries');
              if (savedEntries) {
                const parsedEntries = JSON.parse(savedEntries);
                delete parsedEntries[date];
                await AsyncStorage.setItem('journalEntries', JSON.stringify(parsedEntries));
                loadEntries();
              }
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cette entrée');
            }
          },
        },
      ]
    );
  };

  const editEntry = (date) => {
    navigation.navigate('Humeur', { date });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Aujourd'hui";
    if (diffDays === 2) return "Hier";
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    if (diffDays <= 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  };

  const renderEntry = ({ item }) => {
    const mood = moods[item.mood];
    
    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => editEntry(item.date)}
      >
        <View style={styles.entryHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {formatDate(item.date)}
            </Text>
            <Text style={styles.timeAgoText}>
              {getTimeAgo(item.date)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteEntry(item.date)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.moodDisplay}>
          <View style={[styles.moodBadge, { backgroundColor: mood.color }]}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodText}>{mood.label}</Text>
          </View>
          
          <View style={styles.moodLevel}>
            <Text style={styles.moodLevelText}>
              Intensité: {item.moodLevel || 5}/10
            </Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={3}>
              {item.notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucune entrée trouvée</Text>
        <Text style={styles.emptySubText}>
          Commencez par ajouter votre première humeur !
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Accueil')}
        >
          <Text style={styles.addButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {entries.length} entrée{entries.length > 1 ? 's' : ''} trouvée{entries.length > 1 ? 's' : ''}
      </Text>
      
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    textTransform: 'capitalize',
  },
  timeAgoText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  moodText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  moodLevel: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  moodLevelText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default GalerieScreen;