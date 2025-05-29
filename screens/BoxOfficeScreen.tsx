import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Dữ liệu giả lập cho danh sách phim
const movies = [
  {
    id: "1",
    title: "Wicked Little",
    poster: "https://via.placeholder.com/120x180.png?text=Wicked+Little",
    duration: "2h 10m",
    language: "English",
    description:
      "A 2023 British mystery film directed by Theo James. Set in a remote village amidst a chilling fog...",
    rating: "Top 4",
  },
  {
    id: "2",
    title: "Deadpool & Wolverine",
    poster: "https://via.placeholder.com/120x180.png?text=Deadpool+&+Wolverine",
    duration: "2h 7m",
    language: "English",
    description:
      "A thrilling superhero film featuring Ryan Reynolds and Hugh Jackman in a battle of epic proportions...",
    rating: "Top 3",
  },
  {
    id: "3",
    title: "Abigail",
    poster: "https://via.placeholder.com/120x180.png?text=Abigail",
    duration: "1h 50m",
    language: "English",
    description:
      "A horror film about a young ballerina daughter of a powerful underworld figure...",
    rating: "Top 2",
  },
  {
    id: "4",
    title: "Above The Trees",
    poster: "https://via.placeholder.com/120x180.png?text=Above+The+Trees",
    duration: "2h 5m",
    language: "English",
    description:
      "The film follows with Gustavo Salmeron taking his father on a road trip...",
    rating: "Top 1",
  },
];

const BoxOfficeScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const renderMovieItem = ({ item }: { item: (typeof movies)[0] }) => (
    <View style={styles.movieItem}>
      <Image source={{ uri: item.poster }} style={styles.moviePoster} />
      <View style={styles.movieDetails}>
        <Text style={styles.movieTitle}>{item.title}</Text>
        <Text style={styles.movieInfo}>
          {item.duration} | {item.language}
        </Text>
        <Text style={styles.movieDescription}>{item.description}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.movieRating}>{item.rating}</Text>
          <TouchableOpacity>
            <Text>
              <Ionicons name="heart-outline" size={20} color="#FF4444" />
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Box Office <Text style={styles.fireIcon}>🔥</Text>
        </Text>
        <TouchableOpacity>
          <Text>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Text>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={styles.searchIcon}
          />
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search something..."
          placeholderTextColor="#888"
          editable={false} // Tạm thời vô hiệu để khớp với ảnh
        />
      </View>

      {/* Thanh phân loại */}
      <View style={styles.categoryContainer}>
        {["All", "Action", "Adventure", "Mystery"].map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách phim */}
      <FlatList
        data={movies}
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
  fireIcon: {
    fontSize: 16,
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
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#2C3539",
  },
  categoryTabActive: {
    backgroundColor: "#FF4444",
  },
  categoryText: {
    color: "#888",
    fontSize: 14,
  },
  categoryTextActive: {
    color: "#fff",
  },
  movieList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  movieItem: {
    flexDirection: "row",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
  },
  moviePoster: {
    width: 120,
    height: 180,
  },
  movieDetails: {
    flex: 1,
    padding: 10,
  },
  movieTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  movieInfo: {
    color: "#888",
    fontSize: 14,
    marginBottom: 5,
  },
  movieDescription: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  movieRating: {
    color: "#FF4444",
    fontSize: 14,
  },
});

export default BoxOfficeScreen;
