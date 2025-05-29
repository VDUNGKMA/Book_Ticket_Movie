import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SecurityScreen: React.FC = () => {
  const [isFaceIDEnabled, setIsFaceIDEnabled] = useState<boolean>(false);
  const [isRememberPasswordEnabled, setIsRememberPasswordEnabled] =
    useState<boolean>(false);
  const [isTouchIDEnabled, setIsTouchIDEnabled] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Danh sách tùy chọn bảo mật */}
      <View style={styles.securityList}>
        <View style={styles.securityItem}>
          <Text style={styles.securityText}>Face ID</Text>
          <Switch
            trackColor={{ false: "#FF4444", true: "#FF4444" }}
            thumbColor={isFaceIDEnabled ? "#fff" : "#fff"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setIsFaceIDEnabled((prev) => !prev)}
            value={isFaceIDEnabled}
          />
        </View>

        <View style={styles.securityItem}>
          <Text style={styles.securityText}>Remember Password</Text>
          <Switch
            trackColor={{ false: "#FF4444", true: "#FF4444" }}
            thumbColor={isRememberPasswordEnabled ? "#fff" : "#fff"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setIsRememberPasswordEnabled((prev) => !prev)}
            value={isRememberPasswordEnabled}
          />
        </View>

        <View style={styles.securityItem}>
          <Text style={styles.securityText}>Touch ID</Text>
          <Switch
            trackColor={{ false: "#FF4444", true: "#FF4444" }}
            thumbColor={isTouchIDEnabled ? "#fff" : "#fff"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setIsTouchIDEnabled((prev) => !prev)}
            value={isTouchIDEnabled}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526", // Nền tối giống ảnh
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  securityList: {
    padding: 15,
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539", // Nền ô tùy chọn
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    justifyContent: "space-between",
  },
  securityText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default SecurityScreen;
