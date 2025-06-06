import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getPersonalRecommendationsByToken,
  getRecommendationsByTime,
  getRecommendationsByLocation,
  getRecommendationsByWeather,
  getMovieDetail,
} from "../api/api";
import api, { searchMovies } from "../api/api";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../config/config";

const genreOptions = [
  "Tất cả",
  "Hành động",
  "Phiêu lưu",
  "Hài",
  "Tình cảm",
  "Kinh dị",
  "Hoạt hình",
  "Khoa học viễn tưởng",
  "Tâm lý",
  "Tài liệu",
  "Khác",
];
const sortOptions = [
  { label: "Mới nhất", value: "release_desc" },
  { label: "Cũ nhất", value: "release_asc" },
  { label: "Đánh giá cao", value: "rating_desc" },
  { label: "Đánh giá thấp", value: "rating_asc" },
  { label: "Phổ biến", value: "popular" },
];
const ratingOptions = ["Tất cả", "9+", "8+", "7+", "6+", "5+"];
const yearOptions = [
  "Tất cả",
  ...Array.from({ length: 2025 - 1990 + 1 }, (_, i) => (2025 - i).toString()),
];

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [personalMovies, setPersonalMovies] = useState<any[]>([]);
  const [timeMovies, setTimeMovies] = useState<any[]>([]);
  const [locationMovies, setLocationMovies] = useState<any[]>([]);
  const [weatherMovies, setWeatherMovies] = useState<any[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigation = useNavigation();

  // State cho autocomplete search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fallback image handler
  const [imageErrorMap, setImageErrorMap] = useState<{
    [key: string]: boolean;
  }>({});
  const handleImageError = (id: string) => {
    setImageErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  // State cho filter nâng cao
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterGenre, setFilterGenre] = useState("Tất cả");
  const [filterYear, setFilterYear] = useState("Tất cả");
  const [filterRating, setFilterRating] = useState("Tất cả");
  const [filterSort, setFilterSort] = useState(sortOptions[0].value);

  const [suggestionCache, setSuggestionCache] = useState<any>(null);

  useEffect(() => {
    if (!searchQuery && suggestionCache) {
      setPersonalMovies(suggestionCache.personalMovies || []);
      setTimeMovies(suggestionCache.timeMovies || []);
      setLocationMovies(suggestionCache.locationMovies || []);
      setWeatherMovies(suggestionCache.weatherMovies || []);
      setTrendingMovies(suggestionCache.trendingMovies || []);
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        // Lấy token và quyền vị trí song song
        const [token, locationStatus] = await Promise.all([
          SecureStore.getItemAsync("access_token"),
          Location.requestForegroundPermissionsAsync(),
        ]);
        let lat = 21.0285,
          lng = 105.8542;
        if (locationStatus.status === "granted") {
          try {
            let location = await Location.getCurrentPositionAsync({});
            lat = location.coords.latitude;
            lng = location.coords.longitude;
          } catch {}
        }
        // Gọi các API gợi ý song song
        const [personalData, timeData, locData, weatherData, trending] =
          await Promise.all([
            token ? getPersonalRecommendationsByToken(token) : [],
            getRecommendationsByTime(),
            getRecommendationsByLocation(lat, lng),
            getRecommendationsByWeather(lat, lng),
            api
              .get("/recommendations/trending")
              .then((res) => res.data)
              .catch(() => []),
          ]);
        // Gợi ý cá nhân hóa
        let personal: any[] = [];
        if (Array.isArray(personalData)) {
          personal = personalData
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        } else if (Array.isArray(personalData?.data)) {
          personal = personalData.data
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        }
        setPersonalMovies(personal.filter((m) => m && m.id));
        // Gợi ý theo thời gian
        let timeList: any[] = [];
        if (Array.isArray(timeData)) {
          timeList = timeData
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        }
        setTimeMovies(timeList.filter((m) => m && m.id));
        // Gợi ý theo vị trí
        let locList: any[] = [];
        if (Array.isArray(locData)) {
          locList = locData
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        }
        setLocationMovies(locList.filter((m) => m && m.id));
        // Gợi ý theo thời tiết
        let weatherList: any[] = [];
        if (Array.isArray(weatherData)) {
          weatherList = weatherData
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        }
        setWeatherMovies(weatherList.filter((m) => m && m.id));
        // Gợi ý trending
        let trendingList: any[] = [];
        if (Array.isArray(trending)) {
          trendingList = trending
            .map((item: any) => item.movie || item)
            .filter((m: any) => !!m?.id)
            .slice(0, 5);
        }
        setTrendingMovies(trendingList.filter((m) => m && m.id));
        // Lưu cache
        setSuggestionCache({
          personalMovies: personal.filter((m) => m && m.id),
          timeMovies: timeList.filter((m) => m && m.id),
          locationMovies: locList.filter((m) => m && m.id),
          weatherMovies: weatherList.filter((m) => m && m.id),
          trendingMovies: trendingList.filter((m) => m && m.id),
        });
      } catch (e) {
        setPersonalMovies([]);
        setTimeMovies([]);
        setLocationMovies([]);
        setWeatherMovies([]);
        setTrendingMovies([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    if (!searchQuery) fetchSuggestions();
  }, [searchQuery]);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await SecureStore.getItemAsync("access_token");
      setIsLoggedIn(!!token);
    };
    checkLogin();
  }, []);

  // Autocomplete search effect (có filter)
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    let timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Chuẩn bị params filter
        const params: any = { query: searchQuery };
        if (filterGenre !== "Tất cả") params.genre = filterGenre;
        if (filterYear !== "Tất cả") params.year = filterYear;
        if (filterRating !== "Tất cả")
          params.rating = filterRating.replace("+", "");
        if (filterSort) params.sort = filterSort;
        // Gọi API search với filter
        const res = await searchMovies(params);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterGenre, filterYear, filterRating, filterSort]);

  // Thêm SkeletonItem component
  const SkeletonItem = () => (
    <View style={[styles.movieCard, { opacity: 0.7 }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
    </View>
  );

  const renderSuggestionSection = () => (
    <>
      {/* Gợi ý cá nhân hóa */}
      {isLoggedIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dành riêng cho bạn</Text>
          <FlatList
            data={
              loadingSuggestions && personalMovies.length < 5
                ? [
                    ...personalMovies,
                    ...Array(5 - personalMovies.length).fill({
                      __skeleton: true,
                    }),
                  ]
                : personalMovies
            }
            renderItem={({ item }) =>
              item.__skeleton ? (
                <SkeletonItem />
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    (navigation as any).navigate("MovieDetail", {
                      movieId: item.id,
                    })
                  }
                >
                  <View style={styles.movieCard}>
                    <Image
                      source={
                        imageErrorMap[item.id]
                          ? require("../assets/placeholder.png")
                          : {
                              uri: item.poster_url?.startsWith("http")
                                ? item.poster_url
                                : `${BASE_URL}${item.poster_url}`,
                            }
                      }
                      style={styles.movieImage}
                      onError={() => handleImageError(item.id)}
                    />
                    <Text style={styles.movieTitle}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              )
            }
            keyExtractor={(item, idx) =>
              item.__skeleton ? `skeleton-${idx}` : item.id.toString()
            }
            horizontal
            showsHorizontalScrollIndicator={false}
            initialNumToRender={5}
            removeClippedSubviews
            getItemLayout={(_, index) => ({
              length: 120,
              offset: 120 * index,
              index,
            })}
          />
          {!loadingSuggestions && personalMovies.length === 0 && (
            <Text
              style={{ color: "#888", textAlign: "center", marginBottom: 10 }}
            >
              Không có gợi ý cá nhân hóa.
            </Text>
          )}
        </View>
      )}
      {/* Gợi ý theo thời gian */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phim phù hợp cho thời điểm này</Text>
        <FlatList
          data={
            loadingSuggestions && timeMovies.length < 5
              ? [
                  ...timeMovies,
                  ...Array(5 - timeMovies.length).fill({ __skeleton: true }),
                ]
              : timeMovies
          }
          renderItem={({ item }) =>
            item.__skeleton ? (
              <SkeletonItem />
            ) : (
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("MovieDetail", {
                    movieId: item.id,
                  })
                }
              >
                <View style={styles.movieCard}>
                  <Image
                    source={
                      imageErrorMap[item.id]
                        ? require("../assets/placeholder.png")
                        : {
                            uri: item.poster_url?.startsWith("http")
                              ? item.poster_url
                              : `${BASE_URL}${item.poster_url}`,
                          }
                    }
                    style={styles.movieImage}
                    onError={() => handleImageError(item.id)}
                  />
                  <Text style={styles.movieTitle}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            )
          }
          keyExtractor={(item, idx) =>
            item.__skeleton ? `skeleton-${idx}` : item.id.toString()
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
        />
        {!loadingSuggestions && timeMovies.length === 0 && (
          <Text
            style={{ color: "#888", textAlign: "center", marginBottom: 10 }}
          >
            Không có gợi ý theo thời điểm.
          </Text>
        )}
      </View>
      {/* Gợi ý theo vị trí */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phim đang chiếu gần bạn</Text>
        <FlatList
          data={
            loadingSuggestions && locationMovies.length < 5
              ? [
                  ...locationMovies,
                  ...Array(5 - locationMovies.length).fill({
                    __skeleton: true,
                  }),
                ]
              : locationMovies
          }
          renderItem={({ item }) =>
            item.__skeleton ? (
              <SkeletonItem />
            ) : (
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("MovieDetail", {
                    movieId: item.id,
                  })
                }
              >
                <View style={styles.movieCard}>
                  <Image
                    source={
                      imageErrorMap[item.id]
                        ? require("../assets/placeholder.png")
                        : {
                            uri: item.poster_url?.startsWith("http")
                              ? item.poster_url
                              : `${BASE_URL}${item.poster_url}`,
                          }
                    }
                    style={styles.movieImage}
                    onError={() => handleImageError(item.id)}
                  />
                  <Text style={styles.movieTitle}>{item.title}</Text>
                  <Text style={{ color: "#FFD700", fontSize: 12 }}>
                    {item.nearest_theater?.name
                      ? `Rạp: ${item.nearest_theater.name}`
                      : ""}
                  </Text>
                  <Text style={{ color: "#BBB", fontSize: 12 }}>
                    {item.screening_count
                      ? `Suất chiếu: ${item.screening_count}`
                      : ""}
                    {item.distance ? `  (${item.distance} km)` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }
          keyExtractor={(item, idx) =>
            item.__skeleton ? `skeleton-${idx}` : item.id.toString()
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
        />
        {!loadingSuggestions && locationMovies.length === 0 && (
          <Text
            style={{ color: "#888", textAlign: "center", marginBottom: 10 }}
          >
            Không có gợi ý theo vị trí.
          </Text>
        )}
      </View>
      {/* Gợi ý theo thời tiết */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Phim phù hợp với thời tiết hiện tại
        </Text>
        <FlatList
          data={
            loadingSuggestions && weatherMovies.length < 5
              ? [
                  ...weatherMovies,
                  ...Array(5 - weatherMovies.length).fill({ __skeleton: true }),
                ]
              : weatherMovies
          }
          renderItem={({ item }) =>
            item.__skeleton ? (
              <SkeletonItem />
            ) : (
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("MovieDetail", {
                    movieId: item.id,
                  })
                }
              >
                <View style={styles.movieCard}>
                  <Image
                    source={
                      imageErrorMap[item.id]
                        ? require("../assets/placeholder.png")
                        : {
                            uri: item.poster_url?.startsWith("http")
                              ? item.poster_url
                              : `${BASE_URL}${item.poster_url}`,
                          }
                    }
                    style={styles.movieImage}
                    onError={() => handleImageError(item.id)}
                  />
                  <Text style={styles.movieTitle}>{item.title}</Text>
                  <Text style={{ color: "#BBB", fontSize: 12 }}>
                    {item.context_data?.description || ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }
          keyExtractor={(item, idx) =>
            item.__skeleton ? `skeleton-${idx}` : item.id.toString()
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
        />
        {!loadingSuggestions && weatherMovies.length === 0 && (
          <Text
            style={{ color: "#888", textAlign: "center", marginBottom: 10 }}
          >
            Không có gợi ý theo thời tiết.
          </Text>
        )}
      </View>
      {/* Gợi ý trending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phim thịnh hành</Text>
        <FlatList
          data={
            loadingSuggestions && trendingMovies.length < 5
              ? [
                  ...trendingMovies,
                  ...Array(5 - trendingMovies.length).fill({
                    __skeleton: true,
                  }),
                ]
              : trendingMovies
          }
          renderItem={({ item }) =>
            item.__skeleton ? (
              <SkeletonItem />
            ) : (
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("MovieDetail", {
                    movieId: item.id,
                  })
                }
              >
                <View style={styles.movieCard}>
                  <Image
                    source={
                      imageErrorMap[item.id]
                        ? require("../assets/placeholder.png")
                        : {
                            uri: item.poster_url?.startsWith("http")
                              ? item.poster_url
                              : `${BASE_URL}${item.poster_url}`,
                          }
                    }
                    style={styles.movieImage}
                    onError={() => handleImageError(item.id)}
                  />
                  <Text style={styles.movieTitle}>{item.title}</Text>
                  <Text
                    style={{
                      color: "#FF4444",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    Hot
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }
          keyExtractor={(item, idx) =>
            item.__skeleton ? `skeleton-${idx}` : item.id.toString()
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
        />
        {!loadingSuggestions && trendingMovies.length === 0 && (
          <Text
            style={{ color: "#888", textAlign: "center", marginBottom: 10 }}
          >
            Không có phim thịnh hành.
          </Text>
        )}
      </View>
    </>
  );

  // Autocomplete search UI
  const renderAutocomplete = () =>
    searchQuery && (
      <View
        style={{
          backgroundColor: "#fff",
          position: "absolute",
          top: 140,
          left: 0,
          right: 0,
          zIndex: 10,
          maxHeight: 400,
          borderRadius: 10,
          marginHorizontal: 15,
          borderWidth: 1,
          borderColor: "#DDD",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        {searchLoading ? (
          <ActivityIndicator
            size="small"
            color="#FF4444"
            style={{ margin: 20 }}
          />
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  (navigation as any).navigate("MovieDetail", {
                    movieId: item.id,
                  });
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#EEE",
                    backgroundColor: "#fff",
                  }}
                >
                  <Image
                    source={
                      imageErrorMap[item.id]
                        ? require("../assets/placeholder.png")
                        : {
                            uri: item.poster_url?.startsWith("http")
                              ? item.poster_url
                              : `${BASE_URL}${item.poster_url}`,
                          }
                    }
                    style={{
                      width: 40,
                      height: 60,
                      borderRadius: 5,
                      marginRight: 10,
                    }}
                    onError={() => handleImageError(item.id)}
                  />
                  <Text style={{ color: "#222", fontSize: 16 }}>
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 300 }}
          />
        ) : (
          <Text style={{ color: "#888", textAlign: "center", padding: 20 }}>
            Không tìm thấy phim phù hợp.
          </Text>
        )}
      </View>
    );

  // Modal filter nâng cao
  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "90%",
            backgroundColor: "#222",
            borderRadius: 15,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            Bộ lọc nâng cao
          </Text>
          {/* Thể loại */}
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 5 }}>
            Thể loại
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 15 }}
          >
            {genreOptions.map((g) => (
              <TouchableOpacity
                key={g}
                style={{
                  backgroundColor: filterGenre === g ? "#FF4444" : "#333",
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 6,
                  marginRight: 10,
                  marginBottom: 10,
                }}
                onPress={() => setFilterGenre(g)}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: filterGenre === g ? "bold" : "normal",
                  }}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Năm phát hành */}
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 5 }}>
            Năm phát hành
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 15,
              maxHeight: 80,
            }}
          >
            {yearOptions.slice(0, 10).map((y) => (
              <TouchableOpacity
                key={y}
                style={{
                  backgroundColor: filterYear === y ? "#FF4444" : "#333",
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 6,
                  marginRight: 10,
                  marginBottom: 10,
                }}
                onPress={() => setFilterYear(y)}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: filterYear === y ? "bold" : "normal",
                  }}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setFilterYear("Tất cả")}
              style={{
                backgroundColor: filterYear === "Tất cả" ? "#FF4444" : "#333",
                borderRadius: 20,
                paddingHorizontal: 15,
                paddingVertical: 6,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: filterYear === "Tất cả" ? "bold" : "normal",
                }}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
          </View>
          {/* Đánh giá */}
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 5 }}>
            Đánh giá
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 15 }}
          >
            {ratingOptions.map((r) => (
              <TouchableOpacity
                key={r}
                style={{
                  backgroundColor: filterRating === r ? "#FF4444" : "#333",
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 6,
                  marginRight: 10,
                  marginBottom: 10,
                }}
                onPress={() => setFilterRating(r)}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: filterRating === r ? "bold" : "normal",
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Sắp xếp */}
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 5 }}>
            Sắp xếp
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}
          >
            {sortOptions.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={{
                  backgroundColor: filterSort === s.value ? "#FF4444" : "#333",
                  borderRadius: 20,
                  paddingHorizontal: 15,
                  paddingVertical: 6,
                  marginRight: 10,
                  marginBottom: 10,
                }}
                onPress={() => setFilterSort(s.value)}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: filterSort === s.value ? "bold" : "normal",
                  }}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Nút áp dụng và đóng */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={() => setIsFilterModalVisible(false)}
              style={{
                backgroundColor: "#FF4444",
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
      {/* Thanh search và autocomplete */}
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
          placeholder="Tìm kiếm phim..."
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
        {/* Nút filter */}
        <TouchableOpacity onPress={() => setIsFilterModalVisible(true)}>
          <Text>
            <Ionicons
              name="filter"
              size={20}
              color="#FF4444"
              style={styles.filterIcon}
            />
          </Text>
        </TouchableOpacity>
      </View>
      {renderFilterModal()}
      {renderAutocomplete()}
      {/* Khi không search thì hiện các section động, bọc trong ScrollView để cuộn */}
      {!searchQuery && (
        <ScrollView>
          {renderSuggestionSection()}
          <View style={{ height: 20 }} />
        </ScrollView>
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
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#DDD",
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
    color: "#222",
    fontSize: 16,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
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
  skeletonImage: {
    width: 100,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#333",
    marginBottom: 5,
  },
  skeletonText: {
    width: 70,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#333",
    marginBottom: 5,
  },
});

export default SearchScreen;
