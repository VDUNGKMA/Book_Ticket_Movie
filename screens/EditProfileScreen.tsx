import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { getProfile, updateProfile, uploadImage } from "../api/api";
import { RootStackParamList } from "../types";
import { StackNavigationProp } from "@react-navigation/stack";
import { BASE_URL } from "../config/config";

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    image: "",
    linkedWith: "",
  });
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [imageUri, setImageUri] = useState(
    "https://via.placeholder.com/100.png?text=Avatar"
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        console.log("check response:", response);
        const profileData = response;
        const fullImageUrl = profileData.image
          ? `${BASE_URL}/${profileData.image.replace(/\\/g, "/")}`
          : "https://via.placeholder.com/100.png?text=Avatar";

        setUserData({
          name: profileData.name || "",
          email: profileData.email || "",
          image: profileData.image || "",
          linkedWith: profileData.linkedWith || "",
        });
        setEditedName(profileData.name || "");
        setEditedEmail(profileData.email || "");
        setImageUri(fullImageUrl);
      } catch (error: any) {
        if (error.message.includes("401")) {
          Alert.alert("Session Expired", "Please login again", [
            { text: "OK", onPress: () => navigation.navigate("Login") },
          ]);
        } else {
          Alert.alert("Error", error.message || "Failed to fetch profile");
        }
        console.error(error);
      }
    };
    fetchProfile();
  }, [navigation]);

  const pickImage = async () => {
    // Yêu cầu quyền truy cập thư viện ảnh
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log("Permission status:", status);

    if (status !== "granted") {
      Alert.alert("Permission denied", "Please grant camera roll permissions.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    console.log("ImagePicker result:", result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      try {
        await uploadImage(uri);
        const updatedProfile = await getProfile();
        const profileData = updatedProfile.data
          ? updatedProfile.data
          : updatedProfile;
        const fullImageUrl = profileData.image
          ? `${BASE_URL}/${profileData.image.replace(/\\/g, "/")}`
          : uri;

        setUserData({
          name: profileData.name || "",
          email: profileData.email || "",
          image: profileData.image || "",
          linkedWith: profileData.linkedWith || "",
        });
        setImageUri(fullImageUrl);
        Alert.alert("Success", "Image uploaded successfully");
      } catch (error: any) {
        if (error.message.includes("401")) {
          Alert.alert("Session Expired", "Please login again", [
            { text: "OK", onPress: () => navigation.navigate("Login") },
          ]);
        } else {
          Alert.alert("Error", error.message || "Failed to upload image");
        }
        console.error(error);
      }
    } else {
      console.log("Image selection canceled by user");
    }
  };

  const saveChanges = async () => {
    const updateData = {
      name: editedName,
      email: editedEmail,
    };

    try {
      const response = await updateProfile(updateData);
      const profileData = response.data ? response.data : response;
      setUserData({
        ...userData,
        name: profileData.name || "",
        email: profileData.email || "",
      });
      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      if (error.message.includes("401")) {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", error.message || "Failed to update profile");
      }
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        <Image
          source={{
            uri: imageUri || "https://via.placeholder.com/100.png?text=Avatar",
          }}
          style={styles.avatar}
        />
        <Ionicons
          name="camera-outline"
          size={20}
          color="#fff"
          style={styles.cameraIcon}
        />
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons
            name="person-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.infoText}>Username</Text>
          <TextInput
            style={[styles.infoValue, styles.input]}
            value={editedName}
            onChangeText={setEditedName}
          />
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.infoText}>Email or Phone Number</Text>
          <TextInput
            style={[styles.infoValue, styles.input]}
            value={editedEmail}
            onChangeText={setEditedEmail}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="link-outline"
            size={20}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.infoText}>Account Linked With</Text>
          <View style={styles.linkedWith}>
            <Image
              source={{
                uri: "https://img.icons8.com/color/24/000000/google-logo.png",
              }}
              style={styles.socialIcon}
            />
            <Text style={styles.infoValue}>
              {userData.linkedWith || "Google"}
            </Text>
            <Ionicons
              name="link"
              size={20}
              color="#888"
              style={styles.linkIcon}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1C2526" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 20,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FF4444",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 5,
    right: "30%",
    backgroundColor: "#FF4444",
    borderRadius: 10,
    padding: 5,
  },
  infoContainer: { paddingHorizontal: 15 },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  icon: { marginRight: 10 },
  infoText: { flex: 1, color: "#fff", fontSize: 16 },
  infoValue: { color: "#888", fontSize: 16 },
  input: { color: "#fff", flex: 1, textAlign: "right" },
  linkedWith: { flexDirection: "row", alignItems: "center" },
  socialIcon: { width: 24, height: 24, marginRight: 10 },
  linkIcon: { marginLeft: 10 },
  saveButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 20,
    position: "absolute",
    bottom: 20,
    width: "90%",
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default EditProfileScreen;
