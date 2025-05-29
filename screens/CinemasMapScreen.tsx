import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import MapView, { Marker, Circle, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

// Định nghĩa interface cho dữ liệu rạp phim
interface Cinema {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: string;
  rating: string;
  image: string;
  status?: string;
  timeAgo?: string;
  travelTime?: string;
  location?: string;
}

// Dữ liệu giả cho rạp phim với tọa độ
const initialCinemas: Cinema[] = [
  {
    id: "1",
    name: "Max Cinema",
    latitude: 32.7157,
    longitude: -117.1611,
    distance: "0.0 miles",
    rating: "4.7",
    image: "https://via.placeholder.com/200x120?text=Max+Cinema",
    status: "Available",
    timeAgo: "3+ min ago",
    travelTime: "1 min",
    location: "San Diego, California",
  },
  {
    id: "2",
    name: "24 Night Cinema",
    latitude: 32.72,
    longitude: -117.17,
    distance: "1.2km",
    rating: "4.6",
    image: "https://via.placeholder.com/200x120?text=24+Night+Cinema",
    location: "San Diego, California",
  },
];

// Dữ liệu giả cho danh sách thời gian
const times = ["08:00", "10:00", "12:00", "14:00"];

// Tọa độ giả lập cho vị trí hiện tại (gần Max Cinema)
const currentLocation = {
  latitude: 32.715,
  longitude: -117.16,
};

const CinemasMapScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredCinemas, setFilteredCinemas] =
    useState<Cinema[]>(initialCinemas);
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // Thêm state cho thời gian
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Vị trí trung tâm (San Diego làm ví dụ)
  const initialRegion = {
    latitude: 32.7157,
    longitude: -117.1611,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Tạo đường đi giả lập từ vị trí hiện tại đến rạp phim được chọn
  const getRouteCoordinates = (cinema: Cinema) => {
    return [
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      { latitude: cinema.latitude, longitude: cinema.longitude },
    ];
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
      <TouchableOpacity>
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

  const renderCinemaItem = ({ item }: { item: Cinema }) => (
    <TouchableOpacity
      style={styles.cinemaCard}
      onPress={() => {
        setSelectedCinema(item);
        mapRef.current?.animateToRegion({
          latitude: item.latitude,
          longitude: item.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }}
    >
      <Image source={{ uri: item.image }} style={styles.cinemaImage} />
      <View style={styles.cinemaInfo}>
        <Text style={styles.cinemaName}>{item.name}</Text>
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
    </TouchableOpacity>
  );

  // Hàm điều hướng đến CinemasScreen khi nhấn "See All"
  const handleSeeAll = () => {
    navigation.navigate("CinemasList");
  };

  // Hàm giả lập hành động khi nhấn "Ride Now"
  const handleRideNow = () => {
    alert("Opening navigation to " + selectedCinema?.name);
  };

  // Hàm điều hướng đến SelectSeatsScreen
  const handleSelectSeats = () => {
    if (selectedCinema && selectedTime) {
      navigation.navigate("SelectSeatsScreen", {
        screeningId: "1", // Placeholder, should be retrieved from API
        movieId: "1", // Placeholder, should be retrieved from API
        movieName: "Movie Name", // Placeholder
        date: "2023-12-01", // Placeholder
        roomName: "Room 1", // Placeholder
        time: selectedTime,
        cinemaName: selectedCinema.name,
        theaterRoomId: 1, // Placeholder
        screeningPrice: 100000, // Placeholder
      });
    } else {
      alert("Please select a time!");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cinemas Near You</Text>
        <TouchableOpacity>
          <Text>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      {renderSearchBar()}

      {/* Bản đồ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Marker cho vị trí hiện tại */}
        <Marker coordinate={currentLocation} pinColor="green" />
        {/* Marker cho rạp phim */}
        {initialCinemas.map((cinema) => (
          <Marker
            key={cinema.id}
            coordinate={{
              latitude: cinema.latitude,
              longitude: cinema.longitude,
            }}
            pinColor="#FF4440"
            onPress={() => setSelectedCinema(cinema)}
          />
        ))}
        {/* Vẽ đường đi nếu có rạp phim được chọn */}
        {selectedCinema && (
          <Polyline
            coordinates={getRouteCoordinates(selectedCinema)}
            strokeColor="#FF4440"
            strokeWidth={3}
          />
        )}
        {/* Vòng tròn định vị */}
        <Circle
          center={currentLocation}
          radius={500}
          fillColor="rgba(0, 255, 0, 0.2)"
          strokeColor="rgba(0, 255, 0, 0.5)"
        />
      </MapView>

      {/* Danh sách rạp phim */}
      <View style={styles.cinemasSection}>
        <View style={styles.cinemasHeader}>
          <Text style={styles.sectionSubtitle}>
            Cinemas Found ({filteredCinemas.length})
          </Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredCinemas}
          renderItem={renderCinemaItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Card thông tin chi tiết rạp phim */}
      {selectedCinema && (
        <View style={styles.cinemaDetailCard}>
          <Text style={styles.cinemaDetailName}>{selectedCinema.name}</Text>
          <Text style={styles.cinemaDetailLocation}>
            {selectedCinema.location || "San Diego, California"}
          </Text>
          <View style={styles.cinemaDetailStatus}>
            <Text>
              <Ionicons name="ellipse" size={10} color="#00FF00" />
            </Text>
            <Text style={styles.cinemaDetailStatusText}>
              {selectedCinema.status}
            </Text>
            <Text style={styles.cinemaDetailTime}>
              {selectedCinema.timeAgo}
            </Text>
          </View>
          <View style={styles.cinemaDetailDistance}>
            <Text>{selectedCinema.distance}</Text>
            <Text style={styles.cinemaDetailTravelTime}>
              {selectedCinema.travelTime}
            </Text>
          </View>

          {/* Phần chọn thời gian */}
          <Text style={styles.timeTitle}>Select Time</Text>
          <View style={styles.timeRow}>
            {times.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeButton,
                  selectedTime === time && styles.timeButtonActive,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={styles.timeText}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nút Ride Now và Select Seats */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.rideNowButton}
              onPress={handleRideNow}
            >
              <Text style={styles.rideNowText}>Ride Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectSeatsButton}
              onPress={handleSelectSeats}
            >
              <Text style={styles.selectSeatsText}>Select Seats</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  filterIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: 50,
  },
  map: {
    width: Dimensions.get("window").width,
    height: 300,
  },
  cinemasSection: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  cinemasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionSubtitle: {
    color: "#888",
    fontSize: 14,
  },
  seeAllButton: {},
  seeAllText: {
    color: "#FF4444",
    fontSize: 14,
  },
  cinemaCard: {
    flexDirection: "row",
    backgroundColor: "#2C3539",
    borderRadius: 10,
    marginRight: 15,
    padding: 10,
    alignItems: "center",
    width: 200,
  },
  cinemaImage: {
    width: 80,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  cinemaInfo: {
    flex: 1,
  },
  cinemaName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
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
  cinemaDetailCard: {
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    margin: 15,
    marginTop: 0,
  },
  cinemaDetailName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cinemaDetailLocation: {
    color: "#888",
    fontSize: 12,
    marginBottom: 10,
  },
  cinemaDetailStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cinemaDetailStatusText: {
    color: "#00FF00",
    fontSize: 12,
    marginLeft: 5,
  },
  cinemaDetailTime: {
    color: "#888",
    fontSize: 12,
    marginLeft: 10,
  },
  cinemaDetailDistance: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cinemaDetailTravelTime: {
    color: "#888",
    fontSize: 12,
  },
  timeTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  timeButton: {
    backgroundColor: "#1C2526",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  timeButtonActive: {
    backgroundColor: "#FF4444",
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rideNowButton: {
    backgroundColor: "#FF4440",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    flex: 1,
    marginRight: 5,
  },
  rideNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  selectSeatsButton: {
    backgroundColor: "#FF4440",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    flex: 1,
    marginLeft: 5,
  },
  selectSeatsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CinemasMapScreen;
