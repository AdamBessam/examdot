import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { uploadToCloudinary } from '../utils/cloudinaryConfig';
import * as FileSystem from 'expo-file-system';

const MediaRecorder = ({ onRecordingComplete, initialRecordingType }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  
  const cameraRef = useRef(null);
  const recordingRef = useRef(null);
  const uploadTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('MediaRecorder: Component mounted, requesting permissions...');
    initializePermissions();
  }, []);

  // Handle initial recording type after permissions are ready
  useEffect(() => {
    if (permissionsReady && initialRecordingType && !isRecording) {
      console.log('MediaRecorder: Auto-starting recording type:', initialRecordingType);
      setTimeout(() => {
        handleRecordingTypeSelection(initialRecordingType);
      }, 500);
    }
  }, [permissionsReady, initialRecordingType]);

  const initializePermissions = async () => {
    try {
      console.log('MediaRecorder: Initializing permissions...');
      
      // Request all permissions
      const [cameraResult, micResult, libraryResult] = await Promise.all([
        cameraPermission?.granted ? Promise.resolve(cameraPermission) : requestCameraPermission(),
        microphonePermission?.granted ? Promise.resolve(microphonePermission) : requestMicrophonePermission(),
        MediaLibrary.requestPermissionsAsync()
      ]);
      
      setMediaLibraryPermission(libraryResult);
      
      const allGranted = cameraResult?.granted && micResult?.granted && libraryResult?.status === 'granted';
      console.log('MediaRecorder: Permissions result:', { 
        camera: cameraResult?.granted, 
        microphone: micResult?.granted, 
        library: libraryResult?.status,
        allGranted 
      });
      
      if (allGranted) {
        setPermissionsReady(true);
      } else {
        Alert.alert(
          "Permissions requises",
          "Les permissions caméra, microphone et galerie sont nécessaires pour utiliser cette fonctionnalité.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('MediaRecorder: Error requesting permissions:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir les permissions nécessaires');
    }
  };

  const hasAllPermissions = () => {
    return cameraPermission?.granted === true && 
           microphonePermission?.granted === true && 
           mediaLibraryPermission?.status === 'granted';
  };

  const handleRecordingTypeSelection = (type) => {
    console.log('MediaRecorder: Selected recording type:', type);
    
    if (!hasAllPermissions()) {
      Alert.alert('Erreur', 'Permissions non accordées');
      return;
    }

    setRecordingType(type);
    
    if (type === 'video') {
      // Show camera immediately and start recording
      setShowCamera(true);
    } else if (type === 'audio') {
      // Start audio recording directly
      startAudioRecording();
    }
  };

  const startAudioRecording = async () => {
    try {
      console.log('MediaRecorder: Starting audio recording...');
      setIsRecording(true);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      await recording.startAsync();
      
      console.log('MediaRecorder: Audio recording started successfully');
    } catch (error) {
      console.error('MediaRecorder: Error starting audio recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement audio: ' + error.message);
      resetStates();
    }
  };

  const stopAudioRecording = async () => {
    try {
      console.log('MediaRecorder: Stopping audio recording...');
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        console.log('MediaRecorder: Audio stopped, URI:', uri);
        return uri;
      }
    } catch (error) {
      console.error('MediaRecorder: Error stopping audio recording:', error);
      throw error;
    }
  };

  const startVideoRecording = async () => {
    try {
      console.log('MediaRecorder: Starting video recording...');
      
      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      setIsRecording(true);

      const videoOptions = {
        maxDuration: 60,
        quality: '1080p', // Use string instead of VideoQuality.HD
      };

      console.log('MediaRecorder: Starting video recording with options:', videoOptions);
      
      // Use recordAsync instead of startRecordingAsync
      const result = await cameraRef.current.recordAsync(videoOptions);
      console.log('MediaRecorder: Video recording completed:', result);
      
      return result;
    } catch (error) {
      console.error('MediaRecorder: Error in video recording:', error);
      throw error;
    }
  };

  const stopVideoRecording = async () => {
    try {
      console.log('MediaRecorder: Stopping video recording...');
      
      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      // For recordAsync, we don't need to explicitly stop - it stops automatically
      // This method might not be needed, but keeping for compatibility
      console.log('MediaRecorder: Video recording will stop automatically');
      
    } catch (error) {
      console.error('MediaRecorder: Error stopping video recording:', error);
      throw error;
    }
  };

  const handleStartRecording = async () => {
    try {
      if (recordingType === 'video') {
        const result = await startVideoRecording();
        if (result?.uri) {
          await handleMediaUpload(result.uri);
        }
      } else if (recordingType === 'audio') {
        // Audio recording is already started in handleRecordingTypeSelection
        console.log('MediaRecorder: Audio recording already in progress');
      }
    } catch (error) {
      console.error('MediaRecorder: Error starting recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement: ' + error.message);
      resetStates();
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log('MediaRecorder: Stopping recording...');
      
      if (recordingType === 'video') {
        await stopVideoRecording();
        // The video result will be handled by the startVideoRecording promise
      } else if (recordingType === 'audio') {
        const uri = await stopAudioRecording();
        if (uri) {
          await handleMediaUpload(uri);
        }
      }
    } catch (error) {
      console.error('MediaRecorder: Error stopping recording:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement: ' + error.message);
      resetStates();
    }
  };

  const verifyFileExists = async (uri, maxRetries = 3) => {
    if (!uri) return false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`MediaRecorder: Verifying file (attempt ${attempt}):`, uri);
        const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
        
        if (fileInfo.exists && fileInfo.size > 0) {
          console.log(`MediaRecorder: File verified: ${fileInfo.size} bytes`);
          return true;
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`MediaRecorder: Error verifying file (attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    return false;
  };

  const handleMediaUpload = async (uri) => {
    if (!uri) {
      Alert.alert('Erreur', 'Fichier non trouvé');
      return;
    }

    try {
      setIsUploading(true);
      console.log('MediaRecorder: Starting upload process:', uri);
      
      // Set upload timeout
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
      
      uploadTimeoutRef.current = setTimeout(() => {
        console.error('MediaRecorder: Upload timeout');
        Alert.alert('Erreur', 'Délai d\'upload dépassé');
        resetStates();
      }, 90000);

      setUploadProgress('Vérification du fichier...');
      const fileExists = await verifyFileExists(uri);
      if (!fileExists) {
        throw new Error('Fichier non trouvé ou vide');
      }
      
      setUploadProgress('Sauvegarde locale...');
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('MediaRecorder: Saved to MediaLibrary:', asset.id);
      
      setUploadProgress('Upload vers le cloud...');
      const today = new Date();
      const folder = `journal/${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const cloudinaryUrl = await uploadToCloudinary(uri, folder);
      
      if (!cloudinaryUrl) {
        throw new Error('Upload échoué');
      }
      
      console.log('MediaRecorder: Upload successful:', cloudinaryUrl);
      
      if (onRecordingComplete) {
        onRecordingComplete(cloudinaryUrl, recordingType);
      }
      
      Alert.alert('Succès', `${recordingType === 'video' ? 'Vidéo' : 'Audio'} sauvegardé avec succès !`);
      
    } catch (error) {
      console.error('MediaRecorder: Upload error:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder: ' + error.message);
    } finally {
      // Cleanup
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
      
      try {
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('MediaRecorder: Temporary file deleted');
        }
      } catch (cleanupError) {
        console.error('MediaRecorder: Cleanup error:', cleanupError);
      }
      
      resetStates();
    }
  };

  const resetStates = () => {
    console.log('MediaRecorder: Resetting states');
    setIsRecording(false);
    setRecordingType(null);
    setIsUploading(false);
    setUploadProgress('');
    setShowCamera(false);
    
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(console.error);
      recordingRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
  };

  const handleCameraReady = () => {
    console.log('MediaRecorder: Camera is ready');
    // Auto-start recording if this is for initial video recording
    if (recordingType === 'video' && !isRecording) {
      setTimeout(() => {
        handleStartRecording();
      }, 500);
    }
  };

  // Show loading while permissions are being initialized
  if (!permissionsReady) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.messageText}>Initialisation...</Text>
        <Text style={styles.subMessageText}>Vérification des permissions</Text>
      </View>
    );
  }

  // Show upload progress
  if (isUploading) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.messageText}>Sauvegarde en cours...</Text>
        <Text style={styles.subMessageText}>
          {uploadProgress || 'Veuillez patienter...'}
        </Text>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={resetStates}
        >
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show permissions error
  if (!hasAllPermissions()) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Permissions requises</Text>
        <Text style={styles.subMessageText}>
          Caméra, microphone et galerie requis
        </Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={initializePermissions}
        >
          <Text style={styles.buttonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show camera view for video recording
  if (showCamera && recordingType === 'video') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          video={true}
          audio={true}
          onCameraReady={handleCameraReady}
          onMountError={(error) => {
            console.error('MediaRecorder: Camera mount error:', error);
            Alert.alert('Erreur', 'Impossible d\'initialiser la caméra');
            resetStates();
          }}
        />
        
        <View style={styles.cameraControls}>
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingText}>
              {isRecording ? '🔴 Enregistrement vidéo...' : '📹 Prêt à enregistrer'}
            </Text>
          </View>
          
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.button, styles.flipButton]}
              onPress={toggleCameraFacing}
              disabled={isRecording}
            >
              <Text style={styles.buttonText}>🔄</Text>
            </TouchableOpacity>
            
            {!isRecording ? (
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={handleStartRecording}
              >
                <Text style={styles.buttonText}>Démarrer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopRecording}
              >
                <Text style={styles.buttonText}>Arrêter</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={resetStates}
              disabled={isRecording}
            >
              <Text style={styles.buttonText}>❌</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show audio recording interface
  if (recordingType === 'audio') {
    return (
      <View style={styles.messageContainer}>
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>🎤 Enregistrement audio</Text>
          <Text style={styles.recordingSubText}>Parlez maintenant...</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={handleStopRecording}
        >
          <Text style={styles.buttonText}>Arrêter l'enregistrement</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={resetStates}
        >
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show main selection interface
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, styles.startButton]}
        onPress={() => handleRecordingTypeSelection('video')}
      >
        <Text style={styles.buttonText}>📹 Enregistrer Vidéo</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.startButton]}
        onPress={() => handleRecordingTypeSelection('audio')}
      >
        <Text style={styles.buttonText}>🎤 Enregistrer Audio</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  subMessageText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 30,
  },
  button: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: '#4CAF50',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    minWidth: 200,
  },
  stopButton: {
    backgroundColor: '#f44336',
    flex: 1,
  },
  flipButton: {
    backgroundColor: '#2196F3',
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 10,
  },
  cancelButton: {
    backgroundColor: '#ff9800',
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recordingSubText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default MediaRecorder;