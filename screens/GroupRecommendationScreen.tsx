import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  getGroupAdvancedRecommendations,
  sendScreeningInvites,
  getFriends,
} from "../api/api";
import { useUserContext } from "../context/UserContext";
import { BASE_URL } from "../config/config";
import { useChatContext } from "../context/ChatContext";

const GroupRecommendationScreen = () => {
  console.log("GroupRecommendationScreen mounted");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const { user } = useUserContext();
  const { sendMessage } = useChatContext();

  useEffect(() => {
    console.log("GroupRecommendationScreen useEffect []");
    fetchRecommendations();
    fetchFriends();
  }, []);

  useEffect(() => {
    console.log("recommendations changed:", recommendations);
  }, [recommendations]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await getGroupAdvancedRecommendations();
      console.log("Fetched group recommendations:", data);
      setRecommendations(data);
    } catch (e) {
      console.log("Error fetching group recommendations:", e);
      Alert.alert("Lỗi", "Không thể tải gợi ý nhóm bạn bè");
    }
    setLoading(false);
  };

  const fetchFriends = async () => {
    try {
      const data = await getFriends();
      setFriends(data);
    } catch (e) {}
  };

  const handleInvite = async (
    screeningId: number,
    movie: any,
    screening: any
  ) => {
    if (!selectedFriends.length) {
      Alert.alert("Chọn bạn bè", "Vui lòng chọn ít nhất một bạn để mời!");
      return;
    }
    setSending(true);
    try {
      // Chỉ gọi API gửi lời mời, không gửi message qua socket nữa
      await sendScreeningInvites(
        selectedFriends,
        screeningId,
        "Đi xem phim này với mình nhé!"
      );
      Alert.alert("Thành công", "Đã gửi lời mời cho bạn bè!");
    } catch (e) {
      Alert.alert("Lỗi", "Không gửi được lời mời");
    }
    setSending(false);
  };

  const renderFriendSelector = () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: 8 }}>
      {friends.map((f: any) => (
        <TouchableOpacity
          key={f.id}
          style={{
            backgroundColor: selectedFriends.includes(f.id)
              ? "#007bff"
              : "#eee",
            padding: 8,
            borderRadius: 16,
            margin: 4,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => {
            setSelectedFriends((prev) =>
              prev.includes(f.id)
                ? prev.filter((id) => id !== f.id)
                : [...prev, f.id]
            );
          }}
        >
          <Image
            source={{
              uri: f.image?.startsWith("http")
                ? f.image
                : `${BASE_URL}/${f.image}`,
            }}
            style={{ width: 24, height: 24, borderRadius: 12, marginRight: 4 }}
          />
          <Text
            style={{ color: selectedFriends.includes(f.id) ? "#fff" : "#333" }}
          >
            {f.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    console.log("Rendering item:", item);
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: "row" }}>
          <Image
            source={{
              uri: item.movie.poster_url?.startsWith("http")
                ? item.movie.poster_url
                : `${BASE_URL}${item.movie.poster_url}`,
            }}
            style={styles.poster}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>{item.movie.title}</Text>
            <Text style={styles.genre}>
              {item.popularGenre.map((g: any) => g.name).join(", ")}
            </Text>
            <Text style={styles.time}>
              Suất chiếu: {new Date(item.screening.start_time).toLocaleString()}
            </Text>
            <Text style={styles.room}>
              Phòng chiếu: {item.theaterRoom.room_name}
            </Text>
            <Text style={styles.room}>
              Rạp: {item.theaterName || item.theaterRoom.theater?.name || ""}
            </Text>
            <Text style={styles.friends}>
              Bạn bè từng đặt: {item.friendsBooked.length}
            </Text>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() =>
                handleInvite(item.screening.id, item.movie, item.screening)
              }
              disabled={sending}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Mời bạn bè cùng xem
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", margin: 16 }}>
        Gợi ý nhóm bạn bè
      </Text>
      <Text style={{ marginHorizontal: 16, marginBottom: 8 }}>
        Chọn bạn bè để mời:
      </Text>
      {renderFriendSelector()}
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.screening.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    margin: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  poster: { width: 90, height: 120, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  genre: { color: "#007bff", marginBottom: 4 },
  time: { color: "#333", marginBottom: 2 },
  room: { color: "#333", marginBottom: 2 },
  friends: { color: "#666", marginBottom: 8 },
  inviteBtn: {
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
});

export default GroupRecommendationScreen;
