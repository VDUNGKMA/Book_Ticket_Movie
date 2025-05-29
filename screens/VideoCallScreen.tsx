import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

interface VideoCallParams {
  friendId: number;
  name: string;
  avatar: string;
}

const VideoCallScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { friendId, name, avatar } = route.params as VideoCallParams;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Call</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={64} color="#888" />
          <Text style={{ color: "#888", marginTop: 10 }}>
            Video sẽ hiển thị ở đây
          </Text>
        </View>
      </View>
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
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 24 },
  videoPlaceholder: {
    width: 300,
    height: 400,
    backgroundColor: "#222",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
});

export default VideoCallScreen;
