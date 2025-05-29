import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Firebase - Remplacez par vos propres clés
const firebaseConfig = {
  apiKey: "AIzaSyAuPD16Y_az7SO-g5slYbRU77CgRtaSv7M",
  authDomain: "personaljournal-54992.firebaseapp.com",
  projectId: "personaljournal-54992",
  storageBucket: "personaljournal-54992.firebasestorage.app",
  messagingSenderId: "868194774555",
  appId: "1:868194774555:web:a14418890f19131f9412be",
  measurementId: "G-HTKT5R8LJM"
};



// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Auth avec persistance AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialiser Firestore
const db = getFirestore(app);

export { auth, db };
export default app;