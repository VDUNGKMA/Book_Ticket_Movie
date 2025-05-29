import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import { useUserContext } from "./UserContext";
import { getProfile } from "../api/api";
import { User } from "./UserContext";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import { ChatProvider } from "./ChatContext";
import { ThemeProvider } from "./ThemeContext";
import { Alert } from "react-native";
import { MessageStackParamList } from "../navigation/types";

// Import các screens
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import MovieListScreen from "../screens/MovieListScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import VerificationScreen from "../screens/VerificationScreen";
import LanguageScreen from "../screens/LanguageScreen";
import VerificationSuccessScreen from "../screens/VerificationSuccessScreen";
import SecurityScreen from "../screens/SecurityScreen";
import SearchScreen from "../screens/SearchScreen";
import CinemasMapScreen from "../screens/CinemasMapScreen";
import CinemasScreen from "../screens/CinemasScreen";
import MovieDetailScreen from "../screens/MovieDetailScreen";
import MyFavoriteScreen from "../screens/MyFavoriteScreen";
import SelectSeatsScreen from "../screens/SelectSeatsScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import MyTicketScreen from "../screens/MyTicketScreen";
import TicketDetailScreen from "../screens/TicketDetailScreen";
import MessageScreen from "../screens/MessageScreen";
import MessageDetailScreen from "../screens/MessageDetailScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import NotificationScreen from "../screens/NotificationScreen";
import PayPalPaymentScreen from "../screens/PayPalPaymentScreen";
import RecommendationScreen from "../screens/RecommendationScreen";
import VideoCallScreen from "../screens/VideoCallScreen";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BookingScreen from "../screens/BookingScreen";
import FoodDrinkScreen from "../screens/FoodDrinkScreen";
type IconName = keyof typeof Ionicons.glyphMap;

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const MessageStack = createStackNavigator<MessageStackParamList>();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
    <Stack.Screen name="MovieDetailScreen" component={MovieDetailScreen} />
    <Stack.Screen name="Booking" component={BookingScreen} />
    <Stack.Screen name="SelectSeatsScreen" component={SelectSeatsScreen} />
    <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
    <Stack.Screen name="FoodDrinkScreen" component={FoodDrinkScreen} />
    <Stack.Screen name="PayPalPaymentScreen" component={PayPalPaymentScreen} />
    <Stack.Screen name="Notifications" component={NotificationScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
  </Stack.Navigator>
);

const CinemasStackScreen = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CinemasMap" component={CinemasMapScreen} />
    <Stack.Screen name="CinemasList" component={CinemasScreen} />
    <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SettingsHome"
      component={SettingsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Verification"
      component={VerificationScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Language"
      component={LanguageScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="VerificationSuccess"
      component={VerificationSuccessScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Security"
      component={SecurityScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const MyTicketStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyTicketHome" component={MyTicketScreen} />
    <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
    <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
  </Stack.Navigator>
);

const MessageStackScreen = () => (
  <MessageStack.Navigator screenOptions={{ headerShown: false }}>
    <MessageStack.Screen name="MessageHome" component={MessageScreen} />
    <MessageStack.Screen name="MessageDetail" component={MessageDetailScreen} />
    <MessageStack.Screen name="VideoCallScreen" component={VideoCallScreen} />
  </MessageStack.Navigator>
);

export const AppContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { user, setIsLoggedIn, setUser } = useUserContext();

  // Thêm useEffect để theo dõi thay đổi của user
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  const checkToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        const profileResponse = await getProfile();
        if (profileResponse) {
          const userData: User = {
            id: profileResponse.id,
            name: profileResponse.name,
            email: profileResponse.email,
            role: profileResponse.role,
            image: profileResponse.image,
          };
          setUser(userData);
          setIsLoggedIn(true);
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error: any) {
      // Nếu lỗi 401 hoặc thông báo hết hạn, xóa token và reset context
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      setIsAuthenticated(false);
      setIsLoggedIn(false);
      setUser(null);
      Alert.alert(
        "Phiên đăng nhập đã hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng."
      );
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  if (isAuthenticated === null) {
    return null; // hoặc loading screen
  }

  return (
    <ThemeProvider>
      <ChatProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" }}>
          <NavigationContainer>
            <Tab.Navigator
              initialRouteName={isAuthenticated ? "Home" : "Auth"}
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: IconName = "alert";

                  if (route.name === "Home") {
                    iconName = focused ? "home" : "home-outline";
                  } else if (route.name === "Auth") {
                    iconName = focused ? "log-in" : "log-in-outline";
                  } else if (route.name === "MovieList") {
                    iconName = focused ? "film" : "film-outline";
                  } else if (route.name === "Settings") {
                    iconName = focused ? "settings" : "settings-outline";
                  } else if (route.name === "Search") {
                    iconName = focused ? "search" : "search-outline";
                  } else if (route.name === "Cinemas") {
                    iconName = focused ? "location" : "location-outline";
                  } else if (route.name === "Favorite") {
                    iconName = focused ? "heart" : "heart-outline";
                  } else if (route.name === "MyTicket") {
                    iconName = focused ? "ticket" : "ticket-outline";
                  } else if (route.name === "Message") {
                    iconName = focused ? "chatbubble" : "chatbubble-outline";
                  } else if (route.name === "Recommendation") {
                    iconName = focused ? "star" : "star-outline";
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: "#FF4444",
                tabBarInactiveTintColor: "#888",
                tabBarStyle: {
                  backgroundColor: "#1C2526",
                  borderTopWidth: 0,
                  height: 60,
                  paddingBottom: 10,
                },
                tabBarLabelStyle: {
                  fontSize: 12,
                  fontWeight: "500",
                  marginBottom: 5,
                },
                headerShown: false,
              })}
            >
              {isAuthenticated ? (
                // Các tab khi đã đăng nhập
                <>
                  <Tab.Screen
                    name="Home"
                    component={HomeStack}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="MovieList"
                    component={MovieListScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Search"
                    component={SearchScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Cinemas"
                    component={CinemasStackScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Favorite"
                    component={MyFavoriteScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="MyTicket"
                    component={MyTicketStack}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Message"
                    component={MessageStackScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Settings"
                    component={SettingsStack}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Recommendation"
                    component={RecommendationScreen}
                    options={{
                      headerShown: false,
                      tabBarLabel: "Gợi ý",
                    }}
                  />
                </>
              ) : (
                // Các tab khi chưa đăng nhập
                <>
                  <Tab.Screen
                    name="Home"
                    component={HomeStack}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="MovieList"
                    component={MovieListScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Search"
                    component={SearchScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Cinemas"
                    component={CinemasStackScreen}
                    options={{ headerShown: false }}
                  />
                  <Tab.Screen
                    name="Auth"
                    component={AuthStack}
                    options={{
                      headerShown: false,
                    }}
                  />
                </>
              )}
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </ChatProvider>
    </ThemeProvider>
  );
};

export default AppContent;
