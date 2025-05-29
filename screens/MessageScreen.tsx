import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useChatContext } from "../context/ChatContext";
import { useUserContext } from "../context/UserContext";
import {
  getFriends,
  sendFriendRequest,
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  searchUsers,
} from "../api/api";
import * as Notifications from "expo-notifications";
import { BASE_URL } from "@/config/config";

// Định nghĩa interface cho activity
interface Activity {
  id: string;
  name: string;
  avatar: string;
  image?: string;
}

const MessageScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useUserContext();
  const { messages: chatMessages, onlineFriends } = useChatContext();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<"friends" | "pending">("friends");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState<number | null>(null);
  const [sentRequests, setSentRequests] = useState<number[]>([]);
  const [error, setError] = useState<string>("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [friendSearch, setFriendSearch] = useState("");
  const friendRequestPopupRef = useRef<any>(null);
  // Biến cờ kiểm soát Alert friend_accepted
  let isFriendAcceptedAlertOpen = false;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(
    null
  );

  useEffect(() => {
    fetchFriends();
    fetchPending();
  }, []);

  useEffect(() => {
    setBadgeCount(pendingRequests.length);
  }, [pendingRequests]);

  useEffect(() => {
    // Lắng nghe realtime event friend_request và friend_accepted
    const globalAny = global as any;
    if (!globalAny._autoFriendEventListener) {
      globalAny._autoFriendEventListener = true;
      if (typeof window !== "undefined") {
        (window as any).onFriendRequest = (data: any) => {
          setBadgeCount((prev) => prev + 1);
          setNotifications((prev) => [
            {
              id: Date.now() + Math.random(),
              type: "friend_request",
              title: "Lời mời kết bạn mới",
              content: `${
                data.from?.name || "Ai đó"
              } đã gửi cho bạn một lời mời kết bạn!`,
              timestamp: data.timestamp || new Date().toISOString(),
            },
            ...prev,
          ]);
          fetchPending();
        };
        (window as any).onFriendAccepted = (data: any) => {
          setNotifications((prev) => [
            {
              id: Date.now() + Math.random(),
              type: "friend_accepted",
              title: "Kết bạn thành công",
              content: `${
                data.by?.name || "Ai đó"
              } đã chấp nhận lời mời kết bạn của bạn!`,
              timestamp: data.timestamp || new Date().toISOString(),
            },
            ...prev,
          ]);
          fetchFriends();
        };
      }
    }
  }, []);

  // Lắng nghe event friend_rejected từ ChatContext
  useEffect(() => {
    if (!user) return;
    const handler = (data: any) => {
      setNotifications((prev) => [
        {
          id: Date.now() + Math.random(),
          type: "friend_rejected",
          title: "Lời mời kết bạn bị từ chối",
          content: `${
            data.by?.name || "Ai đó"
          } đã từ chối lời mời kết bạn của bạn!`,
          timestamp: data.timestamp || new Date().toISOString(),
        },
        ...prev,
      ]);
    };
    const socket = (global as any).chatSocket;
    if (socket) {
      socket.on && socket.on("friend_rejected", handler);
    }
    return () => {
      if (socket && socket.off) socket.off("friend_rejected", handler);
    };
  }, [user]);

  // Badge số lượng lời mời trên icon app (nếu hỗ trợ expo-notifications)
  useEffect(() => {
    if (Notifications.setBadgeCountAsync) {
      Notifications.setBadgeCountAsync(badgeCount).catch(() => {});
    }
  }, [badgeCount]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await getFriends();
      setFriends(data);
    } catch {}
    setLoadingFriends(false);
  };
  const fetchPending = async () => {
    setLoadingPending(true);
    try {
      const data = await getPendingFriendRequests();
      setPendingRequests(data);
      // Đồng bộ notification bell
      setNotifications((prev) => {
        // Thêm thông báo cho các pending mới chưa có trong notifications
        const newNotis = data
          .filter(
            (r: any) =>
              !prev.some(
                (n) => n.type === "friend_request" && n.fromId === r.user?.id
              )
          )
          .map((r: any) => ({
            id: Date.now() + Math.random(),
            type: "friend_request",
            fromId: r.user?.id,
            title: "Lời mời kết bạn mới",
            content: `${
              r.user?.name || "Ai đó"
            } đã gửi cho bạn một lời mời kết bạn!`,
            timestamp: r.createdAt || new Date().toISOString(),
          }));
        return [...newNotis, ...prev];
      });
    } catch {}
    setLoadingPending(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoadingSearch(true);
    setError("");
    try {
      const results = await searchUsers(search.trim());
      setSearchResults(results);
      // Đánh dấu user đã gửi lời mời (nếu có)
      const sent = pendingRequests.map((r) => r.user?.id);
      setSentRequests(sent);
    } catch (e: any) {
      setSearchResults([]);
      setError("Không thể tìm kiếm người dùng. Vui lòng thử lại.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSendRequest = async (friendId: number) => {
    setLoadingRequest(friendId);
    setError("");
    try {
      await sendFriendRequest(friendId);
      fetchPending();
      setSentRequests((prev) => [...prev, friendId]);
      // Tìm tên người nhận từ searchResults hoặc pendingRequests
      let friendName = "người dùng";
      const found =
        searchResults.find((u: any) => u.id === friendId) ||
        pendingRequests.find((r: any) => r.user?.id === friendId);
      if (found) friendName = found.name || found.user?.name || "người dùng";
      setNotifications((prev) => [
        {
          id: Date.now() + Math.random(),
          type: "friend_request_sent",
          title: "Đã gửi lời mời kết bạn",
          content: `Bạn đã gửi lời mời kết bạn cho ${friendName}.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      Alert.alert("Thành công", "Đã gửi lời mời kết bạn!");
    } catch (e: any) {
      setError(e?.message || "Gửi lời mời thất bại");
      Alert.alert("Lỗi", e?.message || "Gửi lời mời thất bại");
    } finally {
      setLoadingRequest(null);
    }
  };
  const handleAccept = async (friendId: number) => {
    await acceptFriendRequest(friendId);
    fetchFriends();
    fetchPending();
  };
  const handleReject = async (friendId: number) => {
    await rejectFriendRequest(friendId);
    fetchPending();
  };

  const handleCancelRequest = async (friendId: number) => {
    setLoadingRequest(friendId);
    setError("");
    try {
      await rejectFriendRequest(friendId);
      fetchPending();
      setSentRequests((prev) => prev.filter((id) => id !== friendId));
      Alert.alert("Thành công", "Đã hủy lời mời kết bạn!");
    } catch (e: any) {
      setError(e?.message || "Hủy lời mời thất bại");
      Alert.alert("Lỗi", e?.message || "Hủy lời mời thất bại");
    } finally {
      setLoadingRequest(null);
    }
  };

  const renderActivityItem = ({ item }: { item: Activity }) => {
    console.log("activity.avatar:", item.avatar, "image:", item.image);
    return (
      <TouchableOpacity style={styles.activityItem}>
        <Image
          source={{
            uri: item.image
              ? item.image.startsWith("http")
                ? item.image
                : `${BASE_URL}/${item.image.replace(/\\/g, "/")}`
              : item.avatar
              ? item.avatar.startsWith("http")
                ? item.avatar
                : `${BASE_URL}/${item.avatar.replace(/\\/g, "/")}`
              : undefined,
          }}
          style={styles.activityAvatar}
        />
        <Text style={styles.activityName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const renderFriendItem = ({ item }: { item: any }) => {
    console.log("friend.avatar:", item.avatar, "image:", item.image);
    const isOnline = onlineFriends.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.messageItem}
        onPress={() =>
          navigation.navigate("MessageDetail", {
            name: item.name,
            avatar: item.image
              ? item.image.startsWith("http")
                ? item.image
                : `${BASE_URL}/${item.image.replace(/\\/g, "/")}`
              : item.avatar
              ? item.avatar.startsWith("http")
                ? item.avatar
                : `${BASE_URL}/${item.avatar.replace(/\\/g, "/")}`
              : undefined,
            friendId: item.id,
          })
        }
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{
              uri: item.image
                ? item.image.startsWith("http")
                  ? item.image
                  : `${BASE_URL}/${item.image.replace(/\\/g, "/")}`
                : item.avatar
                ? item.avatar.startsWith("http")
                  ? item.avatar
                  : `${BASE_URL}/${item.avatar.replace(/\\/g, "/")}`
                : undefined,
            }}
            style={styles.messageAvatar}
          />
          <View
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: isOnline ? "#0f0" : "#888",
              borderWidth: 2,
              borderColor: "#1C2526",
            }}
          />
        </View>
        <View style={styles.messageContent}>
          <Text style={styles.messageName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPendingItem = ({ item }: { item: any }) => {
    console.log(
      "pending.avatar:",
      item.user?.avatar,
      "image:",
      item.user?.image
    );
    return (
      <View style={styles.messageItem}>
        <Image
          source={{
            uri: item.user?.image
              ? item.user.image.startsWith("http")
                ? item.user.image
                : `${BASE_URL}/${item.user.image.replace(/\\/g, "/")}`
              : item.user?.avatar
              ? item.user.avatar.startsWith("http")
                ? item.user.avatar
                : `${BASE_URL}/${item.user.avatar.replace(/\\/g, "/")}`
              : "https://via.placeholder.com/50?text=User",
          }}
          style={styles.messageAvatar}
        />
        <View style={styles.messageContent}>
          <Text style={styles.messageName}>{item.user?.name}</Text>
        </View>
        <TouchableOpacity
          style={{ marginRight: 10 }}
          onPress={() => handleAccept(item.user?.id)}
        >
          <Text style={{ color: "#0f0" }}>Chấp nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleReject(item.user?.id)}>
          <Text style={{ color: "#f00" }}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: any }) => {
    console.log("search.avatar:", item.avatar, "image:", item.image);
    const isSent = sentRequests.includes(item.id);
    const isFriend = friends.some((f) => f.id === item.id);
    return (
      <View style={styles.messageItem}>
        <Image
          source={{
            uri: item.image
              ? item.image.startsWith("http")
                ? item.image
                : `${BASE_URL}/${item.image.replace(/\\/g, "/")}`
              : item.avatar
              ? item.avatar.startsWith("http")
                ? item.avatar
                : `${BASE_URL}/${item.avatar.replace(/\\/g, "/")}`
              : undefined,
          }}
          style={styles.messageAvatar}
        />
        <View style={styles.messageContent}>
          <Text style={styles.messageName}>{item.name}</Text>
        </View>
        {isFriend ? (
          <Text style={{ color: "#0f0", marginRight: 10 }}>Bạn bè</Text>
        ) : isSent ? (
          <TouchableOpacity
            onPress={() => handleCancelRequest(item.id)}
            disabled={loadingRequest === item.id}
          >
            <Text
              style={{
                color: "#888",
                marginRight: 10,
              }}
            >
              {loadingRequest === item.id ? "Đang hủy..." : "Hủy lời mời"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => handleSendRequest(item.id)}
            disabled={loadingRequest === item.id}
          >
            <Text style={{ color: "#FF4444" }}>
              {loadingRequest === item.id ? "Đang gửi..." : "Kết bạn"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Số lượng thông báo chưa đọc
  const unreadCount = notifications.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message</Text>
        <TouchableOpacity
          onPress={() => setShowNotificationModal(true)}
          style={{ position: "relative" }}
        >
          <Ionicons name="notifications" size={24} color="#fff" />
          {unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                backgroundColor: "#FF4444",
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Tabs giống Zalo */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginVertical: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => setTab("friends")}
          style={{ marginHorizontal: 20, position: "relative" }}
        >
          <Text
            style={{
              color: tab === "friends" ? "#FF4444" : "#fff",
              fontWeight: "bold",
            }}
          >
            Bạn bè
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("pending")}
          style={{ marginHorizontal: 20, position: "relative" }}
        >
          <Text
            style={{
              color: tab === "pending" ? "#FF4444" : "#fff",
              fontWeight: "bold",
            }}
          >
            Lời mời kết bạn
          </Text>
          {badgeCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -16,
                backgroundColor: "#FF4444",
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
                zIndex: 10,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                {badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Tìm kiếm người dùng */}
      <View style={{ flexDirection: "row", margin: 10 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: "#2C3539",
            borderRadius: 20,
            color: "#fff",
            paddingHorizontal: 15,
          }}
          placeholder="Tìm kiếm người dùng..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          onPress={handleSearch}
          style={{
            marginLeft: 10,
            backgroundColor: "#FF4444",
            borderRadius: 20,
            padding: 10,
          }}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
        />
      )}
      {/* Tìm kiếm bạn bè trong danh sách bạn */}
      {tab === "friends" && (
        <View style={{ flexDirection: "row", margin: 10 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: "#2C3539",
              borderRadius: 20,
              color: "#fff",
              paddingHorizontal: 15,
            }}
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor="#888"
            value={friendSearch}
            onChangeText={setFriendSearch}
          />
        </View>
      )}
      {/* Danh sách bạn bè hoặc lời mời */}
      {tab === "friends" ? (
        loadingFriends ? (
          <Text
            style={{ color: "#fff", textAlign: "center", marginVertical: 5 }}
          >
            Đang tải danh sách bạn bè...
          </Text>
        ) : (
          <FlatList
            data={filteredFriends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messageList}
          />
        )
      ) : loadingPending ? (
        <Text style={{ color: "#fff", textAlign: "center", marginVertical: 5 }}>
          Đang tải lời mời...
        </Text>
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderPendingItem}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          contentContainerStyle={styles.messageList}
        />
      )}
      {error ? (
        <Text
          style={{ color: "#FF4444", textAlign: "center", marginVertical: 5 }}
        >
          {error}
        </Text>
      ) : null}
      {loadingSearch ? (
        <Text style={{ color: "#fff", textAlign: "center", marginVertical: 5 }}>
          Đang tìm kiếm...
        </Text>
      ) : null}
      {/* Modal danh sách thông báo */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={() => setShowNotificationModal(false)}
        />
        <View
          style={{
            position: "absolute",
            top: 60,
            right: 10,
            left: 10,
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            maxHeight: 400,
            zIndex: 9999,
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
            Thông báo
          </Text>
          {notifications.length === 0 ? (
            <Text style={{ color: "#888", textAlign: "center" }}>
              Không có thông báo nào
            </Text>
          ) : (
            notifications.map((noti) => (
              <TouchableOpacity
                key={noti.id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
                onPress={() => {
                  setSelectedNotification(noti);
                  setNotifications((prev) =>
                    prev.filter((n) => n.id !== noti.id)
                  );
                }}
              >
                <Text style={{ fontWeight: "bold", color: "#333" }}>
                  {noti.title}
                </Text>
                <Text style={{ color: "#666", fontSize: 12 }}>
                  {noti.content}
                </Text>
                <Text style={{ color: "#aaa", fontSize: 10 }}>
                  {new Date(noti.timestamp).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            style={{ marginTop: 10, alignSelf: "center" }}
            onPress={() => setShowNotificationModal(false)}
          >
            <Text style={{ color: "#FF4444", fontWeight: "bold" }}>Đóng</Text>
          </TouchableOpacity>
        </View>
        {/* Modal chi tiết thông báo */}
        {selectedNotification && (
          <Modal
            visible={!!selectedNotification}
            animationType="fade"
            transparent
            onRequestClose={() => setSelectedNotification(null)}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
              onPress={() => setSelectedNotification(null)}
            />
            <View
              style={{
                position: "absolute",
                top: 120,
                right: 20,
                left: 20,
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 20,
                zIndex: 99999,
              }}
            >
              <Text
                style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
              >
                {selectedNotification.title}
              </Text>
              <Text style={{ color: "#333", marginBottom: 10 }}>
                {selectedNotification.content}
              </Text>
              <Text style={{ color: "#aaa", fontSize: 12 }}>
                {new Date(selectedNotification.timestamp).toLocaleString()}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 20, alignSelf: "center" }}
                onPress={() => setSelectedNotification(null)}
              >
                <Text style={{ color: "#FF4444", fontWeight: "bold" }}>
                  Đã đọc
                </Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
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
  section: {
    padding: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  activityList: {
    paddingRight: 15,
  },
  activityItem: {
    alignItems: "center",
    marginRight: 15,
  },
  activityAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  activityName: {
    color: "#fff",
    fontSize: 12,
  },
  messageList: {
    paddingBottom: 15,
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  messageContent: {
    flex: 1,
  },
  messageName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  messageText: {
    color: "#888",
    fontSize: 12,
  },
  messageMeta: {
    alignItems: "flex-end",
  },
  messageTime: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default MessageScreen;
