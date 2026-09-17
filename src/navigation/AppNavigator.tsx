// appnavigator.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import JobTrackerScreen from '../screens/JobTrackerScreen';
import TargetCompaniesScreen from '../screens/TargetCompaniesScreen';
import ResumeScreen from '../screens/ResumeScreen';
import JobRecommendationsScreen from '../screens/JobRecommendationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'JobTracker') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Recommendations') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Targets') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Resume') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        // Tab bar with proper bottom spacing
        tabBarStyle: {
          height: 65,
          paddingTop: 6,
          paddingBottom: 12,
          backgroundColor: 'white',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#e5e7eb',
          elevation: 0,
          shadowOpacity: 0,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="JobTracker"
        component={JobTrackerScreen}
        options={{ tabBarLabel: 'Job Tracker' }}
      />
      <Tab.Screen
        name="Recommendations"
        component={JobRecommendationsScreen}
        options={{ tabBarLabel: 'Jobs' }}
      />
      <Tab.Screen
        name="Targets"
        component={TargetCompaniesScreen}
        options={{ tabBarLabel: 'Companies' }}
      />
      <Tab.Screen
        name="Resume"
        component={ResumeScreen}
        options={{ tabBarLabel: 'Resume' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <NavigationContainer>
        {isAuthenticated ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaView>
  );
}
