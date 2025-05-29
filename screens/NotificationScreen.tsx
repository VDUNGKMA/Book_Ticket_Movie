import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

// Định nghĩa interface cho thông báo
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  avatar?: string;
  isUrgent?: boolean;
}

// Dữ liệu giả cho thông báo
const notifications: Notification[] = [
  {
    id: "1",
    type: "Purchase Completed",
    title: "Purchase Completed!",
    message:
      "You have successfully purchased The Sea Beast Ticket for 2 seats, thank you and your package to arrive ★",
    time: "2 mins ago",
  },
  {
    id: "2",
    type: "Message",
    title: "Jerremy Send you a Message",
    message:
      "Hello, regarding your ticket problem, we will reply the message immediately",
    time: "2 mins ago",
    avatar: "https://via.placeholder.com/30?text=Jerremy",
    isUrgent: true,
  },
  {
    id: "3",
    type: "Flash Sale",
    title: "Flash Sale!",
    message: "Get 20% discount for first transaction in this month! 🎉",
    time: "2 mins ago",
  },
  {
    id: "4",
    type: "Movie Reminder",
    title: "Movie Reminder",
    message:
      "Hi, we would like to remind you that the film Wish Dragon will be showing in 2 days at your favorite cinema",
    time: "10 mins ago",
  },
];

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <View style={styles.notificationItem}>
      {item.avatar && (
        <Image
          source={{ uri: item.avatar }}
          style={styles.notificationAvatar}
        />
      )}
      <View style={styles.notificationContent}>
        <Text style={styles.notificationType}>{item.type}</Text>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {item.isUrgent && (
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>!</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Danh sách thông báo */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.notificationList}
      />
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
  notificationList: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  notificationAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationType: {
    color: "#888",
    fontSize: 12,
  },
  notificationTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginVertical: 2,
  },
  notificationMessage: {
    color: "#888",
    fontSize: 12,
  },
  notificationTime: {
    color: "#888",
    fontSize: 12,
    marginTop: 5,
  },
  urgentBadge: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  urgentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default NotificationScreen;
