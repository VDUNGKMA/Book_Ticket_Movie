import React from "react";
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppContent from "./context/AppContent";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChatProvider } from "./context/ChatContext";
import { Modal, View, Text, Image, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <ChatProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </ChatProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
