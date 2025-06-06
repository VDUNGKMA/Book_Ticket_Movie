import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Movie } from "../types"; // Import kiểu Movie
import { BASE_URL } from "../config/config";
import {
  getNowPlayingMovies,
  getPopularMovies,
  getUpcomingMovies,
  getTopRatedMovies,
  getAllMovies,
} from "../api/api";
import { useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

const MovieListScreen: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { type } = route.params || {};

  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true);
        let data: Movie[] = [];
        if (type === "popular") {
          data = await getPopularMovies();
        } else if (type === "upcoming") {
          data = await getUpcomingMovies();
        } else if (type === "nowPlaying") {
          data = await getNowPlayingMovies();
        } else if (type === "topRated") {
          data = await getTopRatedMovies();
        } else {
          data = await getAllMovies();
        }
        setMovies(data);
      } catch (error) {
        console.error("Error loading movies:", error);
      } finally {
        setLoading(false);
      }
    };
    loadMovies();
  }, [type]);

  const getTitle = () => {
    if (type === "popular") return "Phim Phổ Biến";
    if (type === "upcoming") return "Phim Sắp Chiếu";
    if (type === "nowPlaying") return "Phim Đang Chiếu";
    if (type === "topRated") return "Phim Được Đánh Giá Cao";
    return "Tất cả phim";
  };

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate("MovieDetail", { movieId: item.id })}
    >
      <Image
        source={{
          uri: item.poster_url?.startsWith("http")
            ? item.poster_url
            : `${BASE_URL}${item.poster_url}`,
        }}
        style={styles.poster}
      />
      <Text style={styles.title}>{item.title}</Text>
      <TouchableOpacity style={styles.bookButton}>
        <Text style={styles.bookButtonText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{getTitle()}</Text>
      <FlatList
        data={movies}
        renderItem={renderMovieItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 10,
  },
  movieItem: {
    flex: 1,
    margin: 10,
    alignItems: "center",
  },
  poster: {
    width: 150,
    height: 200,
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  bookButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default MovieListScreen;
