import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';

import HomeScreen from './src/screens/HomeScreen';
import MedicineScreen from './src/screens/MedicineScreen';
import DeviceScreen from './src/screens/DeviceScreen';
import ReportScreen from './src/screens/ReportScreen';
import AuthScreen from './src/screens/AuthScreen';
import { theme } from './src/theme';
import {
  MedicineService,
  MEDICINE_REMINDER_CATEGORY,
  MEDICINE_ACTION_TAKEN,
  MEDICINE_ACTION_SNOOZE_5M,
  MEDICINE_ACTION_SNOOZE_15M,
  MEDICINE_ACTION_SNOOZE_30M,
} from './src/services/MedicineService';
import { AuthService } from './src/services/AuthService';

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

// Logo组件 - 作为标题显示
const LogoTitle = () => {
  return (
    <View style={styles.logoTitleContainer}>
      <Image
        source={require('./assets/logo_2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

export default function App() {
  // Web/原生：确保图标字体加载完成，否则 Ionicons/MaterialCommunityIcons 可能显示为空白
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ok = await AuthService.isLoggedIn();
        setAuthed(ok);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Expo Web：修复浏览器标签标题显示为 undefined 的问题
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    if (checkingAuth) {
      document.title = '加载中...';
      return;
    }
    document.title = authed ? 'AI健康管家' : '登录与注册';
  }, [authed, checkingAuth]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // 1) 通知处理器（全局）
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // 2) 通知动作（已服/稍后）
    (async () => {
      try {
        await Notifications.setNotificationCategoryAsync(MEDICINE_REMINDER_CATEGORY, [
          {
            identifier: MEDICINE_ACTION_TAKEN,
            buttonTitle: '已服用',
            options: { opensAppToForeground: true },
          },
          {
            identifier: MEDICINE_ACTION_SNOOZE_5M,
            buttonTitle: '稍后5分钟',
            options: { opensAppToForeground: false },
          },
          {
            identifier: MEDICINE_ACTION_SNOOZE_15M,
            buttonTitle: '稍后15分钟',
            options: { opensAppToForeground: false },
          },
          {
            identifier: MEDICINE_ACTION_SNOOZE_30M,
            buttonTitle: '稍后30分钟',
            options: { opensAppToForeground: false },
          },
        ]);
      } catch (e) {
        console.warn('设置通知分类失败:', e);
      }
    })();

    // 3) 监听通知点击/动作
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data || {};
        const medicineId = data.medicineId;
        const reminderId = data.reminderId;

        // 记录动作闭环
        await MedicineService.handleNotificationAction({ medicineId, reminderId, actionIdentifier });

        // 点击通知正文（默认动作）：跳转到“药品”页
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          if (navigationRef.isReady()) {
            navigationRef.navigate('药品');
          }
        }
      } catch (e) {
        console.warn('处理通知响应失败:', e);
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        {!fontsLoaded ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="cloud-outline" size={32} color="#fff" />
          </View>
        ) : checkingAuth ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="cloud-outline" size={32} color="#fff" />
          </View>
        ) : !authed ? (
          <AuthScreen onAuthed={async () => setAuthed(await AuthService.isLoggedIn())} />
        ) : (
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
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textSecondary,
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                paddingBottom: 2,
              },
              headerStyle: {
                backgroundColor: theme.colors.primary,
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
        )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

