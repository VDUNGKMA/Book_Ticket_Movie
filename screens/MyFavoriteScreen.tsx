import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

// Định nghĩa interface cho dữ liệu phim
interface Movie {
  id: string;
  title: string;
  genre: string;
  addedDate: string;
  synopsis: string;
}

// Dữ liệu giả cho danh sách phim yêu thích
const movies: Movie[] = [
  {
    id: "1",
    title: "Deadpool & Wolverine",
    genre: "Action",
    addedDate: "Added on 14 June 2024",
    synopsis:
      "The story follows Wade Wilson who has retired from his superhero life...",
  },
  {
    id: "2",
    title: "Abigail",
    genre: "Adventure",
    addedDate: "Added on 14 June 2024",
    synopsis:
      "2 teenagers, English, 1080p. The story follows a group of criminals...",
  },
  {
    id: "3",
    title: "Spies in Disguise",
    genre: "Mystery",
    addedDate: "Added on 30 May 2024",
    synopsis: "When the world’s best spy is turned into a pigeon...",
  },
];

const MyFavoriteScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");

  // Lọc danh sách phim dựa trên thể loại và tìm kiếm
  const filteredMovies = movies.filter((movie) => {
    const matchesGenre =
      selectedGenre === "All" || movie.genre === selectedGenre;
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <View style={styles.movieCard}>
      <Text style={styles.addedDate}>{item.addedDate}</Text>
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{item.title}</Text>
        <Text style={styles.movieGenre}>{item.genre}</Text>
        <Text style={styles.movieSynopsis}>{item.synopsis}</Text>
      </View>
      <TouchableOpacity style={styles.favoriteIcon}>
        <Ionicons name="heart" size={20} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorite</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search something..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Phân loại thể loại */}
      <View style={styles.genreTabs}>
        {["All", "Action", "Adventure", "Mystery"].map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreTab,
              selectedGenre === genre && styles.genreTabActive,
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text
              style={[
                styles.genreText,
                selectedGenre === genre && styles.genreTextActive,
              ]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách phim yêu thích */}
      <FlatList
        data={filteredMovies}
        renderItem={renderMovieItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.movieList}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: 50,
  },
  genreTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  genreTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  genreTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF4444",
  },
  genreText: {
    color: "#888",
    fontSize: 14,
  },
  genreTextActive: {
    color: "#FF4444",
    fontWeight: "bold",
  },
  movieList: {
    padding: 15,
  },
  movieCard: {
    flexDirection: "row",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  addedDate: {
    color: "#888",
    fontSize: 12,
    marginRight: 10,
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  movieGenre: {
    color: "#888",
    fontSize: 14,
    marginBottom: 5,
  },
  movieSynopsis: {
    color: "#fff",
    fontSize: 12,
  },
  favoriteIcon: {
    marginLeft: 10,
  },
});

export default MyFavoriteScreen;
