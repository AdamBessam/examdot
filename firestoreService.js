import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

class FirestoreService {
  // Collection des entrées de journal
  static COLLECTION_NAME = 'journalEntries';

  // Sauvegarder une entrée
  static async saveEntry(userId, entry) {
    try {
      const entryRef = doc(db, this.COLLECTION_NAME, `${userId}_${entry.date}`);
      await setDoc(entryRef, {
        ...entry,
        userId,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer une entrée spécifique
  static async getEntry(userId, date) {
    try {
      const entryRef = doc(db, this.COLLECTION_NAME, `${userId}_${date}`);
      const entrySnap = await getDoc(entryRef);
      
      if (entrySnap.exists()) {
        return { success: true, data: entrySnap.data() };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer toutes les entrées d'un utilisateur
  static async getUserEntries(userId) {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const entries = [];
      
      querySnapshot.forEach((doc) => {
        entries.push(doc.data());
      });
      
      return { success: true, data: entries };
    } catch (error) {
      console.error('Erreur lors de la récupération des entrées:', error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer une entrée
  static async deleteEntry(userId, date) {
    try {
      const entryRef = doc(db, this.COLLECTION_NAME, `${userId}_${date}`);
      await deleteDoc(entryRef);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les dates avec des entrées pour le calendrier
  static async getMarkedDates(userId) {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const markedDates = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        markedDates[data.date] = {
          marked: true,
          dotColor: '#6366f1',
          selectedColor: '#6366f1',
        };
      });
      
      return { success: true, data: markedDates };
    } catch (error) {
      console.error('Erreur lors de la récupération des dates:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FirestoreService;