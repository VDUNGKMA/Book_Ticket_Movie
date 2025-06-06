import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { getScreenings } from "../api/api";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useUserContext } from "../context/UserContext";

type BookingScreenRouteProp = RouteProp<RootStackParamList, "Booking">;

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const BookingScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<BookingScreenRouteProp>();
  const { movieId, movieName } = route.params;
  const { isLoggedIn } = useUserContext();

  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString(new Date())
  );
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sử dụng useRef thay vì useState để theo dõi thời gian focus cuối cùng
  const lastFocusTimeRef = useRef<number>(Date.now());

  // Danh sách ngày
  const dates = useMemo(() => {
    const days = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
    const months = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const month = months[d.getMonth()];
      const dateStr = getLocalDateString(d);
      return { date: dateStr, day: dayName, dayNum: dayNum, month: month };
    });
  }, []);

  // Lấy dữ liệu động từ API
  useEffect(() => {
    console.log("selectedDate:", selectedDate);
    setLoading(true);
    getScreenings({ movieId, date: selectedDate })
      .then((data) => {
        console.log("screenings data:", data);
        setScreenings(data);
      })
      .catch(() => setScreenings([]))
      .finally(() => setLoading(false));
  }, [movieId, selectedDate]);

  // Sửa lại useFocusEffect để tránh vòng lặp vô hạn
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      // Chỉ tải lại dữ liệu nếu đã qua ít nhất 2 giây kể từ lần focus trước
      // Điều này tránh tải lại dữ liệu khi lần đầu vào màn hình
      if (now - lastFocusTimeRef.current > 2000) {
        console.log("Tải lại dữ liệu suất chiếu khi quay lại BookingScreen");
        setLoading(true);
        getScreenings({ movieId, date: selectedDate })
          .then((data) => setScreenings(data))
          .catch(() => setScreenings([]))
          .finally(() => setLoading(false));
      }

      // Cập nhật thời gian focus trong ref thay vì state
      lastFocusTimeRef.current = now;

      return () => {
        // Cleanup function if needed
      };
    }, [movieId, selectedDate]) // Loại bỏ lastFocusTime khỏi dependency array
  );

  // Danh sách rạp động
  const cinemas = useMemo(() => {
    const map = new Map();
    screenings.forEach((s) => {
      const theater = s.theaterRoom?.theater;
      if (theater && !map.has(theater.id)) map.set(theater.id, theater.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [screenings]);

  // Lấy phòng và suất chiếu động cho từng rạp
  const getRoomsAndShowtimes = (cinemaId: number) => {
    const roomsMap = new Map();
    screenings
      .filter((s) => s.theaterRoom?.theater?.id === cinemaId)
      .forEach((s) => {
        const room = s.theaterRoom;
        if (room && !roomsMap.has(room.id))
          roomsMap.set(room.id, room.room_name);
      });
    const rooms = Array.from(roomsMap, ([id, name]) => ({ id, name }));

    // Với mỗi phòng, lấy các suất chiếu
    const roomShowtimes = rooms.map((room) => {
      const times = screenings
        .filter((s) => s.theaterRoom?.id === room.id)
        .map((s) => {
          console.log("Thoi gian bat dau suat chieu", s.start_time);
          return {
            id: s.id,
            time: new Date(s.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            price: s.price,
          };
        });

      return { ...room, times };
    });
    return roomShowtimes;
  };

  // Tạo chuỗi ngày theo định dạng CGV
  const getFormattedDate = () => {
    const d = new Date(selectedDate);
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayName = days[d.getDay()];
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${dayName} ${day} tháng ${month}, ${year}`;
  };
  const handleGoBack = () => {
    navigation.goBack();
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          {/* Removed the comment here */}
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{movieName}</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Movie Format */}
        <View style={styles.formatSelector}>
          <Text style={styles.formatText}>Định dạng phim</Text>
          <TouchableOpacity style={styles.allButton}>
            <Text style={styles.allButtonText}>TẤT CẢ</Text>
            <Ionicons name="chevron-forward" size={20} color="#d01d27" />
          </TouchableOpacity>
        </View>

        {/* Date Selector - CGV Style */}
        <View style={styles.dateSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.datesContainer}
          >
            {dates.map((item, index) => {
              const isToday = index === 0;
              const isSelected = selectedDate === item.date;
              return (
                <TouchableOpacity
                  key={item.date}
                  style={[
                    styles.dateColumn,
                    isSelected && styles.selectedDateColumn,
                  ]}
                  onPress={() => setSelectedDate(item.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {isToday ? "Today" : item.day}
                  </Text>
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedDayCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.selectedDayNumber,
                      ]}
                    >
                      {item.dayNum}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.fullDateText}>{getFormattedDate()}</Text>
        </View>

        {/* Danh sách rạp/phòng/giờ động */}
        <View style={styles.cinemaList}>
          {cinemas.map((cinema) => (
            <View key={cinema.id} style={styles.cinemaItem}>
              <TouchableOpacity
                style={styles.cinemaHeader}
                onPress={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [cinema.id]: !prev[cinema.id],
                  }))
                }
              >
                <View style={styles.cinemaNameContainer}>
                  <Text style={styles.cinemaPrefix}>CGV</Text>
                  <Text style={styles.cinemaName}>
                    {cinema.name.replace("CGV ", "")}
                  </Text>
                </View>
                <View style={styles.cinemaControls}>
                  <TouchableOpacity style={styles.favoriteButton}>
                    <Ionicons name="heart" size={24} color="#d01d27" />
                  </TouchableOpacity>
                  <Ionicons
                    name={expanded[cinema.id] ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#666"
                  />
                </View>
              </TouchableOpacity>
              {/* Hiển thị động các phòng và suất chiếu */}
              {expanded[cinema.id] && (
                <View style={styles.showtimeContainer}>
                  {getRoomsAndShowtimes(cinema.id).map((room) => (
                    <View key={room.id} style={styles.formatGroup}>
                      <View style={styles.formatHeader}>
                        <View style={styles.formatDot} />
                        <Text style={styles.formatTitle}>{room.name}</Text>

                        {/* Thêm badge cho phòng đặc biệt */}
                        {room.name.includes("SUB") && (
                          <View style={styles.specialBadge}>
                            <Text style={styles.specialBadgeText}>L'AMOUR</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.timeGrid}>
                        {room.times.map((time) => (
                          <TouchableOpacity
                            key={time.id}
                            style={styles.timeSlot}
                            onPress={() => {
                              console.log(time);
                              console.log("isLoggedIn:", isLoggedIn);
                              // Kiểm tra tab Auth có tồn tại không
                              if (!isLoggedIn) {
                                const state =
                                  navigation.getState && navigation.getState();
                                const hasAuthTab =
                                  state &&
                                  state.routeNames &&
                                  state.routeNames.includes &&
                                  state.routeNames.includes("Auth");
                                if (!hasAuthTab) {
                                  Alert.alert(
                                    "Chưa sẵn sàng",
                                    "Hệ thống đang cập nhật trạng thái đăng nhập. Vui lòng thử lại sau vài giây hoặc reload app nếu vẫn gặp lỗi này!"
                                  );
                                  return;
                                }
                                navigation.navigate("Auth", {
                                  screen: "Login",
                                  params: {
                                    redirectParams: {
                                      screen: "SelectSeatsScreen",
                                      params: {
                                        screeningId: time.id,
                                        movieId,
                                        movieName,
                                        date: selectedDate,
                                        roomName: room.name,
                                        time: time.time,
                                        cinemaName: cinema.name,
                                        theaterRoomId: room.id,
                                        screeningPrice: time.price,
                                      },
                                    },
                                  },
                                });
                              } else {
                                // Nếu đã đăng nhập, chuyển đến màn hình chọn ghế
                                navigation.navigate("SelectSeatsScreen", {
                                  screeningId: time.id,
                                  movieId,
                                  movieName,
                                  date: selectedDate,
                                  roomName: room.name,
                                  time: time.time,
                                  cinemaName: cinema.name,
                                  theaterRoomId: room.id,
                                  screeningPrice: time.price,
                                });
                              }
                            }}
                          >
                            <Text style={styles.timeText}>{time.time}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
        {loading && (
          <ActivityIndicator
            size="large"
            color="#e71a0f"
            style={{ marginTop: 16 }}
          />
        )}
        {!loading && screenings.length === 0 && (
          <Text style={styles.noScreeningsText}>
            Không có suất chiếu nào cho ngày này.
          </Text>
        )}
      </ScrollView>

      {/* Footer Stats */}
      <View style={styles.footer}>
        <View style={styles.footerSection}>
          <Text style={styles.footerNumber}>{cinemas.length}</Text>
          <Text style={styles.footerLabel}>rạp đang chiếu phim này</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111", // Nền tối tổng thể
  },
  // Giữ nguyên Header, FormatSelector, DateSection cơ bản như trước
  // Tinh chỉnh lại DateColumn và selectedDateColumn
  header: {
    backgroundColor: "#0a0a0a",
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, // Tăng độ đậm shadow
    shadowRadius: 4,
    elevation: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    zIndex: 1, // Đảm bảo header nằm trên các nội dung khác
  },
  headerTitle: {
    flexDirection: "row",
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flexGrow: 1,
    marginLeft: -26,
  },
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a", // Nền nội dung chính
  },
  formatSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    backgroundColor: "#1a1a1a", // Đảm bảo màu nền khớp
  },
  formatText: {
    color: "#eee",
    fontSize: 18,
    fontWeight: "600",
  },
  allButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  allButtonText: {
    color: "#e71a0f",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 5,
  },
  dateSection: {
    paddingBottom: 10,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  datesContainer: {
    backgroundColor: "#222",
    paddingVertical: 10,
    flexDirection: "row",
    // paddingHorizontal: 10, // Thêm padding để cuộn dễ hơn
  },
  dateColumn: {
    alignItems: "center",
    paddingHorizontal: 12, // Giữ padding vừa phải
    paddingVertical: 8,
    minWidth: 65, // Điều chỉnh minWidth
    justifyContent: "center",
    // Không dùng background khi chưa chọn, chỉ dùng border
    // borderBottomWidth: 2,
    // borderBottomColor: 'transparent',
  },
  selectedDateColumn: {
    // Background màu khác khi chọn
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    // Thêm border dưới nổi bật hơn
    borderBottomWidth: 3, // Border dày hơn
    borderBottomColor: "#e71a0f", // Màu đỏ CGV
  },
  dayText: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 5,
    fontWeight: "500",
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "600",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#444",
  },
  selectedDayCircle: {
    backgroundColor: "#e71a0f",
    borderColor: "#e71a0f",
  },
  dayNumber: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  selectedDayNumber: {
    color: "#fff",
    fontWeight: "bold",
  },
  fullDateText: {
    color: "#ddd",
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },
  cinemaList: {
    paddingTop: 10, // Khoảng cách trên list rạp
    paddingBottom: 80,
    paddingHorizontal: 10, // Thêm padding ngang cho list
  },
  cinemaItem: {
    backgroundColor: "#222", // Nền cho mỗi rạp
    marginBottom: 12, // Tăng khoảng cách giữa các rạp
    borderRadius: 10, // Bo góc nhiều hơn
    overflow: "hidden",
    // marginHorizontal: 10, // Đã thêm padding ngang ở cinemaList
    // Thêm shadow để tạo hiệu ứng "card"
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4, // Shadow xuống dưới
    },
    shadowOpacity: 0.3, // Độ đậm shadow
    shadowRadius: 5,
    elevation: 8,
  },
  cinemaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18, // Tăng padding
    paddingHorizontal: 15,
    backgroundColor: "#2c2c2c", // Nền header rạp
    // borderBottomWidth: 0.5, // Bỏ border dưới
    // borderBottomColor: '#3a3a3a',
  },
  cinemaNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  cinemaPrefix: {
    color: "#e71a0f",
    fontSize: 19, // Lớn hơn một chút
    fontWeight: "bold",
    marginRight: 10, // Tăng khoảng cách
  },
  cinemaName: {
    color: "#fff",
    fontSize: 17, // Lớn hơn một chút
    fontWeight: "500",
    flexShrink: 1,
  },
  cinemaControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  favoriteButton: {
    marginRight: 15,
    padding: 5,
  },
  showtimeContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#222", // Nền nội dung rạp
  },
  formatGroup: {
    marginBottom: 25, // Tăng khoảng cách giữa các định dạng/phòng
  },
  formatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15, // Tăng khoảng cách
  },
  formatDot: {
    width: 10, // Lớn hơn
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffcc00", // Màu vàng
    marginRight: 10,
  },
  formatTitle: {
    color: "#eee",
    fontSize: 16, // Lớn hơn
    fontWeight: "600",
    marginRight: 10,
  },
  specialBadge: {
    backgroundColor: "#3a2a00",
    borderWidth: 1,
    borderRadius: 15, // Bo góc nhiều hơn
    borderColor: "#d4af37",
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  specialBadgeText: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "600",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Giảm margin trái để bù cho padding ngang của timeSlot
    // marginLeft: -4,
  },
  timeSlot: {
    backgroundColor: "#333",
    borderRadius: 6, // Bo góc nhẹ hơn
    paddingVertical: 12, // Tăng padding
    paddingHorizontal: 14, // Tăng padding
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
    minWidth: 75, // Điều chỉnh minWidth
    borderWidth: 1,
    borderColor: "#444",
    // Thêm shadow nhẹ cho time slot
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  timeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  // Thêm style cho trạng thái khi nút được nhấn (có thể dùng TouchableOpacity onPressIn/Out hoặc Pressable)
  timeSlotPressed: {
    backgroundColor: "#444",
    borderColor: "#555",
    // Shadow khi nhấn có thể thay đổi
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#0a0a0a",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 }, // Shadow hất lên
    shadowOpacity: 0.4, // Tăng độ đậm
    shadowRadius: 6, // Tăng bán kính
    elevation: 10,
    paddingBottom: 10,
    zIndex: 1, // Đảm bảo footer nằm trên các nội dung khác
  },
  footerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  footerNumber: {
    color: "#e71a0f",
    fontSize: 24, // Lớn hơn
    fontWeight: "bold",
    marginBottom: 2, // Giảm khoảng cách
  },
  footerLabel: {
    color: "#bbb",
    fontSize: 13,
    textAlign: "center",
  },
  loadingIndicator: {
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    // Tạo khoảng cách từ lề trái của header và vùng chạm lớn hơn
    padding: 8,
    // Nếu muốn nút lùi vào so với paddingHorizontal của header:
    // marginLeft: 5,
    marginRight: 12,
  },
  noScreeningsText: {
    color: "#ddd",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});

export default BookingScreen;
