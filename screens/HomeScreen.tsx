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
} from "../api/api";
import { useUserContext } from "../context/UserContext";
import { Movie } from "../types";
import { BASE_URL } from "../config/config";

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
  const [loading, setLoading] = useState(true);
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
            data={popularMovies.slice(0, 5)}
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
            data={upcomingMovies.slice(0, 5)}
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
            data={nowPlayingMovies.slice(0, 5)}
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
            data={topRatedMovies.slice(0, 5)}
            renderItem={renderMovieCard}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
