import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { useUserContext } from "../context/UserContext";
import {
  getPersonalRecommendations,
  getNewMovies,
  getMoviesByLocation,
  getMoviesByWeather,
  getMoviesByHoliday,
  getMoviesByTime,
  getAllMovies,
} from "../api/api";
import { BASE_URL } from "../config/config";

// Định nghĩa type cho dữ liệu gợi ý (đặt lại ở đầu file, không import từ chính file này)
type RecommendationMovie = {
  movie_id?: number;
  id?: number;
  title: string;
  description?: string;
  release_date: string;
  popularity?: number;
  rating?: number;
  genres?: string | string[];
  poster_url?: string;
  score?: number;
};

const Section: React.FC<{
  title: string;
  data: RecommendationMovie[];
  loading: boolean;
  error: string | null;
  emptyHint?: string;
}> = ({ title, data, loading, error, emptyHint }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {loading ? (
      <ActivityIndicator
        size="small"
        color="#FF4444"
        style={{ marginVertical: 12 }}
      />
    ) : error ? (
      <Text style={{ color: "red", marginVertical: 8 }}>{error}</Text>
    ) : !data.length ? (
      <Text style={{ color: "#aaa", marginVertical: 8 }}>
        {emptyHint || "Không có phim phù hợp."}
      </Text>
    ) : (
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) =>
          item && (item.movie_id ?? item.id)
            ? (item.movie_id ?? item.id)!.toString()
            : `movie-${index}`
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.poster_url ? (
              <Image
                source={{ uri: getFullImageUrl(item.poster_url) }}
                style={styles.poster}
              />
            ) : (
              <View style={[styles.poster, { backgroundColor: "#333" }]} />
            )}
            <Text style={styles.movieTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.genre} numberOfLines={1}>
              {Array.isArray(item.genres)
                ? item.genres
                    .map((g) => (typeof g === "string" ? g : (g as any).name))
                    .join(", ")
                : typeof item.genres === "string"
                ? item.genres.replace(/\[|\]|'/g, "")
                : ""}
            </Text>
            <Text style={styles.info}>Ngày chiếu: {item.release_date}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 4 }}
      />
    )}
  </View>
);

function getFullImageUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return BASE_URL.replace(/\/$/, "") + url;
}

const RecommendationScreen: React.FC = () => {
  const { user } = useUserContext();
  // State cho từng section
  const [personal, setPersonal] = useState<RecommendationMovie[]>([]);
  const [personalWithPoster, setPersonalWithPoster] = useState<
    RecommendationMovie[]
  >([]);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [newMovies, setNewMovies] = useState<RecommendationMovie[]>([]);
  const [newLoading, setNewLoading] = useState(true);
  const [newError, setNewError] = useState<string | null>(null);

  const [location, setLocation] = useState<string>("");
  const [locationMovies, setLocationMovies] = useState<RecommendationMovie[]>(
    []
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [weatherMovies, setWeatherMovies] = useState<RecommendationMovie[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [holidayMovies, setHolidayMovies] = useState<RecommendationMovie[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(true);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  const [timeMovies, setTimeMovies] = useState<RecommendationMovie[]>([]);
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeError, setTimeError] = useState<string | null>(null);

  const [allMovies, setAllMovies] = useState<any[]>([]);

  // Map lại poster_url mỗi khi personal hoặc allMovies thay đổi
  useEffect(() => {
    if (!personal.length || !allMovies.length) {
      setPersonalWithPoster(personal);
      return;
    }
    const mapped = personal.map((item) => {
      const found = allMovies.find((m) => m.id === item.movie_id);
      return { ...item, poster_url: found?.poster_url };
    });
    setPersonalWithPoster(mapped);
  }, [personal, allMovies]);

  // Fetch các section không cần location
  useEffect(() => {
    // Fetch all movies for poster_url mapping
    const fetchAllMovies = async () => {
      try {
        const data = await getAllMovies();
        setAllMovies(Array.isArray(data) ? data : []);
      } catch (err) {
        setAllMovies([]);
      }
    };
    fetchAllMovies();
  }, []);

  useEffect(() => {
    // Cá nhân hóa
    const fetchPersonal = async () => {
      if (!user?.id) return;
      setPersonalLoading(true);
      setPersonalError(null);
      try {
        const data = await getPersonalRecommendations(user.id, 10);
        let valid = Array.isArray(data)
          ? data.filter(
              (item) =>
                item &&
                typeof item.movie_id !== "undefined" &&
                item.movie_id !== null
            )
          : [];
        // Map lại poster_url từ allMovies
        if (allMovies.length) {
          valid = valid.map((item) => {
            const found = allMovies.find((m) => m.id === item.movie_id);
            return { ...item, poster_url: found?.poster_url };
          });
        }
        setPersonal(valid);
      } catch (err: any) {
        setPersonalError(err.message || "Lỗi khi lấy gợi ý cá nhân");
      } finally {
        setPersonalLoading(false);
      }
    };
    // Phim mới
    const fetchNew = async () => {
      setNewLoading(true);
      setNewError(null);
      try {
        const data = await getNewMovies(10);
        console.log("New movies data:", data);
        const valid = Array.isArray(data)
          ? data.filter(
              (item) =>
                item &&
                ((typeof item.movie_id !== "undefined" &&
                  item.movie_id !== null) ||
                  (typeof item.id !== "undefined" && item.id !== null))
            )
          : [];
        setNewMovies(valid);
      } catch (err: any) {
        setNewError(err.message || "Lỗi khi lấy phim mới");
      } finally {
        setNewLoading(false);
      }
    };
    // Ngày lễ
    const fetchHoliday = async () => {
      setHolidayLoading(true);
      setHolidayError(null);
      try {
        const data = await getMoviesByHoliday(10);
        const valid = Array.isArray(data)
          ? data.filter(
              (item) =>
                item &&
                typeof item.movie_id !== "undefined" &&
                item.movie_id !== null
            )
          : [];
        setHolidayMovies(valid);
      } catch (err: any) {
        setHolidayError(err.message || "Lỗi khi lấy gợi ý ngày lễ");
      } finally {
        setHolidayLoading(false);
      }
    };
    // Theo thời gian
    const fetchTime = async () => {
      setTimeLoading(true);
      setTimeError(null);
      try {
        const data = await getMoviesByTime(10);
        const valid = Array.isArray(data)
          ? data.filter(
              (item) =>
                item &&
                typeof item.movie_id !== "undefined" &&
                item.movie_id !== null
            )
          : [];
        setTimeMovies(valid);
      } catch (err: any) {
        setTimeError(err.message || "Lỗi khi lấy gợi ý theo thời gian");
      } finally {
        setTimeLoading(false);
      }
    };
    fetchPersonal();
    fetchNew();
    fetchHoliday();
    fetchTime();
  }, [user]);

  // Fetch các section cần location
  const fetchLocationMovies = async () => {
    if (!location) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const data = await getMoviesByLocation(location, 10);
      const valid = Array.isArray(data)
        ? data.filter(
            (item) =>
              item &&
              typeof item.movie_id !== "undefined" &&
              item.movie_id !== null
          )
        : [];
      setLocationMovies(valid);
    } catch (err: any) {
      setLocationError(err.message || "Lỗi khi lấy gợi ý theo vị trí");
    } finally {
      setLocationLoading(false);
    }
  };
  const fetchWeatherMovies = async () => {
    if (!location) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await getMoviesByWeather(location, 10);
      console.log("Weather movies data:", data);
      const valid = Array.isArray(data)
        ? data.filter(
            (item) =>
              (item &&
                typeof item.movie_id !== "undefined" &&
                item.movie_id !== null) ||
              (typeof item.id !== "undefined" && item.id !== null)
          )
        : [];
      setWeatherMovies(valid);
    } catch (err: any) {
      setWeatherError(err.message || "Lỗi khi lấy gợi ý theo thời tiết");
    } finally {
      setWeatherLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#181818", padding: 10 }}>
      <Section
        title="Gợi ý cho bạn"
        data={personalWithPoster}
        loading={personalLoading}
        error={personalError}
      />
      <Section
        title="Phim mới ra rạp"
        data={newMovies}
        loading={newLoading}
        error={newError}
      />
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.sectionTitle}>Gợi ý theo vị trí</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <TextInput
            style={styles.input}
            placeholder="Nhập vị trí (ví dụ: Hà Nội)"
            placeholderTextColor="#888"
            value={location}
            onChangeText={setLocation}
            onSubmitEditing={fetchLocationMovies}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.button} onPress={fetchLocationMovies}>
            <Text style={{ color: "#fff" }}>Tìm</Text>
          </TouchableOpacity>
        </View>
        <Section
          title=""
          data={locationMovies}
          loading={locationLoading}
          error={locationError}
        />
      </View>
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.sectionTitle}>Gợi ý theo thời tiết</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <TextInput
            style={styles.input}
            placeholder="Nhập vị trí (ví dụ: Hà Nội)"
            placeholderTextColor="#888"
            value={location}
            onChangeText={setLocation}
            onSubmitEditing={fetchWeatherMovies}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.button} onPress={fetchWeatherMovies}>
            <Text style={{ color: "#fff" }}>Tìm</Text>
          </TouchableOpacity>
        </View>
        <Section
          title=""
          data={weatherMovies}
          loading={weatherLoading}
          error={weatherError}
          emptyHint={
            location
              ? "Không có phim phù hợp với thời tiết hiện tại hoặc vị trí bạn nhập. Hãy thử tên thành phố lớn bằng tiếng Anh (ví dụ: Hanoi, Ho Chi Minh, Da Nang)."
              : undefined
          }
        />
      </View>
      <Section
        title="Gợi ý theo ngày lễ"
        data={holidayMovies}
        loading={holidayLoading}
        error={holidayError}
      />
      <Section
        title="Gợi ý theo thời gian"
        data={timeMovies}
        loading={timeLoading}
        error={timeError}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF4444",
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    width: 140,
    backgroundColor: "#232323",
    borderRadius: 10,
    marginRight: 12,
    padding: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#444",
    marginBottom: 6,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
    textAlign: "center",
  },
  genre: {
    color: "#FFB300",
    fontSize: 12,
    marginBottom: 2,
    textAlign: "center",
  },
  info: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: "#232323",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  button: {
    backgroundColor: "#FF4444",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default RecommendationScreen;
