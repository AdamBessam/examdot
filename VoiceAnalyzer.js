// VoiceAnalyzer.js - Implémentation réelle pour Expo
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import EmotionAnalyzer from './EmotionAnalyzer';

class VoiceAnalyzer {
  static recording = null;
  static sound = null;
  static audioDirectory = FileSystem.documentDirectory + 'audio/';

  // Méthode pour créer le dossier audio
  static async ensureAudioDirectoryExists() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.audioDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.audioDirectory, { intermediates: true });
      }
      return { success: true };
    } catch (error) {
      console.error('Erreur création dossier audio:', error);
      return { success: false, error: error.message };
    }
  }

  // Configuration Audio pour Expo
  static async initializeAudio() {
    try {
      // Demander les permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, message: 'Permission microphone requise' };
      }

      // Configuration du mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur initialisation audio:', error);
      return { success: false, error: error.message };
    } finally {
      // Optional cleanup if needed
    }
  }

  // MÉTHODE 1: Enregistrement + Google Speech API (GRATUIT 60min/mois)
  static async startRecording() {
    try {
      // S'assurer que le dossier audio existe
      await this.ensureAudioDirectoryExists();
      
      console.log('Démarrage enregistrement...');
      
      // Générer un nom de fichier unique avec timestamp
      const fileName = `recording_${Date.now()}.m4a`;
      const fileUri = this.audioDirectory + fileName;
        const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      return { success: true };
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      return { success: false, error: error.message };
    }
  }

  static async stopRecording() {
    try {
      if (!this.recording) {
        throw new Error('Aucun enregistrement en cours');
      }

      console.log('Arrêt enregistrement...');
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      this.recording = null;
      
      return { success: true, uri: uri };
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
      return { success: false, error: error.message };
    }
  }

  // MÉTHODE 2: Web Speech API pour Expo Web
  static async transcribeWithWebSpeech() {
    return new Promise((resolve) => {
      // Vérifier si on est sur le web
      if (typeof window === 'undefined') {
        resolve({ success: false, error: 'Web Speech API disponible uniquement sur le web' });
        return;
      }

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve({ success: false, error: 'API Speech Recognition non supportée' });
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 1;

      let timeoutId = setTimeout(() => {
        recognition.stop();
        resolve({ success: false, error: 'Timeout - aucune parole détectée' });
      }, 10000); // 10 secondes de timeout

      recognition.onresult = (event) => {
        clearTimeout(timeoutId);
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence || 0.8;
        
        resolve({
          success: true,
          transcription: transcript,
          confidence: confidence
        });
      };

      recognition.onerror = (event) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Erreur reconnaissance: ${event.error}`
        });
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
      };

      try {
        recognition.start();
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({ success: false, error: error.message });
      }
    });
  }

  // MÉTHODE 3: Google Speech-to-Text API (GRATUIT 60min/mois)
  static async transcribeWithGoogleAPI(audioUri, apiKey) {
    try {
      // Lire le fichier audio
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'MP3', // ou 'M4A'
            sampleRateHertz: 44100,
            languageCode: 'fr-FR',
            enableAutomaticPunctuation: true,
            model: 'latest_short',
            useEnhanced: true,
          },
          audio: {
            content: audioBase64
          }
        })
      });      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      if (result.results && result.results.length > 0) {
        const transcript = result.results[0].alternatives[0].transcript;
        const confidence = result.results[0].alternatives[0].confidence || 0.8;
        
        return {
          success: true,
          transcription: transcript,
          confidence: confidence
        };
      } else {
        return {
          success: false,
          error: 'Aucune transcription trouvée'
        };
      }
    } catch (error) {
      console.error('Erreur Google API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // MÉTHODE 4: AssemblyAI (GRATUIT 5h/mois)
  static async transcribeWithAssemblyAI(audioUri, apiKey) {
    try {
      console.log('Début transcription avec AssemblyAI, URI:', audioUri);
      
      // Vérifier si le fichier existe et obtenir sa taille
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Le fichier audio n\'existe pas');
      }

      // Vérifier l'extension du fichier
      if (!audioUri.toLowerCase().endsWith('.m4a')) {
        throw new Error('Format de fichier non supporté. Seuls les fichiers .m4a sont acceptés');
      }
      
      if (fileInfo.size === 0) {
        throw new Error('Le fichier audio est vide');
      }
      
      console.log('Taille du fichier audio:', fileInfo.size, 'bytes');

      // Upload vers AssemblyAI en utilisant FileSystem.uploadAsync
      const uploadResponse = await FileSystem.uploadAsync(
        'https://api.assemblyai.com/v2/upload',
        audioUri,
        {
          headers: {
            'authorization': apiKey,
            'content-type': 'audio/x-m4a',
            'transfer-encoding': 'chunked'
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
        }
      );

      console.log('Statut de l\'upload:', uploadResponse.status);
      
      if (uploadResponse.status !== 200) {
        const errorText = uploadResponse.body;
        console.error('Erreur upload:', errorText);
        throw new Error(`Erreur upload audio: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = JSON.parse(uploadResponse.body);
      console.log('Résultat de l\'upload:', uploadResult);
      
      if (!uploadResult.upload_url) {
        throw new Error('URL d\'upload manquante dans la réponse');
      }

      // 2. Demande de transcription
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: uploadResult.upload_url,
          language_code: 'fr',
          punctuate: true,
          format_text: true,
          webhook_url: null
        })
      });
      
      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        throw new Error(`Erreur de transcription: ${transcriptResponse.status} - ${errorText}`);
      }
      
      const transcriptResult = await transcriptResponse.json();
      
      if (!transcriptResult.id) {
        console.error('Erreur transcription:', transcriptResult);
        throw new Error('Erreur lors de la création de la transcription');
      }

      console.log('Transcription créée, ID:', transcriptResult.id);
      console.log('Attente du résultat...');
      
      // 3. Polling pour récupérer le résultat
      const transcript = await this.pollAssemblyAI(transcriptResult.id, apiKey);
      
      if (!transcript.text) {
        throw new Error('Transcription vide');
      }

      console.log('Texte transcrit:', transcript.text);
      console.log('Transcription terminée avec succès');
      
      return {
        success: true,
        transcription: transcript.text,
        confidence: transcript.confidence || 0.8
      };
    } catch (error) {
      console.error('Erreur AssemblyAI:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async pollAssemblyAI(transcriptId, apiKey, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`Tentative de récupération ${i + 1}/${maxAttempts}...`);
      
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': apiKey
        }
      });
      
      const result = await response.json();
      
      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(result.error);
      }
      
      // Attendre 2 secondes avant le prochain essai
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Timeout - transcription trop longue');
  }

  // Analyse audio basique avec les métadonnées Expo
  static async analyzeAudioFeatures(audioUri) {
    try {
      // Charger le son pour obtenir les métadonnées
      const { sound, status } = await Audio.Sound.createAsync({ uri: audioUri });
      
      if (status.isLoaded) {
        const duration = status.durationMillis / 1000; // en secondes
        
        // Analyse basique basée sur la durée et les métadonnées
        const estimatedWords = duration * 2.5; // ~2.5 mots/seconde
        const speechRate = (estimatedWords / duration) * 60; // mots/minute
        
        // Décharger le son
        await sound.unloadAsync();
        
        return {
          duration: duration,
          estimatedSpeechRate: speechRate,
          energyLevel: duration > 5 ? 0.7 : 0.5, // Plus long = plus d'énergie supposée
          detectedStress: speechRate > 160, // Débit rapide = stress potentiel
          confidence: 0.6,
          silenceRatio: 0.1, // Valeur par défaut
          averageIntensity: 0.3 // Valeur par défaut
        };
      } else {
        return this.getFallbackAudioFeatures();
      }
    } catch (error) {
      console.error('Erreur analyse audio:', error);
      return this.getFallbackAudioFeatures();
    }
  }

  static getFallbackAudioFeatures() {
    return {
      duration: 3,
      estimatedSpeechRate: 130,
      energyLevel: 0.5,
      detectedStress: false,
      confidence: 0.4,
      silenceRatio: 0.15,
      averageIntensity: 0.25
    };
  }

  // Méthode principale pour Expo
  static async analyzeVoiceEntry(audioUri = null, existingText = '', options = {}) {
    try {
      const {
        method = 'web', // 'web', 'google', 'assemblyai'
        googleApiKey = null,
        assemblyApiKey = null
      } = options;

      let transcriptionResult;

      // Choisir la méthode selon les options
      switch (method) {
        case 'web':
          transcriptionResult = await this.transcribeWithWebSpeech();
          break;
          
        case 'google':
          if (!googleApiKey) {
            throw new Error('Clé API Google requise');
          }
          if (!audioUri) {
            throw new Error('URI audio requise pour Google API');
          }
          transcriptionResult = await this.transcribeWithGoogleAPI(audioUri, googleApiKey);
          break;
          
        case 'assemblyai':
          if (!assemblyApiKey) {
            throw new Error('Clé API AssemblyAI requise');
          }
          if (!audioUri) {
            throw new Error('URI audio requise pour AssemblyAI');
          }
          transcriptionResult = await this.transcribeWithAssemblyAI(audioUri, assemblyApiKey);
          break;
          
        default:
          throw new Error('Méthode non supportée');
      }

      if (!transcriptionResult.success) {
        return {
          success: false,
          error: transcriptionResult.error
        };
      }

      // Combiner avec le texte existant
      const fullText = existingText + ' ' + transcriptionResult.transcription;
      
      // Analyse émotionnelle
      const emotionAnalysis = EmotionAnalyzer.analyzeText(fullText.trim());
      
      // Analyse audio (si URI fournie)
      let voiceFeatures = this.getFallbackAudioFeatures();
      if (audioUri) {
        voiceFeatures = await this.analyzeAudioFeatures(audioUri);
      }
      
      return {
        success: true,
        transcription: transcriptionResult.transcription,
        confidence: transcriptionResult.confidence,
        fullText: fullText.trim(),
        emotionAnalysis: emotionAnalysis,
        voiceFeatures: voiceFeatures,
        combinedScore: this.calculateCombinedScore(emotionAnalysis, voiceFeatures)
      };
      
    } catch (error) {
      console.error('Erreur analyse vocale:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculer un score combiné (inchangé)
  static calculateCombinedScore(emotionAnalysis, voiceFeatures) {
    const textScore = emotionAnalysis.overallScore;
    const voiceScore = this.getVoiceEmotionScore(voiceFeatures);
    
    const combinedScore = (textScore * 0.7) + (voiceScore * 0.3);
    
    return {
      textScore: textScore,
      voiceScore: voiceScore,
      combinedScore: Math.round(combinedScore * 100) / 100,
      confidence: (emotionAnalysis.keywords.length > 0 ? 0.8 : 0.5) * voiceFeatures.confidence
    };
  }

  static getVoiceEmotionScore(voiceFeatures) {
    let score = 0;
    
    if (voiceFeatures.energyLevel > 0.7) score += 1;
    if (voiceFeatures.estimatedSpeechRate > 140) score += 0.5;
    if (voiceFeatures.estimatedSpeechRate < 100) score -= 0.5;
    if (voiceFeatures.detectedStress) score -= 1;
    if (voiceFeatures.averageIntensity > 0.4) score += 0.5;
    if (voiceFeatures.silenceRatio > 0.3) score -= 0.5;
    
    return Math.max(-3, Math.min(3, score));
  }

  // Utiliser la synthèse vocale d'Expo pour les retours
  static async speakFeedback(text, language = 'fr') {
    try {
      const isAvailable = await Speech.isSpeakingAsync();
      if (isAvailable) {
        await Speech.stop();
      }
      
      await Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
        quality: Speech.VoiceQuality.Enhanced
      });
    } catch (error) {
      console.error('Erreur synthèse vocale:', error);
    }
  }

  // Nettoyage des ressources
  static async cleanup() {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      await Speech.stop();
    } catch (error) {
      console.error('Erreur nettoyage:', error);
    }
  }
}

export default VoiceAnalyzer;