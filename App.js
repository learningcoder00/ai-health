import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';

import HomeScreen from './src/screens/HomeScreen';
import MedicineScreen from './src/screens/MedicineScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import ReportScreen from './src/screens/ReportScreen';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();

// Logo组件 - 作为标题显示
const LogoTitle = () => {
  return (
    <View style={styles.logoTitleContainer}>
      <Image
        source={require('./assets/logo_1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === '首页') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === '药品') {
                iconName = focused ? 'medical' : 'medical-outline';
              } else if (route.name === '设备') {
                iconName = focused ? 'watch' : 'watch-outline';
              } else if (route.name === '报告') {
                iconName = focused ? 'document-text' : 'document-text-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#4A90E2',
            tabBarInactiveTintColor: '#8E8E93',
            headerStyle: {
              backgroundColor: '#4A90E2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerTitle: () => <LogoTitle />,
          })}
        >
          <Tab.Screen name="首页" component={HomeScreen} />
          <Tab.Screen name="药品" component={MedicineScreen} />
          <Tab.Screen name="设备" component={DeviceScreen} />
          <Tab.Screen name="报告" component={ReportScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  logoTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 120,
    height: 40,
  },
});

