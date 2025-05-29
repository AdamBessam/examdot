import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmotionAnalyzer from './EmotionAnalyzer';
import VoiceAnalyzer from './VoiceAnalyzer';
import { MaterialIcons } from '@expo/vector-icons';

const HumeurScreen = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState(
    route?.params?.date || new Date().toISOString().split('T')[0]
  );
  const [moodScore, setMoodScore] = useState(5);
  const [note, setNote] = useState('');
  const [transcribedText, setTranscribedText] = useState(''); // Ajout de l'état pour le texte transcrit
  const [existingEntry, setExistingEntry] = useState(null);
  const [emotionAnalysis, setEmotionAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  useEffect(() => {
    loadExistingEntry();
  }, [selectedDate]);

  useEffect(() => {
    // Analyser le texte en temps réel avec un délai
    const timeoutId = setTimeout(() => {
      if (note.trim().length > 10) {
        analyzeText();
      } else {
        setEmotionAnalysis(null);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [note]);

  const loadExistingEntry = async () => {
    try {
      const entries = await AsyncStorage.getItem('journalEntries');
      if (entries) {
        const parsedEntries = JSON.parse(entries);
        if (parsedEntries[selectedDate]) {
          const entry = parsedEntries[selectedDate];
          setExistingEntry(entry);
          setMoodScore(entry.mood || 5);
          setNote(entry.note || '');
          
          // Si l'analyse existe déjà, la charger
          if (entry.emotionAnalysis) {
            setEmotionAnalysis(entry.emotionAnalysis);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'entrée:', error);
    }
  };

  const analyzeText = async () => {
    if (!note.trim()) return;
    
    setIsAnalyzing(true);
    try {
      // Simulation d'un délai pour l'analyse (comme si on appelait une API)
      setTimeout(() => {
        const analysis = EmotionAnalyzer.analyzeText(note);
        setEmotionAnalysis(analysis);
        setIsAnalyzing(false);
      }, 500);
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      setIsAnalyzing(false);
    }
  };

  const saveEntry = async () => {
    if (!note.trim()) {
      Alert.alert('Attention', 'Veuillez écrire quelque chose dans votre note');
      return;
    }

    try {
      const entries = await AsyncStorage.getItem('journalEntries');
      const parsedEntries = entries ? JSON.parse(entries) : {};

      // Analyser le texte final avant de sauvegarder
      const finalAnalysis = EmotionAnalyzer.analyzeText(note);

      const newEntry = {
        date: selectedDate,
        mood: moodScore,
        note: note.trim(),
        emotionAnalysis: finalAnalysis,
        timestamp: new Date().toISOString(),
        // Ajouter d'autres champs si nécessaire (audio, image, etc.)
      };

      parsedEntries[selectedDate] = newEntry;
      await AsyncStorage.setItem('journalEntries', JSON.stringify(parsedEntries));

      Alert.alert(
        'Succès', 
        existingEntry 
          ? 'Votre entrée a été mise à jour avec succès !' 
          : 'Votre entrée a été sauvegardée avec succès !',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder votre entrée');
    }
  };

  const startRecording = async () => {
    try {
      // Initialiser l'audio et vérifier les permissions
      const initResult = await VoiceAnalyzer.initializeAudio();
      if (!initResult.success) {
        Alert.alert('Erreur', 'Impossible d\'initialiser l\'enregistrement audio');
        return;
      }

      const result = await VoiceAnalyzer.startRecording();
      if (result.success) {
        setIsRecording(true);
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'enregistrement');
      console.error(error);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await VoiceAnalyzer.stopRecording();
      setIsRecording(false);
      
      if (result.success) {
        setAudioUri(result.uri);
        setIsProcessingAudio(true);
        setTranscribedText('Transcription en cours...');
        
        // Analyser l'audio avec AssemblyAI
        console.log('Envoi de l\'audio à AssemblyAI...');
        const analysis = await VoiceAnalyzer.analyzeVoiceEntry(result.uri, note, {
          method: 'assemblyai',
          assemblyApiKey: 'bd1ee0ebea2a4094869117350c8bf0a5'
        });
        
        if (analysis.success) {
          console.log('Transcription réussie:', analysis.transcription);
          
          // Mise à jour de l'interface avec le nouveau texte
          const newNote = note.trim() ? `${note.trim()} ${analysis.transcription}` : analysis.transcription;
          setNote(newNote);
          setTranscribedText(analysis.transcription);
          setEmotionAnalysis(analysis.emotionAnalysis);
          
          // Notification de succès
          Alert.alert('Succès', 'Audio transcrit avec succès !');
        } else {
          console.error('Erreur transcription:', analysis.error);
          setTranscribedText('Erreur de transcription');
          Alert.alert('Erreur', 'Impossible de transcrire l\'audio. Veuillez réessayer.');
        }
        
        setIsProcessingAudio(false);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'arrêt de l\'enregistrement');
      console.error(error);
      setIsRecording(false);
      setIsProcessingAudio(false);
    }
  };

  // Ajouter le nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      VoiceAnalyzer.cleanup();
    };
  }, []);

  const getMoodEmoji = (score) => {
    if (score <= 2) return '😢';
    if (score <= 4) return '😕';
    if (score <= 6) return '😐';
    if (score <= 8) return '🙂';
    return '😊';
  };

  const getMoodLabel = (score) => {
    if (score <= 2) return 'Très triste';
    if (score <= 4) return 'Triste';
    if (score <= 6) return 'Neutre';
    if (score <= 8) return 'Heureux';
    return 'Très heureux';
  };

  const renderEmotionAnalysis = () => {
    if (isAnalyzing) {
      return (
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisTitle}>🔄 Analyse en cours...</Text>
        </View>
      );
    }

    if (!emotionAnalysis || emotionAnalysis.dominantEmotion === 'neutre') {
      return null;
    }

    return (
      <View style={styles.analysisContainer}>
        <Text style={styles.analysisTitle}>
          {EmotionAnalyzer.getEmotionIcon(emotionAnalysis.dominantEmotion)} 
          Analyse Émotionnelle
        </Text>
        
        <View style={styles.emotionCard}>
          <View style={styles.emotionHeader}>
            <Text style={styles.emotionLabel}>Émotion dominante</Text>
            <Text style={styles.emotionValue}>
              {emotionAnalysis.dominantEmotion.charAt(0).toUpperCase() + 
               emotionAnalysis.dominantEmotion.slice(1)}
            </Text>
          </View>
          
          <View style={styles.sentimentContainer}>
            <Text style={styles.sentimentLabel}>Sentiment général</Text>
            <Text style={[
              styles.sentimentValue,
              { color: emotionAnalysis.overallScore >= 0 ? '#10b981' : '#ef4444' }
            ]}>
              {emotionAnalysis.sentiment}
            </Text>
          </View>

          {emotionAnalysis.keywords.length > 0 && (
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Mots-clés détectés :</Text>
              <View style={styles.keywordsList}>
                {emotionAnalysis.keywords.slice(0, 5).map((item, index) => (
                  <View key={index} style={[
                    styles.keywordTag,
                    { backgroundColor: EmotionAnalyzer.getEmotionColor(item.emotion) + '20' }
                  ]}>
                    <Text style={styles.keywordText}>{item.keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Comment vous sentez-vous aujourd'hui ?
          </Text>
          
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>

          {/* Sélecteur d'humeur */}
          <View style={styles.moodContainer}>
            <Text style={styles.moodEmoji}>{getMoodEmoji(moodScore)}</Text>
            <Text style={styles.moodLabel}>{getMoodLabel(moodScore)}</Text>
            
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              value={moodScore}
              onValueChange={setMoodScore}
              step={1}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e5e7eb"
              thumbStyle={styles.sliderThumb}
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>😢 Triste</Text>
              <Text style={styles.sliderLabel}>😊 Heureux</Text>
            </View>
          </View>

          {/* Zone de texte */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteTitle}>
              Que s'est-il passé ? Comment vous sentez-vous ?
            </Text>
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={8}
              placeholder="Écrivez vos pensées, vos sentiments, ou ce qui vous est arrivé aujourd'hui..."
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
          </View>

          {/* Analyse émotionnelle */}
          {renderEmotionAnalysis()}

          {/* Section d'enregistrement vocal */}
          <View style={styles.voiceContainer}>
            {/* Bouton d'enregistrement */}
            <View style={styles.voiceSection}>
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={24}
                  color="white"
                />
                <Text style={styles.recordButtonText}>
                  {isRecording ? "Arrêter" : "Enregistrer"}
                </Text>
              </TouchableOpacity>
              {isProcessingAudio && (
                <ActivityIndicator size="small" color="#2196f3" style={styles.loader} />
              )}
            </View>

            {/* Affichage du texte transcrit */}
            {(isRecording || transcribedText) && (
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionLabel}>
                  {isRecording ? "Enregistrement en cours..." : "Transcription :"}
                </Text>
                {transcribedText && (
                  <Text style={styles.transcriptionText}>{transcribedText}</Text>
                )}
              </View>
            )}
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveEntry}
            >
              <Text style={styles.saveButtonText}>
                {existingEntry ? 'Mettre à jour' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>

            {existingEntry && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'capitalize',
  },
  moodContainer: {
    backgroundColor: '#ffffff',
    padding: 25,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moodEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 10,
  },
  sliderThumb: {
    backgroundColor: '#6366f1',
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  noteContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 15,
  },
  noteInput: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  analysisContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 15,
    textAlign: 'center',
  },
  emotionCard: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 12,
  },
  emotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emotionLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  emotionValue: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: 'bold',
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sentimentLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  keywordsContainer: {
    marginTop: 10,
  },
  keywordsTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  keywordText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  actionContainer: {
    gap: 12,
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  voiceContainer: {
    marginVertical: 15,
    marginHorizontal: 15,
  },
  voiceSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  loader: {
    marginLeft: 10,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  recordButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  transcriptionContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  transcriptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1565c0',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 24,
  },
});

export default HumeurScreen;