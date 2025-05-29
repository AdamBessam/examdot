import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthProvider, useAuth } from './AuthContext';
import AccueilScreen from './AccueilScreen';
import HumeurScreen from './HumeurScreen';
import GalerieScreen from './GalerieScreen';
import StatisticsScreen from './StatisticsScreen'; // Nouvel écran
import ProfileScreen from './ProfileScreen';
import LoginScreen from './LoginScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec tabs (après connexion)
function MainTabNavigator() {
  const { user } = useAuth();

  const headerRight = () => (
    <TouchableOpacity
      style={{ marginRight: 15 }}
      onPress={() => {
        // Navigation vers le profil - à implémenter selon votre navigation
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
        {user?.displayName?.split(' ')[0] || 'Profil'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Humeur') {
            iconName = focused ? 'happy' : 'happy-outline';
          } else if (route.name === 'Galerie') {
            iconName = focused ? 'images' : 'images-outline';
          } else if (route.name === 'Statistiques') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: headerRight,
      })}
    >
      <Tab.Screen 
        name="Accueil" 
        component={AccueilScreen}
        options={{
          headerTitle: 'Mon Journal de Bord',
        }}
      />
      <Tab.Screen 
        name="Humeur" 
        component={HumeurScreen}
        options={{
          headerTitle: 'Humeur du Jour',
        }}
      />
      <Tab.Screen 
        name="Galerie" 
        component={GalerieScreen}
        options={{
          headerTitle: 'Mes Entrées',
        }}
      />
      <Tab.Screen 
        name="Statistiques" 
        component={StatisticsScreen}
        options={{
          headerTitle: 'Analyse Émotionnelle',
          tabBarLabel: 'Stats',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerTitle: 'Mon Profil',
        }}
      />
    </Tab.Navigator>
  );
}

// Navigation Stack pour l'authentification
function AuthStack() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Composant de navigation principal
function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    // Vous pouvez ajouter un écran de chargement ici
    return null;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <MainTabNavigator />
    </NavigationContainer>
  );
}

// App principal avec le provider d'authentification
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}