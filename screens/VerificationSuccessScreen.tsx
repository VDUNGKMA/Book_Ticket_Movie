import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

type VerificationSuccessNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VerificationSuccess"
>;

const VerificationSuccessScreen: React.FC = () => {
  const navigation = useNavigation<VerificationSuccessNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <TouchableOpacity>
          <Text>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Biểu tượng email */}
      <View style={styles.emailIconContainer}>
        <Text>
          <Ionicons name="mail-outline" size={40} color="#fff" />
        </Text>
      </View>

      {/* Tiêu đề Verification Code */}
      <View style={styles.verificationTitleContainer}>
        <View style={styles.line} />
        <Text style={styles.verificationTitle}>VERIFICATION CODE</Text>
        <View style={styles.line} />
      </View>

      {/* Biểu tượng thành công */}
      <View style={styles.successIconContainer}>
        <Text>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </Text>
      </View>

      {/* Thông báo thành công */}
      <Text style={styles.successText}>Register Success</Text>
      <Text style={styles.successDescription}>
        Congratulations! Your account is already created. Please login to get an
        amazing experience
      </Text>

      {/* Nút Go to Homepage */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.homeButtonText}>Go to Homepage</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526", // Nền tối giống ảnh
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF4444", // Viền đỏ giống ảnh
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verificationTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#888",
    marginHorizontal: 10,
  },
  verificationTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00C853", // Viền xanh giống ảnh
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  successDescription: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  homeButton: {
    backgroundColor: "#FF4444", // Nút đỏ giống ảnh
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    width: "60%",
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default VerificationSuccessScreen;
