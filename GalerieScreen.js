
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MediaRecorder from './components/MediaRecorder';

const GalerieScreen = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMediaRecorder, setShowMediaRecorder] = useState(false);
  const [mediaEntries, setMediaEntries] = useState([]);
  const [recordingType, setRecordingType] = useState(null);

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
      
      // Load journal entries
      const savedEntries = await AsyncStorage.getItem('journalEntries');
      let moodEntries = [];
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        moodEntries = Object.values(parsedEntries);
      }

      // Load media entries
      const savedMediaEntries = await AsyncStorage.getItem('mediaEntries');
      let mediaEntriesArray = [];
      if (savedMediaEntries) {
        mediaEntriesArray = JSON.parse(savedMediaEntries);
      }
      setMediaEntries(mediaEntriesArray);

      // Combine and sort all entries
      const allEntries = [...moodEntries, ...mediaEntriesArray];
      allEntries.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      
      setEntries(allEntries);
      console.log('Loaded entries:', allEntries.length);
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

  const deleteMediaEntry = async (id) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet enregistrement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const existingEntries = await AsyncStorage.getItem('mediaEntries') || '[]';
              const parsedEntries = JSON.parse(existingEntries);
              const updatedEntries = parsedEntries.filter(entry => entry.id !== id);
              await AsyncStorage.setItem('mediaEntries', JSON.stringify(updatedEntries));
              loadEntries();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cet enregistrement');
            }
          },
        },
      ]
    );
  };

  const playMedia = async (item) => {
    try {
      if (item.type === 'audio') {
        const { sound } = await Audio.Sound.createAsync({ uri: item.url });
        await sound.playAsync();
      } else {
        // For video, we'll need to implement a video player modal
        Alert.alert('Vidéo', 'Fonctionnalité en cours de développement');
      }
    } catch (error) {
      console.error('Error playing media:', error);
      Alert.alert('Erreur', 'Impossible de lire le média');
    }
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

  const handleRecordingComplete = async (mediaUrl, type) => {
    try {
      console.log('Recording completed:', { mediaUrl, type });
      
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().getTime();
      
      const newEntry = {
        id: timestamp,
        date: today,
        type,
        url: mediaUrl,
        createdAt: new Date().toISOString(),
      };

      const existingEntries = await AsyncStorage.getItem('mediaEntries') || '[]';
      const parsedEntries = JSON.parse(existingEntries);
      const updatedEntries = [...parsedEntries, newEntry];
      
      await AsyncStorage.setItem('mediaEntries', JSON.stringify(updatedEntries));
      setMediaEntries(updatedEntries);
      
      console.log('Media entry saved successfully');
      
      // Close modal and reload entries
      setShowMediaRecorder(false);
      setRecordingType(null);
      loadEntries();
      
    } catch (error) {
      console.error('Error saving media entry:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'enregistrement');
    }
  };

  const startRecording = (type) => {
    console.log('Starting recording with type:', type);
    setRecordingType(type);
    setShowMediaRecorder(true);
  };

  const closeMediaRecorder = () => {
    console.log('Closing media recorder');
    setShowMediaRecorder(false);
    setRecordingType(null);
  };

  const renderMediaRecorderModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showMediaRecorder}
      onRequestClose={closeMediaRecorder}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={closeMediaRecorder}
        >
          <Text style={styles.closeButtonText}>✕ Fermer</Text>
        </TouchableOpacity>
        <MediaRecorder 
          onRecordingComplete={handleRecordingComplete}
          initialRecordingType={recordingType}
        />
      </View>
    </Modal>
  );

  const renderEntry = ({ item }) => {
    if (item.type === 'video' || item.type === 'audio') {
      // Render media entry
      return (
        <View style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {formatDate(item.date || item.createdAt)}
              </Text>
              <Text style={styles.timeAgoText}>
                {getTimeAgo(item.date || item.createdAt)}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMediaEntry(item.id)}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mediaContainer}>
            <View style={[styles.mediaBadge, { 
              backgroundColor: item.type === 'video' ? '#4CAF50' : '#2196F3'
            }]}>
              <Text style={styles.mediaEmoji}>
                {item.type === 'video' ? '📹' : '🎤'}
              </Text>
              <Text style={styles.mediaText}>
                {item.type === 'video' ? 'Vidéo' : 'Audio'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => playMedia(item)}
            >
              <Text style={styles.playButtonText}>▶ Lire</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Render mood entry
    const mood = moods[item.mood];
    if (!mood) return null;
    
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
          Vous pouvez enregistrer une vidéo ou un audio de votre journée
        </Text>
        
        <View style={styles.recordButtonsContainer}>
          <TouchableOpacity
            style={[styles.mediaButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => startRecording('video')}
          >
            <Text style={styles.mediaButtonText}>📹 Enregistrer une Vidéo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.mediaButton, { backgroundColor: '#2196F3' }]}
            onPress={() => startRecording('audio')}
          >
            <Text style={styles.mediaButtonText}>🎤 Enregistrer un Audio</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { marginTop: 20 }]}
          onPress={() => navigation.navigate('Accueil')}
        >
          <Text style={styles.addButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>

        {renderMediaRecorderModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {entries.length} entrée{entries.length > 1 ? 's' : ''} trouvée{entries.length > 1 ? 's' : ''}
        </Text>
        
        <View style={styles.mediaButtonsRow}>
          <TouchableOpacity
            style={[styles.smallMediaButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => startRecording('video')}
          >
            <Text style={styles.smallMediaButtonText}>📹 Vidéo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallMediaButton, { backgroundColor: '#2196F3' }]}
            onPress={() => startRecording('audio')}
          >
            <Text style={styles.smallMediaButtonText}>🎤 Audio</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id ? String(item.id) : item.date || String(Math.random())}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {renderMediaRecorderModal()}
    </View>
  );
};

const styles = StyleSheet.create({  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    position: 'relative',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 15,
    backgroundColor: '#f44336',
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },  recordButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 30,
    elevation: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    width: 180,
    alignItems: 'center',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 15,
  },
  mediaButton: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 10,
  },
  mediaButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallMediaButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  smallMediaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mediaEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  mediaText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  playButton: {
    backgroundColor: '#4a5568',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GalerieScreen;