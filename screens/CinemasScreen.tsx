import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

// Định nghĩa interface cho dữ liệu rạp phim
interface Cinema {
  id: string;
  name: string;
  location: string;
  distance: string;
  rating: string;
  image: string;
}

// Dữ liệu giả cho rạp phim
const initialCinemas: Cinema[] = [
  {
    id: "1",
    name: "Megafox 99",
    location: "San Diego, California",
    distance: "0.2km",
    rating: "4.7",
    image: "https://via.placeholder.com/200x120?text=Megafox+99",
  },
  {
    id: "2",
    name: "Sassean Cinema",
    location: "San Diego, California",
    distance: "2.4km",
    rating: "4.6",
    image: "https://via.placeholder.com/200x120?text=Sassean+Cinema",
  },
  {
    id: "3",
    name: "Max Cinema",
    location: "San Diego, California",
    distance: "1.2km",
    rating: "4.3",
    image: "https://via.placeholder.com/200x120?text=Max+Cinema",
  },
  {
    id: "4",
    name: "Ceranaa",
    location: "San Diego, California",
    distance: "3.4km",
    rating: "4.7",
    image: "https://via.placeholder.com/200x120?text=Ceranaa",
  },
];

const CinemasScreen: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [filteredCinemas, setFilteredCinemas] =
    useState<Cinema[]>(initialCinemas);

  // Áp dụng bộ lọc theo vị trí
  const applyLocationFilter = (location: string) => {
    setSelectedLocation(location);
    if (location === "All") {
      setFilteredCinemas(initialCinemas);
    } else {
      setFilteredCinemas(
        initialCinemas.filter((cinema) => cinema.location.includes(location))
      );
    }
  };

  const renderLocationFilter = () => (
    <View style={styles.locationFilter}>
      {["All", "San Diego", "New York", "Others"].map((location) => (
        <TouchableOpacity
          key={location}
          style={[
            styles.locationButton,
            selectedLocation === location && styles.locationButtonActive,
          ]}
          onPress={() => applyLocationFilter(location)}
        >
          <Text
            style={[
              styles.locationButtonText,
              selectedLocation === location && styles.locationButtonTextActive,
            ]}
          >
            {location}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCinemaItem = ({ item }: { item: Cinema }) => (
    <View style={styles.cinemaCard}>
      <Image source={{ uri: item.image }} style={styles.cinemaImage} />
      <View style={styles.cinemaInfo}>
        <Text style={styles.cinemaName}>{item.name}</Text>
        <Text style={styles.cinemaLocation}>{item.location}</Text>
        <View style={styles.distanceRatingContainer}>
          <Text style={styles.cinemaDistance}>{item.distance}</Text>
          <View style={styles.ratingContainer}>
            <Text>
              <Ionicons name="star" size={16} color="#FFD700" />
            </Text>
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
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
        <Text style={styles.headerTitle}>Cinemas Nearby You</Text>
        <TouchableOpacity>
          <Text>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bộ lọc vị trí */}
      {renderLocationFilter()}

      {/* Danh sách rạp phim */}
      <View style={styles.cinemasSection}>
        <Text style={styles.sectionSubtitle}>
          Cinemas Found ({filteredCinemas.length})
        </Text>
        <FlatList
          data={filteredCinemas}
          renderItem={renderCinemaItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526", // Nền tối giống ảnh
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
  locationFilter: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#2C3539",
    borderRadius: 10,
    margin: 15,
  },
  locationButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#3C4A4D",
  },
  locationButtonActive: {
    backgroundColor: "#FF4444",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  locationButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  cinemasSection: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionSubtitle: {
    color: "#888",
    fontSize: 14,
    marginBottom: 10,
  },
  cinemaCard: {
    flexDirection: "row",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
    alignItems: "center",
  },
  cinemaImage: {
    width: 100,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  cinemaInfo: {
    flex: 1,
  },
  cinemaName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cinemaLocation: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  distanceRatingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cinemaDistance: {
    color: "#888",
    fontSize: 12,
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
});

export default CinemasScreen;
