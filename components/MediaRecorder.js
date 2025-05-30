import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, VideoQuality } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { uploadToCloudinary } from '../utils/cloudinaryConfig';
import * as FileSystem from 'expo-file-system';

const MediaRecorder = ({ onRecordingComplete, initialRecordingType }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(initialRecordingType || null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [uploadProgress, setUploadProgress] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [pendingVideoRecording, setPendingVideoRecording] = useState(false);
  
  const cameraRef = useRef(null);
  const recordingRef = useRef(null);
  const isProcessingRef = useRef(false);
  const uploadTimeoutRef = useRef(null);
  const videoRecordingPromiseRef = useRef(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  // Fixed: Better handling of initial recording type with proper camera initialization wait
  useEffect(() => {
    if (initialRecordingType && permissionsLoaded && hasAllPermissions() && !isProcessingRef.current) {
      console.log('Preparing to start recording with type:', initialRecordingType);
      
      if (initialRecordingType === 'audio') {
        // Audio can start immediately
        setTimeout(() => {
          handleStartRecording(initialRecordingType);
        }, 100);
      } else if (initialRecordingType === 'video') {
        // Video needs to wait for camera initialization
        setRecordingType('video');
        setPendingVideoRecording(true);
        console.log('Video recording pending camera initialization...');
      }
    }
  }, [initialRecordingType, permissionsLoaded]);

  // New effect: Handle pending video recording when camera becomes ready
  useEffect(() => {
    if (pendingVideoRecording && isCameraReady && hasAllPermissions() && !isProcessingRef.current) {
      console.log('Camera is ready, starting pending video recording...');
      setPendingVideoRecording(false);
      handleStartRecording('video');
    }
  }, [pendingVideoRecording, isCameraReady]);

  const hasAllPermissions = () => {
    return cameraPermission?.granted === true && 
           microphonePermission?.granted === true && 
           mediaLibraryPermission?.status === 'granted';
  };

  const requestPermissions = async () => {
    try {
      console.log('Requesting permissions...');
      
      // Request camera permission
      let cameraResult = cameraPermission;
      if (!cameraPermission?.granted) {
        console.log('Requesting camera permission...');
        cameraResult = await requestCameraPermission();
      }
      
      // Request microphone permission
      let micResult = microphonePermission;
      if (!microphonePermission?.granted) {
        console.log('Requesting microphone permission...');
        micResult = await requestMicrophonePermission();
      }
      
      // Request media library permission
      const { status: libraryStatus } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission({ status: libraryStatus });
      
      console.log('Permissions result:', { 
        camera: cameraResult?.granted, 
        microphone: micResult?.granted, 
        library: libraryStatus 
      });
      
      setPermissionsLoaded(true);
      
      const allGranted = cameraResult?.granted && micResult?.granted && libraryStatus === 'granted';
      
      if (!allGranted) {
        Alert.alert(
          "Permissions requises",
          "Les permissions caméra et microphone sont nécessaires pour utiliser cette fonctionnalité.",
          [{ text: "OK" }]
        );
      }
      return allGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionsLoaded(true);
      return false;
    }
  };

  const startAudioRecording = async () => {
    try {
      console.log('Starting audio recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      await recording.startAsync();
      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  };

  const stopAudioRecording = async () => {
    try {
      console.log('Stopping audio recording...');
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        console.log('Audio recording stopped, URI:', uri);
        return uri;
      }
    } catch (error) {
      console.error('Error stopping audio recording:', error);
      throw error;
    }
  };

  const startVideoRecording = async () => {
    try {
      console.log('Starting video recording...');
      if (!cameraRef.current) {
        throw new Error('Camera not ready - camera reference not found');
      }
      
      if (!isCameraReady) {
        throw new Error('Camera not initialized - please wait for camera to initialize fully');
      }

      console.log('Camera is ready, preparing to record...');

      // Create video options with proper configuration for CameraView API
      const videoOptions = {
        maxDuration: 60, // maximum duration in seconds
        quality: VideoQuality.HD,
        flash: 'off',
        mirror: false,
      };

      console.log('Starting video recording with options:', videoOptions);
      
      // Start recording using the CameraView API
      videoRecordingPromiseRef.current = cameraRef.current.startRecordingAsync(videoOptions);
      
      console.log('Video recording started successfully');
      return true;
    } catch (error) {
      console.error('Error starting video recording:', error);
      videoRecordingPromiseRef.current = null; // Clear the promise ref on error
      throw error;
    }
  };

  const handleStartRecording = async (type) => {
    try {
      console.log('handleStartRecording called with type:', type);
      
      if (isProcessingRef.current) {
        console.log('Already processing, ignoring request');
        return;
      }

      if (!hasAllPermissions()) {
        console.log('Permissions not granted, requesting...');
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            "Permissions nécessaires",
            "Veuillez autoriser l'accès au micro et à la caméra pour continuer",
            [{ text: "OK" }]
          );
          return;
        }
      }

      isProcessingRef.current = true;
      setRecordingType(type);
      setIsRecording(true);

      if (type === 'audio') {
        await startAudioRecording();
        isProcessingRef.current = false; // Reset for audio since it starts immediately
      } else if (type === 'video') {
        if (!isCameraReady) {
          console.log('Camera not ready yet, will start recording when ready');
          // Don't throw error, just wait for camera to be ready
          // The useEffect will handle starting the recording when camera is ready
          isProcessingRef.current = false;
          return;
        }
        // Start video recording immediately if camera is ready
        await startVideoRecording();
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement: ' + error.message);
      resetStates();
    }
  };

  const verifyFileExists = async (uri, maxRetries = 5) => {
    if (!uri) {
      console.error('No URI provided to verifyFileExists');
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Checking file existence (attempt ${attempt}/${maxRetries}):`, uri);
        
        const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
        console.log('File info:', fileInfo);
        
        if (!fileInfo.exists) {
          console.log(`File does not exist yet (attempt ${attempt})`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            continue;
          }
          return false;
        }
        
        if (fileInfo.size === 0) {
          console.log(`File exists but is empty (attempt ${attempt})`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return false;
        }
        
        console.log(`✓ File verified: ${fileInfo.size} bytes`);
        return true;
      } catch (error) {
        console.error(`Error checking file existence (attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return false;
      }
    }
    return false;
  };

  const handleStopRecording = async () => {
    console.log('Attempting to stop recording...');
    
    try {
      if (recordingType === 'video') {
        if (!videoRecordingPromiseRef.current) {
          throw new Error('No active video recording found');
        }

        if (!isRecording) {
          throw new Error('Recording is not active');
        }

        setUploadProgress('Arrêt de l\'enregistrement...');
        console.log('Stopping video recording...');
        
        try {
          // Stop recording using the new CameraView API
          if (!cameraRef.current) {
            throw new Error('Camera reference lost');
          }

          console.log('Stopping video recording and waiting for file...');
          await cameraRef.current.stopRecordingAsync();
          
          // Wait for the recording promise to resolve with the video file
          const recordingResult = await videoRecordingPromiseRef.current;
          console.log('Recording promise resolved:', recordingResult);
          
          // Clear the promise ref immediately
          videoRecordingPromiseRef.current = null;
          
          if (!recordingResult?.uri) {
            throw new Error('No video file URI in recording result');
          }
          
          // Wait a short moment for the file system to complete writing
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('Video recording stopped successfully, URI:', recordingResult.uri);
          
          // Handle the media upload
          await handleMediaUpload(recordingResult.uri);
        } catch (recordingError) {
          console.error('Error during video recording:', recordingError);
          // Provide more specific error message
          const errorMessage = recordingError.message || 'Unknown error occurred';
          throw new Error(`Video recording failed: ${errorMessage}`);
        }
        
      } else if (recordingType === 'audio') {
        const uri = await stopAudioRecording();
        if (uri) {
          await handleMediaUpload(uri);
        } else {
          throw new Error('Audio file not found after recording');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement: ' + error.message);
    } finally {
      resetStates();
    }
  };

  const onVideoRecordingStatusUpdate = (status) => {
    console.log('Video recording status:', status);
  };

  const handleMediaUpload = async (uri) => {
    if (!uri) {
      console.error('No URI provided to handleMediaUpload');
      Alert.alert('Erreur', 'Fichier non trouvé');
      return;
    }

    // Clear any existing timeout
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
    }

    // Set a global timeout for the entire upload process
    uploadTimeoutRef.current = setTimeout(() => {
      console.error('Upload process timed out');
      Alert.alert('Erreur', 'Délai d\'attente dépassé. L\'upload a été annulé.');
      resetStates();
    }, 90000); // 90 seconds timeout

    try {
      setIsUploading(true);
      console.log('Starting media upload process with URI:', uri);
      
      // Step 1: Verify file exists and is not empty
      setUploadProgress('Vérification du fichier...');
      console.log('Step 1: Verifying file exists...');
      const fileExists = await verifyFileExists(uri);
      if (!fileExists) {
        throw new Error('File not found or empty before upload');
      }
      console.log('✓ File verification completed');
      
      // Step 2: Save to MediaLibrary first
      setUploadProgress('Sauvegarde locale...');
      console.log('Step 2: Saving to MediaLibrary...');
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('✓ Saved to MediaLibrary:', asset.id);
      
      // Step 3: Upload to Cloudinary
      setUploadProgress('Upload vers le cloud...');
      console.log('Step 3: Preparing Cloudinary upload...');
      const today = new Date();
      const folder = `journal/${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      console.log('Step 4: Starting Cloudinary upload...');
      console.log('Upload params:', { uri, folder });
      
      const cloudinaryUrl = await uploadToCloudinary(uri, folder);
      
      if (!cloudinaryUrl) {
        throw new Error('Upload failed - no URL returned');
      }
      
      console.log('✓ Upload successful, URL:', cloudinaryUrl);
      
      // Step 5: Complete the process
      setUploadProgress('Finalisation...');
      console.log('Step 5: Completing upload process...');
      if (onRecordingComplete) {
        onRecordingComplete(cloudinaryUrl, recordingType);
      }
      
      Alert.alert('Succès', `${recordingType === 'video' ? 'Vidéo' : 'Audio'} sauvegardé avec succès !`);
      console.log('✓ Upload process completed successfully');
      
    } catch (error) {
      console.error('❌ Error in handleMediaUpload:', error.message);
      console.error('Full error:', error);
      
      // Clear timeout on error
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      
      // Show more specific error messages
      let errorMessage = 'Erreur inconnue';
      if (error.message.includes('timeout') || error.message.includes('Délai')) {
        errorMessage = 'Délai d\'attente dépassé. Vérifiez votre connexion internet.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Erreur de réseau. Vérifiez votre connexion internet.';
      } else if (error.message.includes('File not found')) {
        errorMessage = 'Fichier non trouvé après l\'enregistrement.';
      } else {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'enregistrement: ' + errorMessage);
    } finally {
      // Clear timeout
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      
      console.log('Starting cleanup process...');
      // Clean up temporary files
      try {
        if (uri) {
          console.log('Cleaning up file:', uri);
          const fileExists = await verifyFileExists(uri, 1); // Single check for cleanup
          
          if (fileExists) {
            console.log('Deleting temporary file...');
            await FileSystem.deleteAsync(uri, { idempotent: true });
            console.log('✓ Temporary file deleted successfully');
          }
        }
      } catch (cleanupError) {
        console.error('Error cleaning up files:', cleanupError);
      }
    }
  };

  const resetStates = () => {
    console.log('Resetting all states');
    setIsRecording(false);
    setRecordingType(null);
    setIsUploading(false);
    setUploadProgress('');
    setIsCameraReady(false);
    setPendingVideoRecording(false);
    isProcessingRef.current = false;
    
    // Clear any pending timeouts
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    
    // Clear video recording promise
    if (videoRecordingPromiseRef.current) {
      videoRecordingPromiseRef.current = null;
    }
  };

  const cancelUpload = () => {
    console.log('User cancelled upload');
    
    // Clear timeout
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    
    resetStates();
    Alert.alert('Annulé', 'Sauvegarde annulée par l\'utilisateur');
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
  };

  // Fixed: Better camera ready handling
  const handleCameraReady = async () => {
    console.log('Camera ready');
    setIsCameraReady(true);
  };

  useEffect(() => {
    return () => {
      // Cleanup function
      console.log('Component unmounting, cleaning up...');
      
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
      
      // Handle ongoing video recording
      if (videoRecordingPromiseRef.current) {
        console.log('Cleaning up ongoing video recording...');
        // Use IIFE for async cleanup
        (async () => {
          try {
            // Try to stop the recording gracefully
            if (cameraRef.current) {
              console.log('Stopping camera recording...');
              await cameraRef.current.stopRecording();
            }
            
            // Wait for the promise to resolve and clean up the file
            const result = await videoRecordingPromiseRef.current;
            if (result?.uri) {
              console.log('Cleaning up video file:', result.uri);
              await FileSystem.deleteAsync(result.uri, { idempotent: true });
            }
          } catch (error) {
            console.error('Error cleaning up video recording:', error);
          } finally {
            videoRecordingPromiseRef.current = null;
          }
        })();
      }
      
      // Handle audio recording
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
      
      resetStates();
    };
  }, []);

  // Show loading while permissions are being requested
  if (!permissionsLoaded) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.messageText}>Chargement des permissions...</Text>
      </View>
    );
  }

  if (isUploading) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.messageText}>Sauvegarde en cours...</Text>
        <Text style={styles.subMessageText}>
          {uploadProgress || 'Cela peut prendre quelques instants'}
        </Text>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={cancelUpload}
        >
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show camera initializing message when waiting for video recording
  if (pendingVideoRecording && !isCameraReady) {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.messageText}>Initialisation de la caméra...</Text>
        <Text style={styles.subMessageText}>Préparation de l'enregistrement vidéo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hasAllPermissions() ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Autorisations requises</Text>
          <Text style={styles.subMessageText}>
            Cette application a besoin d'accéder à votre caméra et microphone
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermissions}
          >
            <Text style={styles.buttonText}>Accorder les permissions</Text>
          </TouchableOpacity>
        </View>
      ) : recordingType === 'video' ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            video={true}
            audio={true}
            enableAudioEncoding={true}
            onCameraReady={handleCameraReady}
            onInitialized={() => {
              console.log('Camera initialized');
              setIsCameraReady(true);
            }}
            onMountError={(error) => {
              console.error('Camera mount error:', error);
              Alert.alert('Erreur', 'Impossible d\'initialiser la caméra');
              resetStates();
            }}
            onRecordingStatusUpdate={onVideoRecordingStatusUpdate}
          />
          <View style={styles.cameraControls}>
            <View style={styles.recordingIndicator}>
              <Text style={styles.recordingText}>
                {videoRecordingPromiseRef.current ? '🔴 Enregistrement vidéo...' : '⏳ Préparation...'}
              </Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.button, styles.flipButton]}
                onPress={toggleCameraFacing}
                disabled={isUploading || !isCameraReady}
              >
                <Text style={styles.buttonText}>🔄</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopRecording}
                disabled={isUploading || !videoRecordingPromiseRef.current}
              >
                <Text style={styles.buttonText}>
                  {isUploading ? 'Sauvegarde...' : 'Arrêter l\'enregistrement'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          {recordingType === 'audio' ? (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingText}>🎤 Enregistrement audio en cours...</Text>
                <Text style={styles.recordingSubText}>Parlez maintenant</Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopRecording}
                disabled={isUploading}
              >
                <Text style={styles.buttonText}>
                  {isUploading ? 'Sauvegarde...' : 'Arrêter'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => handleStartRecording('video')}
                disabled={isProcessingRef.current}
              >
                <Text style={styles.buttonText}>📹 Enregistrer Vidéo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => handleStartRecording('audio')}
                disabled={isProcessingRef.current}
              >
                <Text style={styles.buttonText}>🎤 Enregistrer Audio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
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
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  startButton: {
    backgroundColor: '#4CAF50',
    width: '80%',
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
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff9800',
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 15,
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