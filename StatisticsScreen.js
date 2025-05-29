import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmotionAnalyzer from './EmotionAnalyzer';

const { width: screenWidth } = Dimensions.get('window');

const StatisticsScreen = () => {
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const entries = await AsyncStorage.getItem('journalEntries');
      
      if (entries) {
        const parsedEntries = JSON.parse(entries);
        const filteredEntries = filterEntriesByPeriod(parsedEntries, selectedPeriod);
        const statistics = EmotionAnalyzer.calculatePeriodStats(filteredEntries);
        setStats(statistics);
      } else {
        setStats({
          averageScore: 0,
          totalEntries: 0,
          emotionDistribution: {},
          trendData: [],
          mostFrequentEmotion: 'neutre'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntriesByPeriod = (entries, period) => {
    const now = new Date();
    const filteredEntries = [];

    Object.keys(entries).forEach(date => {
      const entryDate = new Date(date);
      const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));

      const shouldInclude = 
        (period === 'week' && daysDiff <= 7) ||
        (period === 'month' && daysDiff <= 30) ||
        (period === 'year' && daysDiff <= 365);

      if (shouldInclude) {
        filteredEntries.push({
          date,
          ...entries[date]
        });
      }
    });

    return filteredEntries;
  };

  const getPieChartData = () => {
    if (!stats || !stats.emotionDistribution) return [];

    return Object.keys(stats.emotionDistribution).map(emotion => ({
      name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      population: stats.emotionDistribution[emotion],
      color: EmotionAnalyzer.getEmotionColor(emotion),
      legendFontColor: '#2d3748',
      legendFontSize: 12,
    }));
  };

  const getLineChartData = () => {
    if (!stats || !stats.trendData || stats.trendData.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [{ data: [0] }]
      };
    }

    const last7Days = stats.trendData.slice(-7);
    return {
      labels: last7Days.map(item => {
        const date = new Date(item.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [{
        data: last7Days.map(item => Math.max(item.score, -5)),
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      }]
    };
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'year'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.selectedPeriodButtonText
          ]}>
            {period === 'week' ? 'Semaine' : 
             period === 'month' ? 'Mois' : 'Année'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewCards = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Score Moyen</Text>
        <Text style={[styles.overviewValue, { 
          color: stats.averageScore >= 0 ? '#10b981' : '#ef4444' 
        }]}>
          {stats.averageScore > 0 ? '+' : ''}{stats.averageScore}
        </Text>
        <Text style={styles.overviewSubtext}>{stats.sentiment}</Text>
      </View>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Entrées</Text>
        <Text style={styles.overviewValue}>{stats.totalEntries}</Text>
        <Text style={styles.overviewSubtext}>
          {selectedPeriod === 'week' ? 'Cette semaine' : 
           selectedPeriod === 'month' ? 'Ce mois' : 'Cette année'}
        </Text>
      </View>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Émotion Dominante</Text>
        <Text style={styles.overviewEmoji}>
          {EmotionAnalyzer.getEmotionIcon(stats.mostFrequentEmotion)}
        </Text>
        <Text style={styles.overviewSubtext}>
          {stats.mostFrequentEmotion.charAt(0).toUpperCase() + 
           stats.mostFrequentEmotion.slice(1)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analyse Émotionnelle</Text>
      
      {renderPeriodSelector()}
      
      {stats && stats.totalEntries > 0 ? (
        <>
          {renderOverviewCards()}

          {/* Graphique de tendance */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Évolution Émotionnelle</Text>
            <LineChart
              data={getLineChartData()}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#6366f1'
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Graphique en secteurs des émotions */}
          {getPieChartData().length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Répartition des Émotions</Text>
              <PieChart
                data={getPieChartData()}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chart}
              />
            </View>
          )}

          {/* Insights personnalisés */}
          <View style={styles.insightsContainer}>
            <Text style={styles.chartTitle}>Insights</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                {stats.averageScore > 1 
                  ? "🌟 Votre humeur est globalement positive ! Continuez ainsi."
                  : stats.averageScore < -1
                  ? "💙 Prenez soin de vous. N'hésitez pas à parler à quelqu'un."
                  : "⚖️ Votre humeur est équilibrée avec des hauts et des bas normaux."
                }
              </Text>
            </View>
            
            {stats.mostFrequentEmotion !== 'neutre' && (
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  {EmotionAnalyzer.getEmotionIcon(stats.mostFrequentEmotion)} 
                  {` Votre émotion la plus fréquente est "${stats.mostFrequentEmotion}". `}
                  {stats.mostFrequentEmotion === 'joie' 
                    ? "C'est merveilleux !"
                    : "Explorez ce que cela signifie pour vous."
                  }
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊</Text>
          <Text style={styles.noDataTitle}>Pas encore de données</Text>
          <Text style={styles.noDataSubtext}>
            Commencez à écrire dans votre journal pour voir vos statistiques émotionnelles
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedPeriodButton: {
    backgroundColor: '#6366f1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedPeriodButtonText: {
    color: '#ffffff',
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overviewTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 5,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 2,
  },
  overviewEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  overviewSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 48,
    marginBottom: 15,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StatisticsScreen;