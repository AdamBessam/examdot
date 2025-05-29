// EmotionAnalyzer.js - Service d'analyse émotionnelle simple
class EmotionAnalyzer {
  // Dictionnaire de mots-clés émotionnels (français)
  static emotionKeywords = {
    joie: {
      keywords: ['heureux', 'joyeux', 'content', 'ravi', 'euphori', 'enthousi', 'optimist', 'sourire', 'rire', 'amusant', 'fantastique', 'merveilleux', 'génial', 'super', 'excellent'],
      score: 2
    },
    tristesse: {
      keywords: ['triste', 'malheureux', 'déçu', 'mélancolie', 'chagrin', 'peine', 'sombre', 'déprim', 'pleurer', 'larmes', 'désespoir', 'abattu'],
      score: -2
    },
    colère: {
      keywords: ['colère', 'énervé', 'furieux', 'irrité', 'agacé', 'frustré', 'rage', 'mécontent', 'fâché', 'indigné', 'exaspéré'],
      score: -1
    },
    peur: {
      keywords: ['peur', 'anxieux', 'inquiet', 'stressé', 'nerveux', 'angoiss', 'effrayé', 'terrifié', 'paniq', 'préoccup'],
      score: -1
    },
    surprise: {
      keywords: ['surpris', 'étonné', 'stupéfait', 'choqué', 'impressionn', 'incroyable', 'inattendu'],
      score: 1
    },
    dégoût: {
      keywords: ['dégoût', 'écœur', 'répugn', 'horrible', 'nauséab', 'révolt'],
      score: -1
    },
    amour: {
      keywords: ['amour', 'aimer', 'affection', 'tendresse', 'passion', 'adorer', 'chérir', 'attachement'],
      score: 2
    },
    satisfaction: {
      keywords: ['satisfait', 'accompli', 'fier', 'réussi', 'victoire', 'succès', 'performance', 'achievement'],
      score: 1
    }
  };

  // Analyse du texte pour détecter les émotions
  static analyzeText(text) {
    if (!text || typeof text !== 'string') {
      return {
        dominantEmotion: 'neutre',
        emotions: {},
        overallScore: 0,
        keywords: []
      };
    }

    const textLower = text.toLowerCase();
    const emotions = {};
    const detectedKeywords = [];
    let totalScore = 0;

    // Analyse de chaque catégorie d'émotion
    Object.keys(this.emotionKeywords).forEach(emotion => {
      const { keywords, score } = this.emotionKeywords[emotion];
      let emotionCount = 0;

      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}`, 'gi');
        const matches = textLower.match(regex);
        if (matches) {
          emotionCount += matches.length;
          detectedKeywords.push({ keyword, emotion, count: matches.length });
        }
      });

      if (emotionCount > 0) {
        emotions[emotion] = {
          count: emotionCount,
          score: emotionCount * score,
          intensity: Math.min(emotionCount / 3, 1) // Normalisation 0-1
        };
        totalScore += emotionCount * score;
      }
    });

    // Déterminer l'émotion dominante
    const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
      emotions[a]?.intensity > emotions[b]?.intensity ? a : b, 'neutre'
    );

    return {
      dominantEmotion,
      emotions,
      overallScore: totalScore,
      keywords: detectedKeywords,
      sentiment: this.getSentimentLabel(totalScore)
    };
  }

  // Analyse de l'audio transcrit (simulation)
  static analyzeAudio(transcription) {
    // Dans une vraie implémentation, vous pourriez utiliser
    // des APIs comme Google Speech-to-Text ou Azure Cognitive Services
    return this.analyzeText(transcription);
  }

  // Obtenir le label de sentiment
  static getSentimentLabel(score) {
    if (score >= 3) return 'Très positif';
    if (score >= 1) return 'Positif';
    if (score >= -1) return 'Neutre';
    if (score >= -3) return 'Négatif';
    return 'Très négatif';
  }

  // Calculer les statistiques pour une période
  static calculatePeriodStats(entries) {
    if (!entries || entries.length === 0) {
      return {
        averageScore: 0,
        totalEntries: 0,
        emotionDistribution: {},
        trendData: [],
        mostFrequentEmotion: 'neutre'
      };
    }

    let totalScore = 0;
    const emotionCounts = {};
    const trendData = [];

    entries.forEach(entry => {
      const analysis = entry.emotionAnalysis || this.analyzeText(entry.text || entry.note || '');
      totalScore += analysis.overallScore;

      // Compter les émotions
      if (analysis.dominantEmotion !== 'neutre') {
        emotionCounts[analysis.dominantEmotion] = (emotionCounts[analysis.dominantEmotion] || 0) + 1;
      }

      // Données de tendance
      trendData.push({
        date: entry.date,
        score: analysis.overallScore,
        emotion: analysis.dominantEmotion
      });
    });

    const averageScore = totalScore / entries.length;
    const mostFrequentEmotion = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b, 'neutre'
    );

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      totalEntries: entries.length,
      emotionDistribution: emotionCounts,
      trendData: trendData.sort((a, b) => new Date(a.date) - new Date(b.date)),
      mostFrequentEmotion,
      sentiment: this.getSentimentLabel(averageScore)
    };
  }

  // Obtenir la couleur associée à une émotion
  static getEmotionColor(emotion) {
    const colors = {
      joie: '#FFD700',
      tristesse: '#4169E1',
      colère: '#FF4500',
      peur: '#800080',
      surprise: '#FF69B4',
      dégoût: '#228B22',
      amour: '#DC143C',
      satisfaction: '#32CD32',
      neutre: '#808080'
    };
    return colors[emotion] || colors.neutre;
  }

  // Obtenir l'icône associée à une émotion
  static getEmotionIcon(emotion) {
    const icons = {
      joie: '😊',
      tristesse: '😢',
      colère: '😠',
      peur: '😰',
      surprise: '😲',
      dégoût: '🤢',
      amour: '💕',
      satisfaction: '😌',
      neutre: '😐'
    };
    return icons[emotion] || icons.neutre;
  }
}

export default EmotionAnalyzer;