import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

type VerificationNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Verification"
>;

const VerificationScreen: React.FC = () => {
  const [code, setCode] = useState<string[]>(["", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const navigation = useNavigation<VerificationNavigationProp>();

  const handleCodeChange = (text: string, index: number) => {
    if (/^[0-9]$/.test(text)) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (index < 3) {
        setFocusedIndex(index + 1);
      }
    }
  };

  const handleBackspace = (index: number) => {
    if (index > 0) {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      setFocusedIndex(index - 1);
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {}
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {}
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
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

      <View style={styles.emailIconContainer}>
        <Text>
          <Ionicons name="mail-outline" size={40} color="#fff" />
        </Text>
      </View>

      <Text style={styles.infoText}>We have to send verification code to</Text>
      <Text style={styles.emailText}>pyetk@gmail.com</Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.codeInput}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !digit) {
                handleBackspace(index);
              }
            }}
            keyboardType="numeric"
            maxLength={1}
            autoFocus={index === focusedIndex}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={() => {
          const verificationCode = code.join("");
          if (verificationCode.length === 4) {
            navigation.navigate("VerificationSuccess"); // Điều hướng khi thành công
          } else {
            alert("Please enter a 4-digit code!");
          }
        }}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendLink}>
        <Text style={styles.resendText}>
          Didn't receive the code?{" "}
          <Text style={styles.resendHighlight}>Resend</Text>
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
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 5,
  },
  emailText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
    marginBottom: 20,
  },
  codeInput: {
    width: 50,
    height: 50,
    backgroundColor: "#2C3539",
    borderRadius: 10,
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#3C4447",
  },
  submitButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    width: "60%",
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resendLink: {
    alignItems: "center",
  },
  resendText: {
    color: "#888",
    fontSize: 14,
  },
  resendHighlight: {
    color: "#FF4444",
    fontWeight: "bold",
  },
});

export default VerificationScreen;
