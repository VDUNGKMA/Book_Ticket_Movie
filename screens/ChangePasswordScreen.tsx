import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";

const ChangePasswordScreen: React.FC = () => {
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await SecureStore.getItemAsync("userId");
      setUserId(storedUserId);
    };
    fetchUserId();
  }, []);

  const handleChangePassword = async () => {
    if (!userId) {
      alert("User ID not found. Please log in again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await api.put(`/users/${userId}/change-password`, {
        oldPassword,
        newPassword,
      });
      alert("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigation.goBack();
    } catch (error: any) {
      alert("Error changing password: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Trường nhập liệu Old Password */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter old password"
          placeholderTextColor="#888"
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry={true}
        />
      </View>

      {/* Trường nhập liệu New Password */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#888"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
        />
        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
          <Ionicons
            name={showNewPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Trường nhập liệu Confirm Password */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm your new password"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Nút Change Now */}
      <TouchableOpacity
        style={styles.changeButton}
        onPress={handleChangePassword}
      >
        <Text style={styles.changeButtonText}>Change Now</Text>
      </TouchableOpacity>
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539", // Nền ô nhập liệu
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#fff",
    fontSize: 16,
  },
  changeButton: {
    backgroundColor: "#FF4444", // Nút đỏ giống ảnh
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 20,
    position: "absolute",
    bottom: 20,
    width: "90%",
  },
  changeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ChangePasswordScreen;
