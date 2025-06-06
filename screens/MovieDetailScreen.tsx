import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import {
  getMovieDetail,
  rateMovie,
  getMovieAverageRating,
  getMovieRatings,
  getSimilarMovies,
} from "../api/api";
import { Movie } from "../types";
import { BASE_URL } from "../config/config";
import { RootStackParamList } from "../types";
import { StackNavigationProp } from "@react-navigation/stack";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useUserContext } from "../context/UserContext";
import { Rating } from "react-native-ratings";
import MovieComments from "../components/MovieComments";

// Định nghĩa interface cho dữ liệu diễn viên
interface CastMember {
  id: string;
  name: string;
}

const MovieDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "MovieDetail">>();
  const { movieId } = route.params;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [castList, setCastList] = useState<CastMember[]>([]);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  const { user } = useUserContext();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [ratings, setRatings] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const movieData = await getMovieDetail(movieId);
        const movieDetail: Movie = {
          ...movieData,
          release_date: movieData.release_date.toString(),
        };
        // console.log("movieDetail", movieDetail);
        setMovie(movieDetail);

        // Chỉ xử lý cast nếu có dữ liệu
        if (
          movieDetail.cast &&
          typeof movieDetail.cast === "string" &&
          movieDetail.cast.trim() !== ""
        ) {
          try {
            const castMembers = movieDetail.cast
              .split(",")
              .map((name) => name.trim())
              .filter((name) => name.length > 0)
              .map((name, index) => ({
                id: index.toString(),
                name: name,
              }));
            setCastList(castMembers);
          } catch (error) {
            console.error("Error parsing cast:", error);
            setCastList([]);
          }
        } else {
          setCastList([]);
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin phim.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
    fetchMovieAverageRating();
    fetchMovieRatings();
    // Lấy phim tương tự
    const fetchSimilar = async () => {
      if (!movieId) return;
      setLoadingSimilar(true);
      try {
        const data = await getSimilarMovies(movieId);
        // Log dữ liệu để debug
        console.log("Similar movies raw data:", data);
        let movies: Movie[] = [];
        if (Array.isArray(data)) {
          movies = data
            .map((item: any) => item && item.movie)
            .filter((m: any) => m && m.id);
        } else if (Array.isArray(data?.data)) {
          movies = data.data
            .map((item: any) => item && item.movie)
            .filter((m: any) => m && m.id);
        }
        setSimilarMovies(movies);
      } catch (e) {
        setSimilarMovies([]);
      } finally {
        setLoadingSimilar(false);
      }
    };
    fetchSimilar();
  }, [movieId, user]);

  const fetchMovieAverageRating = async () => {
    try {
      const res = await getMovieAverageRating(movieId);
      setAverageRating(res.average);
      setRatingCount(res.count);
    } catch (e) {
      setAverageRating(null);
      setRatingCount(0);
    }
  };

  const fetchMovieRatings = async () => {
    try {
      const res = await getMovieRatings(movieId);
      const ratingsArr = Array.isArray(res) ? res : res.ratings || [];
      setRatings(ratingsArr);
      // Tìm rating của user hiện tại
      if (user) {
        const myRating = ratingsArr.find(
          (r: any) => r.user_id === user.id || (r.user && r.user.id === user.id)
        );
        if (myRating) {
          setUserRating(myRating.rating);
        } else {
          setUserRating(0);
        }
      }
    } catch (e) {
      setRatings([]);
      setUserRating(0);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) {
      Alert.alert("Bạn cần đăng nhập để đánh giá");
      return;
    }
    if (userRating < 1 || userRating > 5) {
      Alert.alert("Vui lòng chọn số sao (1-5)");
      return;
    }
    setSubmitting(true);
    try {
      console.log("check user.id", user.id, movieId, userRating, userComment);
      await rateMovie(movieId, user.id, userRating, userComment);
      Alert.alert("Cảm ơn bạn đã đánh giá!");
      setUserComment("");
      fetchMovieAverageRating();
      fetchMovieRatings();
    } catch (e) {
      console.log("Lỗi gửi đánh giá:", e);
      Alert.alert("Lỗi", "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingNow = () => {
    if (movie) {
      navigation.navigate("Booking", {
        movieId: movie.id.toString(),
        movieName: movie.title,
      });
    }
  };

  const renderCastItem = ({ item }: { item: CastMember }) => {
    return (
      <View style={styles.castItem}>
        <View style={styles.castAvatarPlaceholder}>
          <Text style={styles.castInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.castName}>
          <Text>🎭</Text> {item.name}
        </Text>
      </View>
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          <Text>Không thể tải thông tin phim</Text>
        </Text>
      </View>
    );
  }

  // Xử lý hiển thị các văn bản
  const renderDescription = () => {
    if (!movie.description) {
      return "Chưa có mô tả";
    }
    return movie.description;
  };

  const renderGenres = () => {
    if (!movie.genres || movie.genres.length === 0) {
      return "Chưa phân loại";
    }
    return movie.genres.map((g) => g.name).join(", ");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Text>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết phim</Text>
          <TouchableOpacity>
            <Text>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.posterContainer}>
            <Image
              source={{
                uri: movie.poster_url?.startsWith("http")
                  ? movie.poster_url
                  : `${BASE_URL}${movie.poster_url}`,
              }}
              style={styles.posterImage}
              defaultSource={require("../assets/icon.png")}
            />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.title}>
              <Text>🎬</Text> {movie.title || "Chưa có tiêu đề"}
            </Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {movie.director
                  ? `Đạo diễn: ${movie.director}`
                  : "Chưa có thông tin đạo diễn"}
              </Text>
              <View style={styles.ratingContainer}>
                <Text>
                  <Ionicons name="star" size={16} color="#FFD700" />
                </Text>
                <Text style={styles.ratingText}>
                  {movie.rating ? movie.rating.toFixed(1) : "N/A"}
                </Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {movie.genres && movie.genres.length > 0
                  ? movie.genres.map((g) => g.name).join(", ")
                  : "Chưa phân loại"}
              </Text>
              <Text style={styles.detailText}>
                <Text>⏰</Text> {movie.duration || 0} phút
              </Text>
            </View>
            {(movie.age_restriction ?? 0) > 0 && (
              <View style={styles.ageRestriction}>
                <Text style={styles.ageRestrictionText}>
                  {movie.age_restriction}+
                </Text>
              </View>
            )}
            <Text style={styles.release}>
              Ngày phát hành: <Text>📅</Text>{" "}
              {movie.release_date
                ? new Date(movie.release_date).toLocaleDateString()
                : "Chưa có ngày phát hành"}
            </Text>
            <Text style={styles.synopsis}>
              {movie.description || "Chưa có mô tả"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 8,
              }}
            >
              <Rating
                readonly
                startingValue={averageRating || 0}
                imageSize={20}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ color: "#FFD700", fontWeight: "bold", marginRight: 8 }}
              >
                {averageRating ? averageRating.toFixed(1) : "N/A"}
              </Text>
              <Text style={{ color: "#888" }}>({ratingCount} đánh giá)</Text>
            </View>
          </View>
          {movie.cast && movie.cast.trim() !== "" && (
            <View style={styles.castSection}>
              <Text style={styles.castTitle}>Diễn viên</Text>
              <FlatList
                data={castList}
                renderItem={renderCastItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
          {movie.trailer_url && movie.trailer_url.trim() !== "" && (
            <View style={styles.trailerSection}>
              <Text style={styles.trailerTitle}>
                <Text>🎥</Text> Trailer
              </Text>
              {!isTrailerPlaying ? (
                <TouchableOpacity
                  style={styles.trailerThumbnail}
                  onPress={() => setIsTrailerPlaying(true)}
                >
                  <Image
                    source={{
                      uri: movie.poster_url?.startsWith("http")
                        ? movie.poster_url
                        : `${BASE_URL}${movie.poster_url}`,
                    }}
                    style={styles.trailerThumbnailImage}
                    defaultSource={require("../assets/icon.png")}
                  />
                  <View style={styles.playIconOverlay}>
                    <Text>
                      <Ionicons name="play-circle" size={64} color="white" />
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Video
                  ref={videoRef}
                  source={{
                    uri: movie.trailer_url?.startsWith("http")
                      ? movie.trailer_url
                      : `${BASE_URL}${movie.trailer_url}`,
                  }}
                  style={styles.trailerVideo}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (!status.isLoaded) {
                      if ("error" in status) {
                        console.error("Playback Error:", status.error);
                        setIsTrailerPlaying(false);
                      }
                    } else if (status.didJustFinish === true) {
                      setIsTrailerPlaying(false);
                    }
                  }}
                />
              )}
            </View>
          )}
          <TouchableOpacity
            style={styles.bookingButton}
            onPress={handleBookingNow}
          >
            <Text style={styles.bookingText}>
              <Text>📅</Text> Đặt vé ngay
            </Text>
          </TouchableOpacity>
          {/* Đánh giá của tôi */}
          {user && (
            <View
              style={{
                marginVertical: 16,
                backgroundColor: "#fff",
                borderRadius: 8,
                padding: 16,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{ fontWeight: "bold", marginBottom: 8, fontSize: 16 }}
              >
                Đánh giá của bạn
              </Text>
              <Rating
                startingValue={userRating}
                imageSize={36}
                onFinishRating={setUserRating}
                style={{ marginBottom: 16 }}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: "#FF4444",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  alignItems: "center",
                  marginTop: 4,
                }}
                onPress={handleSubmitRating}
                disabled={submitting}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                >
                  Gửi đánh giá
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Gợi ý phim tương tự */}
          {similarMovies.length > 0 && (
            <View style={{ marginVertical: 16 }}>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginLeft: 15,
                  marginBottom: 8,
                }}
              >
                Phim tương tự
              </Text>
              {loadingSimilar ? (
                <ActivityIndicator size="small" color="#FF4444" />
              ) : (
                <FlatList
                  data={similarMovies
                    .filter((item: any) => !!item.id)
                    .slice(0, 10)}
                  renderItem={({ item }: { item: Movie }) => (
                    <TouchableOpacity
                      style={{ width: 120, marginHorizontal: 8 }}
                      onPress={() =>
                        navigation.push("MovieDetail", { movieId: item.id })
                      }
                    >
                      <Image
                        source={{
                          uri: item.poster_url?.startsWith("http")
                            ? item.poster_url
                            : `${BASE_URL}${item.poster_url}`,
                        }}
                        style={{
                          width: 120,
                          height: 180,
                          borderRadius: 10,
                          backgroundColor: "#222",
                        }}
                      />
                      <Text
                        style={{ color: "#fff", fontSize: 13, marginTop: 5 }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item: any) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 15 }}
                />
              )}
            </View>
          )}
          {/* Phần bình luận tách biệt */}
          <View style={{ marginTop: 16, marginBottom: 32 }}>
            <MovieComments movieId={movie.id} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1C2526",
  },
  errorText: {
    color: "#FF4444",
    fontSize: 16,
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
  content: {
    flex: 1,
  },
  poster: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  infoContainer: {
    padding: 15,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
    lineHeight: 32,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailText: {
    color: "#AAA",
    fontSize: 15,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 14,
    marginLeft: 5,
  },
  release: {
    color: "#888",
    fontSize: 14,
    marginBottom: 10,
  },
  ageRestriction: {
    backgroundColor: "#FF4444",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  ageRestrictionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  synopsis: {
    color: "#DDD",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: "italic",
  },
  castSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  castTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  castItem: {
    alignItems: "center",
    marginRight: 15,
    width: 70,
  },
  castInitial: {
    color: "#FF4444",
    fontSize: 24,
    fontWeight: "bold",
  },
  castName: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  castAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#39414A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  bookingButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    alignItems: "center",
    margin: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bookingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  posterContainer: {
    width: "100%",
    height: 300,
    marginBottom: 20,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },

  posterImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  movieTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  trailerSection: {
    marginVertical: 15,
    paddingHorizontal: 15,
  },
  trailerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  trailerThumbnail: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
  },
  trailerThumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  trailerVideo: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
});

export default MovieDetailScreen;
