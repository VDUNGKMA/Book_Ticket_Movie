import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { register } from "../api/api"; // Import từ api.ts (đảm bảo đúng đường dẫn)
import * as SecureStore from "expo-secure-store";

const CreateAccountScreen: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [emailOrPhone, setEmailOrPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const validateInput = (
    username: string,
    email: string,
    password: string
  ): boolean => {
    if (!username.trim()) {
      Alert.alert("Lỗi", "Tên người dùng không được để trống");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }

    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateInput(username, emailOrPhone, password)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await register(username, emailOrPhone, password);
      const { access_token, refresh_token, user } = response;

      // Lưu token vào SecureStore
      if (access_token) {
        await SecureStore.setItemAsync("access_token", access_token);
        console.log("Access Token saved securely:", access_token);
      }
      if (refresh_token) {
        await SecureStore.setItemAsync("refresh_token", refresh_token);
        console.log("Refresh Token saved securely:", refresh_token);
      }

      // Hiển thị thông báo thành công
      const message = Array.isArray(response.message)
        ? response.message.join(", ")
        : response.message ||
          `Tài khoản ${user?.name || "mới"} đã được tạo thành công!`;
      Alert.alert("Thành công", message);

      // Điều hướng về màn hình đăng nhập
      navigation.navigate("Login");
    } catch (error: any) {
      const errorMessage = Array.isArray(error.message)
        ? error.message.join("\n")
        : error.message || "Có lỗi xảy ra";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.description}>
        Start learning with create your account
      </Text>

      <View style={styles.inputContainer}>
        <Text>
          <Ionicons
            name="person-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Create your username"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Create password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.eyeIcon}
          disabled={isLoading}
        >
          <Text>
            <Ionicons
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#fff"
            />
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.createButton, isLoading && styles.disabledButton]}
        onPress={handleCreateAccount}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.orText}>Or use other method</Text>

      <TouchableOpacity style={styles.googleButton} disabled={isLoading}>
        <Image
          source={{
            uri: "https://img.icons8.com/color/48/000000/google-logo.png",
          }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>Sign Up with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.facebookButton} disabled={isLoading}>
        <Image
          source={{
            uri: "https://img.icons8.com/color/48/000000/facebook-new.png",
          }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>Sign Up with Facebook</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#fff",
  },
  eyeIcon: {
    padding: 10,
  },
  createButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: "#888",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  orText: {
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
    justifyContent: "center",
  },
  facebookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: "center",
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default CreateAccountScreen;
