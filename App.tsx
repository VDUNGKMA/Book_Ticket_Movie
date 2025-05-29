import React from "react";
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppContent from "./context/AppContent";
import { SafeAreaProvider } from "react-native-safe-area-context";

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
