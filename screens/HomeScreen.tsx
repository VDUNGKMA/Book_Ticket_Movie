import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import {
  getPopularMovies,
  getUpcomingMovies,
  getNowPlayingMovies,
  getTopRatedMovies,
  getPersonalRecommendationsByToken,
  getRecommendationsByTime,
  getRecommendationsByLocation,
  getRecommendationsByWeather,
  getMovieDetail,
  getRecommendedMoviesWithScreenings,
  MovieWithScreenings,
} from "../api/api";
import { useUserContext } from "../context/UserContext";
import { Movie } from "../types";
import { BASE_URL } from "../config/config";
import IncomingCallModal from "../components/IncomingCallModal";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";

// Thêm lại khai báo global để tránh lỗi
declare global {
  var redirectAfterLogin: {
    screen: keyof RootStackParamList;
    params: any;
  } | null;
}

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [personalMovies, setPersonalMovies] = useState<Movie[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<
    MovieWithScreenings[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const { user } = useUserContext();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const [popular, upcoming, nowPlaying, topRated] = await Promise.all([
          getPopularMovies(),
          getUpcomingMovies(),
          getNowPlayingMovies(),
          getTopRatedMovies(),
        ]);
        setPopularMovies(popular);
        setUpcomingMovies(upcoming);
        setNowPlayingMovies(nowPlaying);
        setTopRatedMovies(topRated);
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();

    // Gợi ý cá nhân hóa
    const fetchPersonalRecommendations = async () => {
      try {
        setLoadingPersonal(true);
        const token = await SecureStore.getItemAsync("access_token");
        if (user && token) {
          const data = await getPersonalRecommendationsByToken(token);
          let movies: Movie[] = [];
          if (Array.isArray(data)) {
            movies = data
              .map((item: any) => item.movie)
              .filter((m: any) => !!m?.id);
          } else if (Array.isArray(data?.data)) {
            movies = data.data
              .map((item: any) => item.movie)
              .filter((m: any) => !!m?.id);
          }
          setPersonalMovies(movies);
        } else {
          setPersonalMovies([]);
        }
      } catch (error) {
        setPersonalMovies([]);
        console.error("Error fetching personal recommendations:", error);
      } finally {
        setLoadingPersonal(false);
      }
    };
    if (user) fetchPersonalRecommendations();

    // Kiểm tra và xử lý chuyển hướng sau đăng nhập
    if (global.redirectAfterLogin) {
      const { screen, params } = global.redirectAfterLogin;

      // Thiết lập timeout để đảm bảo component đã render
      setTimeout(() => {
        navigation.navigate(screen as any, params);
        // Xóa thông tin chuyển hướng sau khi đã xử lý
        global.redirectAfterLogin = null;
      }, 500);
    }

    // Gợi ý phim kèm suất chiếu phù hợp nhất
    const fetchRecommendedMovies = async () => {
      try {
        setLoadingRecommended(true);
        // Lấy vị trí hiện tại (nếu muốn ưu tiên rạp gần nhất)
        let lat, lng;
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await Location.getCurrentPositionAsync({});
            lat = location.coords.latitude;
            lng = location.coords.longitude;
          }
        } catch (e) {
          // Nếu không lấy được vị trí, bỏ qua
        }
        if (user) {
          const data = await getRecommendedMoviesWithScreenings(
            user.id,
            lat,
            lng
          );
          setRecommendedMovies(data);
        } else {
          setRecommendedMovies([]);
        }
      } catch (error) {
        setRecommendedMovies([]);
        console.error(
          "Error fetching recommended movies with screenings:",
          error
        );
      } finally {
        setLoadingRecommended(false);
      }
    };
    if (user) fetchRecommendedMovies();
  }, [navigation, user]);

  const handleMoviePress = async (movie: Movie) => {
    navigation.navigate("MovieDetail", { movieId: movie.id });
  };

  const renderMovieCard = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => handleMoviePress(item)}
    >
      <Image
        source={{
          uri: item.poster_url?.startsWith("http")
            ? item.poster_url
            : `${BASE_URL}${item.poster_url}`,
        }}
        style={styles.moviePoster}
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.movieDetails}>
          <Text style={styles.duration}>{item.duration} phút</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating?.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <Text style={styles.logo}>MyBroFlix</Text>
            {user ? (
              user.image ? (
                <Image
                  source={{
                    uri: user.image.startsWith("http")
                      ? user.image
                      : `${BASE_URL}/${user.image.replace(/\\/g, "/")}`,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons
                  name="person-circle"
                  size={40}
                  color="#fff"
                  style={{ marginLeft: 10 }}
                />
              )
            ) : null}
          </View>

          {/* Nút Gợi ý nhóm bạn bè luôn hiển thị */}
          <TouchableOpacity
            style={{
              backgroundColor: "#007bff",
              padding: 12,
              borderRadius: 8,
              margin: 16,
              alignItems: "center",
            }}
            onPress={() => navigation.navigate("GroupRecommendation" as never)}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Gợi ý nhóm bạn bè
            </Text>
          </TouchableOpacity>

          {/* Gợi ý cá nhân hóa */}
          {user && personalMovies.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Dành riêng cho bạn</Text>
              </View>
              {loadingPersonal ? (
                <ActivityIndicator size="small" color="#FF4444" />
              ) : (
                <FlatList
                  data={personalMovies.filter((item) => !!item.id).slice(0, 5)}
                  renderItem={renderMovieCard}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.movieList}
                />
              )}
            </View>
          )}

          {/* Gợi ý phim kèm suất chiếu phù hợp nhất */}
          {user && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Phim & Suất chiếu phù hợp nhất
                </Text>
              </View>
              {loadingRecommended ? (
                <ActivityIndicator size="small" color="#FF4444" />
              ) : recommendedMovies.length === 0 ? (
                <Text style={{ color: "#888", marginLeft: 10 }}>
                  Không có phim phù hợp.
                </Text>
              ) : (
                recommendedMovies.map((rec) => (
                  <View key={rec.movie_id} style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() => handleMoviePress(rec.movie)}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Image
                          source={{
                            uri: rec.movie.poster_url?.startsWith("http")
                              ? rec.movie.poster_url
                              : `${BASE_URL}${rec.movie.poster_url}`,
                          }}
                          style={{
                            width: 80,
                            height: 120,
                            borderRadius: 8,
                            marginRight: 12,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                            {rec.movie.title}
                          </Text>
                          <Text style={{ color: "#888" }}>
                            {rec.movie.duration} phút
                          </Text>
                          <Text style={{ color: "#888" }}>
                            {rec.movie.genres
                              ?.map((g: any) => g.name)
                              .join(", ")}
                          </Text>
                          <Text style={{ color: "#FF4444", marginTop: 4 }}>
                            {rec.screenings.length} suất chiếu phù hợp
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    {/* Hiển thị các suất chiếu */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 8 }}
                    >
                      {rec.screenings.map((screening) => (
                        <View
                          key={screening.id}
                          style={{
                            backgroundColor: "#eee",
                            borderRadius: 6,
                            padding: 8,
                            marginRight: 8,
                            minWidth: 120,
                          }}
                        >
                          <Text style={{ fontWeight: "bold" }}>
                            {new Date(screening.start_time).toLocaleString(
                              "vi-VN"
                            )}
                          </Text>
                          <Text style={{ color: "#444" }}>
                            {screening.theaterRoom?.theater?.name || ""}
                          </Text>
                          <Text style={{ color: "#444" }}>
                            Phòng: {screening.theaterRoom?.room_name || ""}
                          </Text>
                          <Text style={{ color: "#444" }}>
                            Giá: {screening.price}đ
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Phim Phổ Biến */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phim Phổ Biến</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MovieList", { type: "popular" })
                }
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={popularMovies.filter((item) => !!item.id).slice(0, 5)}
              renderItem={renderMovieCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Phim Sắp Chiếu */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phim Sắp Chiếu</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MovieList", { type: "upcoming" })
                }
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={upcomingMovies.filter((item) => !!item.id).slice(0, 5)}
              renderItem={renderMovieCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Phim Đang Chiếu */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phim Đang Chiếu</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MovieList", { type: "nowPlaying" })
                }
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={nowPlayingMovies.filter((item) => !!item.id).slice(0, 5)}
              renderItem={renderMovieCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Phim Đánh Giá Cao */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phim Đánh Giá Cao</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MovieList", { type: "topRated" })
                }
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={topRatedMovies.filter((item) => !!item.id).slice(0, 5)}
              renderItem={renderMovieCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: "#1F1F1F",
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  logo: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 15,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  seeAllText: {
    color: "#BBBBBB",
    fontSize: 14,
  },
  movieCard: {
    width: 150,
    marginHorizontal: 8,
    backgroundColor: "#222",
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
  },
  moviePoster: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  movieInfo: {
    padding: 10,
  },
  movieTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  movieDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  duration: {
    color: "#AAAAAA",
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    color: "#FFD700",
    fontSize: 12,
    marginLeft: 5,
  },
  movieList: {
    paddingHorizontal: 15,
  },
});

export default HomeScreen;
