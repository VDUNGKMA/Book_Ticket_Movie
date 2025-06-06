import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getInviteHistory } from "../api/api";
import { BASE_URL } from "../config/config";

const InviteHistoryScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getInviteHistory();
      console.log("[Invite] Nhận lịch sử lời mời:", data);
      setHistory(data);
    } catch (e) {
      setHistory([]);
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    // Ưu tiên lấy thông tin từ message (backend mới lưu trực tiếp)
    const movieTitle = item.movie_title || item.screening?.movie?.title;
    const moviePoster = item.movie_poster || item.screening?.movie?.poster_url;
    const screeningTime = item.screening_time || item.screening?.start_time;
    const roomName = item.room_name || item.screening?.theaterRoom?.room_name;
    const theaterName =
      item.theater_name || item.screening?.theaterRoom?.theater?.name;
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={{
              uri: item.sender?.image?.startsWith("http")
                ? item.sender.image
                : `${BASE_URL}/${item.sender?.image}`,
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{item.sender?.name}</Text>
          <Text style={{ marginHorizontal: 8 }}>→</Text>
          <Image
            source={{
              uri: item.receiver?.image?.startsWith("http")
                ? item.receiver.image
                : `${BASE_URL}/${item.receiver?.image}`,
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{item.receiver?.name}</Text>
        </View>
        <Text style={styles.content}>{item.content}</Text>
        {movieTitle && (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
          >
            {moviePoster ? (
              <Image
                source={{
                  uri: moviePoster.startsWith("http")
                    ? moviePoster
                    : `${BASE_URL}${moviePoster}`,
                }}
                style={styles.poster}
              />
            ) : null}
            <View style={{ marginLeft: 8 }}>
              <Text style={{ fontWeight: "bold" }}>{movieTitle}</Text>
              {theaterName && (
                <Text style={{ color: "#666" }}>Rạp: {theaterName}</Text>
              )}
              {screeningTime && (
                <Text style={{ color: "#666" }}>
                  Suất chiếu: {new Date(screeningTime).toLocaleString()}
                </Text>
              )}
              {roomName && (
                <Text style={{ color: "#666" }}>Phòng chiếu: {roomName}</Text>
              )}
            </View>
          </View>
        )}
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", margin: 16 }}>
        Lịch sử lời mời đặt vé
      </Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
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
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 4 },
  name: { fontWeight: "bold", marginRight: 8 },
  content: { color: "#333", marginTop: 4 },
  poster: { width: 40, height: 56, borderRadius: 4 },
  time: { color: "#888", fontSize: 12, marginTop: 4 },
});

export default InviteHistoryScreen;
