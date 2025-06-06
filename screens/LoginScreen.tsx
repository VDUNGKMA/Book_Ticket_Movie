import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { login, getProfile } from "../api/api";
import * as SecureStore from "expo-secure-store";
import { useUserContext } from "../context/UserContext";
import { User } from "../context/UserContext"; // Đường dẫn đúng vào file của bạn
import { CommonActions } from "@react-navigation/native";

// Khai báo mở rộng cho global
declare global {
  var redirectAfterLogin: {
    screen: keyof RootStackParamList;
    params: any;
  } | null;
}

const LoginScreen: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [user, setUser] = useState<any>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Login">>();
  const { setUser, setIsLoggedIn } = useUserContext();

  const handleSignUp = () => {
    navigation.navigate("CreateAccount");
  };

  const validateInput = (email: string, password: string): boolean => {
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

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ email/phone và mật khẩu");
      return;
    }

    if (!validateInput(emailOrPhone, password)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(emailOrPhone, password);
      console.log("Login response:", response);
      const message = Array.isArray(response.message)
        ? response.message.join("\n")
        : response.message || "Đăng nhập thành công!";
      Alert.alert("Thành công", message);

      // Gọi API để lấy thông tin profile
      const profileResponse = await getProfile();

      if (profileResponse) {
        const userData: User = {
          id: profileResponse.id,
          name: profileResponse.name,
          email: profileResponse.email,
          role: profileResponse.role,
        };
        setUser(userData);
        setIsLoggedIn(true);

        // Kiểm tra có tham số chuyển hướng không
        if (route.params?.redirectParams) {
          const { screen, params } = route.params.redirectParams;

          // Trước tiên lưu thông tin chuyển hướng vào biến global để dễ truy cập sau khi reset
          global.redirectAfterLogin = {
            screen,
            params,
          };
        }
      } else {
        Alert.alert("Lỗi", "Không lấy được thông tin người dùng");
      }
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login Account</Text>
      <Text style={styles.description}>
        Please login with registered account
      </Text>

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
          placeholder="Enter your email or phone number"
          placeholderTextColor="#888"
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          keyboardType="email-address"
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
          placeholder="Create a password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          disabled={isLoading}
        >
          <Text>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#fff"
            />
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgotLink}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.signInButton, isLoading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.signInButtonText}>SIGN IN</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.orText}>or using other method</Text>

      <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
        <Image
          source={{
            uri: "https://img.icons8.com/color/24/000000/google-logo.png",
          }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialText}>Sign Up with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
        <Image
          source={{
            uri: "https://img.icons8.com/color/24/000000/facebook-new.png",
          }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialText}>Sign Up with Facebook</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSignUp} style={styles.signUpLink}>
        <Text style={styles.signUpText}>
          Don't have an account?{" "}
          <Text style={styles.signUpHighlight}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  description: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    marginBottom: 15,
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
  forgotLink: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    color: "#FF4444",
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#888",
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  orText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialText: {
    color: "#fff",
    fontSize: 16,
  },
  signUpLink: {
    alignItems: "center",
    marginTop: 20,
  },
  signUpText: {
    color: "#888",
    fontSize: 14,
  },
  signUpHighlight: {
    color: "#FF4444",
    fontWeight: "bold",
  },
});

export default LoginScreen;
