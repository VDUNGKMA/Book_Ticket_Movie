import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Định nghĩa các interface cho dữ liệu
interface RecentSearchItem {
  id: string;
  title: string;
}

interface WatchedMovieItem {
  id: string;
  title: string;
  duration: string;
  rating: string;
  image: string;
}

interface BestCinemaMovieItem {
  id: string;
  title: string;
  rating: string;
  image: string;
  category: string; // Thêm category để lọc
  location: string; // Thêm location để lọc
  time: string; // Thêm time để lọc
}

interface BestCinemaSection {
  subtitle: string;
  promo: {
    title: string;
    description: string;
    link: string;
  };
  categories: string[];
  movies: BestCinemaMovieItem[];
}

interface SearchSection {
  type: string;
  title?: string;
  data?: (RecentSearchItem | WatchedMovieItem | BestCinemaSection)[];
  horizontal?: boolean;
  component?: React.ReactNode | null;
}

// Dữ liệu tổng hợp cho toàn bộ màn hình
const initialMovies: BestCinemaMovieItem[] = [
  {
    id: "1",
    title: "Abigail",
    rating: "4.8",
    image:
      "https://baobariavungtau.com.vn/dataimages/202502/original/images2002767_11M2.jpg",
    category: "Mystery",
    location: "San Diego",
    time: "08:00 AM",
  },
  {
    id: "2",
    title: "Above the Trees",
    rating: "4.5",
    image:
      "https://baobariavungtau.com.vn/dataimages/202502/original/images2002767_11M2.jpg",
    category: "Adventure",
    location: "New York",
    time: "08:30 AM",
  },
  {
    id: "3",
    title: "The Mystery of Dawn",
    rating: "4.7",
    image: "https://via.placeholder.com/100x150?text=The+Mystery+of+Dawn",
    category: "Mystery",
    location: "Others",
    time: "09:00 AM",
  },
];

const searchData: SearchSection[] = [
  {
    type: "searchBar",
    component: null,
  },
  {
    type: "section",
    title: "Last Search",
    data: [
      { id: "1", title: "Movie 2025" },
      { id: "2", title: "Spies in Disguise" },
      { id: "3", title: "Little Mermaid" },
    ],
  },
  {
    type: "section",
    title: "Watched a lot",
    data: [
      {
        id: "1",
        title: "Alien: Romulus",
        duration: "1hr 50min",
        rating: "4.6",
        image: "https://via.placeholder.com/100x150?text=Alien+Romulus",
      },
      {
        id: "2",
        title: "Am I OK?",
        duration: "1hr 20min",
        rating: "3.8",
        image: "https://via.placeholder.com/100x150?text=Am+I+OK",
      },
    ],
    horizontal: true,
  },
  {
    type: "section",
    title: "Best Cinema",
    data: [
      {
        subtitle: "Movies Found (3)", // Số lượng sẽ được cập nhật động
        promo: {
          title: "Family Promo on Weekend",
          description: "50% discount for family who want to watch films",
          link: "Grab it Now",
        },
        categories: ["All", "Action", "Adventure", "Mystery"],
        movies: initialMovies,
      },
    ],
    horizontal: true,
  },
];

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(
    searchData[1].data as RecentSearchItem[]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isFilterModalVisible, setIsFilterModalVisible] =
    useState<boolean>(false);

  // State cho các bộ lọc
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [filterTime, setFilterTime] = useState<string>("All");
  const [filteredMovies, setFilteredMovies] =
    useState<BestCinemaMovieItem[]>(initialMovies);

  const handleClearSearch = (id: string) => {
    setRecentSearches(recentSearches.filter((item) => item.id !== id));
  };

  const applyFilters = () => {
    let updatedMovies = initialMovies;

    // Lọc theo Category
    if (filterCategory !== "All") {
      updatedMovies = updatedMovies.filter(
        (movie) => movie.category === filterCategory
      );
    }

    // Lọc theo Location
    if (filterLocation !== "All") {
      updatedMovies = updatedMovies.filter(
        (movie) => movie.location === filterLocation
      );
    }

    // Lọc theo Time
    if (filterTime !== "All") {
      updatedMovies = updatedMovies.filter(
        (movie) => movie.time === filterTime
      );
    }

    setFilteredMovies(updatedMovies);
    setIsFilterModalVisible(false);
  };

  const resetFilters = () => {
    setFilterCategory("All");
    setFilterLocation("All");
    setFilterTime("All");
    setFilteredMovies(initialMovies);
  };

  const renderSearchBar = () => (
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
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery("")}>
          <Text>
            <Ionicons
              name="close"
              size={20}
              color="#888"
              style={styles.closeIcon}
            />
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => setIsFilterModalVisible(true)}>
        <Text>
          <Ionicons
            name="filter"
            size={20}
            color="#888"
            style={styles.filterIcon}
          />
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentSearchItem = ({ item }: { item: RecentSearchItem }) => (
    <View style={styles.recentSearchItem}>
      <Text>
        <Ionicons
          name="time-outline"
          size={20}
          color="#fff"
          style={styles.recentIcon}
        />
      </Text>
      <Text style={styles.recentSearchText}>{item.title}</Text>
      <TouchableOpacity onPress={() => handleClearSearch(item.id)}>
        <Text>
          <Ionicons name="close" size={20} color="#888" />
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWatchedMovieItem = ({ item }: { item: WatchedMovieItem }) => (
    <View style={styles.movieCard}>
      <Image source={{ uri: item.image }} style={styles.movieImage} />
      <Text style={styles.movieTitle}>{item.title}</Text>
      <Text style={styles.movieDuration}>{item.duration}</Text>
      <View style={styles.ratingContainer}>
        <Text>
          <Ionicons name="star" size={16} color="#FFD700" />
        </Text>
        <Text style={styles.ratingText}>{item.rating}</Text>
      </View>
    </View>
  );

  const renderBestCinemaPromo = () => (
    <View style={styles.promoBanner}>
      <Text style={styles.promoTitle}>Family Promo on Weekend</Text>
      <Text style={styles.promoDescription}>
        50% discount for family who want to watch films
      </Text>
      <Text style={styles.promoLink}>Grab it Now</Text>
    </View>
  );

  const renderCategoryFilter = ({ item }: { item: BestCinemaSection }) => (
    <View style={styles.categoryFilter}>
      {item.categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.categoryButtonActive,
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
  );

  const renderBestCinemaMovieItem = ({
    item,
  }: {
    item: BestCinemaMovieItem;
  }) => (
    <View style={styles.movieCard}>
      <Image source={{ uri: item.image }} style={styles.movieImage} />
      <Text style={styles.movieTitle}>{item.title}</Text>
      <View style={styles.ratingContainer}>
        <Text>
          <Ionicons name="star" size={16} color="#FFD700" />
        </Text>
        <Text style={styles.ratingText}>{item.rating}</Text>
      </View>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      transparent={true}
      visible={isFilterModalVisible}
      animationType="fade"
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <Text>
                <Ionicons name="close" size={24} color="#fff" />
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.resetFiltersText}>Reset Filters</Text>
          </TouchableOpacity>

          {/* Categories */}
          <Text style={styles.filterSectionTitle}>Categories</Text>
          <View style={styles.filterOptions}>
            {["All", "Action", "Mystery", "Fantasy", "Adventure", "Others"].map(
              (category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterButton,
                    filterCategory === category && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilterCategory(category)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterCategory === category &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Location */}
          <Text style={styles.filterSectionTitle}>Location</Text>
          <View style={styles.filterOptions}>
            {["All", "San Diego", "New York", "Others"].map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.filterButton,
                  filterLocation === location && styles.filterButtonActive,
                ]}
                onPress={() => setFilterLocation(location)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterLocation === location &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  {location}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Select Time */}
          <Text style={styles.filterSectionTitle}>Select Time</Text>
          <View style={styles.filterOptions}>
            {["All", "08:00 AM", "08:30 AM", "09:00 AM"].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.filterButton,
                  filterTime === time && styles.filterButtonActive,
                ]}
                onPress={() => setFilterTime(time)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterTime === time && styles.filterButtonTextActive,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Apply Filter Button */}
          <TouchableOpacity
            style={styles.applyFilterButton}
            onPress={applyFilters}
          >
            <Text style={styles.applyFilterButtonText}>Apply Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSection = ({ item }: { item: SearchSection }) => {
    switch (item.type) {
      case "searchBar":
        return renderSearchBar();
      case "section":
        if (item.title === "Last Search" && recentSearches.length > 0) {
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearchItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          );
        } else if (item.title === "Watched a lot") {
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              <FlatList
                data={item.data as WatchedMovieItem[]}
                renderItem={renderWatchedMovieItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          );
        } else if (item.title === "Best Cinema") {
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {renderBestCinemaPromo()}
              {renderCategoryFilter({
                item: item.data?.[0] as BestCinemaSection,
              })}
              <Text style={styles.sectionSubtitle}>
                Movies Found ({filteredMovies.length})
              </Text>
              <FlatList
                data={filteredMovies}
                renderItem={renderBestCinemaMovieItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity>
          <Text>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={searchData}
        renderItem={renderSection}
        keyExtractor={(item, index) => index.toString()}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
      {renderFilterModal()}
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
  closeIcon: {
    marginLeft: 10,
  },
  filterIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: 50,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  clearAllText: {
    color: "#FF4444",
    fontSize: 14,
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  recentIcon: {
    marginRight: 10,
  },
  recentSearchText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  movieCard: {
    marginRight: 15,
    alignItems: "center",
  },
  movieImage: {
    width: 100,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },
  movieTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  movieDuration: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 12,
    marginLeft: 5,
  },
  promoBanner: {
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  promoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  promoDescription: {
    color: "#888",
    fontSize: 14,
    marginBottom: 5,
  },
  promoLink: {
    color: "#FF4444",
    fontSize: 14,
    fontWeight: "bold",
  },
  categoryFilter: {
    flexDirection: "row",
    marginBottom: 15,
  },
  categoryButton: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#2C3539",
  },
  categoryButtonActive: {
    backgroundColor: "#FF4444",
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
  },
  categoryTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  sectionSubtitle: {
    color: "#888",
    fontSize: 14,
    marginBottom: 10,
  },
  // Styles cho Modal Filter
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#2C3539",
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  resetFiltersText: {
    color: "#FF4444",
    fontSize: 14,
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  filterSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: "#3C4A4D",
  },
  filterButtonActive: {
    backgroundColor: "#FF4444",
  },
  filterButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  applyFilterButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  applyFilterButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SearchScreen;
