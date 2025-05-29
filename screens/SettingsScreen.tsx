import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import * as SecureStore from "expo-secure-store";
import { useUserContext } from "../context/UserContext";

type SettingsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SettingsHome"
>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavigationProp>();
  const [isLogoutModalVisible, setIsLogoutModalVisible] =
    useState<boolean>(false);
  const { setUser, setIsLoggedIn } = useUserContext();

  const handleLogoutConfirm = async () => {
    try {
      // Xóa tokens
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");

      // Reset user context
      setUser(null);
      setIsLoggedIn(false);

      // Đóng modal
      setIsLogoutModalVisible(false);

      // Không cần navigate, vì AppContent sẽ tự động render lại dựa trên isAuthenticated
    } catch (error) {
      console.error("Error during logout:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Danh sách cài đặt */}
      <View style={styles.settingsList}>
        {/* General */}
        <Text style={styles.sectionTitle}>General</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="person-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("ChangePassword")}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Security */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("Security")}
        >
          <Ionicons name="shield-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Security</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Language */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("Language")}
        >
          <Ionicons name="globe-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Language</Text>
          <Text style={styles.languageValue}>English</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="document-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Legal & Policies</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Modal xác nhận Logout */}
      <Modal
        transparent={true}
        visible={isLogoutModalVisible}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsLogoutModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Are you sure you want to logout?
            </Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsLogoutModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutConfirmButton}
              onPress={handleLogoutConfirm}
            >
              <Text style={styles.logoutConfirmButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  settingsList: {
    padding: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
  },
  languageValue: {
    color: "#888",
    fontSize: 16,
    marginRight: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#2C3539",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    width: "80%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutConfirmButton: {
    paddingVertical: 10,
  },
  logoutConfirmButtonText: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SettingsScreen;
