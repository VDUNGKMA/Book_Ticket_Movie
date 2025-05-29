import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  Dimensions,
  Image,
  StatusBar,
  ScrollView,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Calendar } from "react-native-calendars";
import { getUserTickets } from "../api/api";
import { BASE_URL } from "../config/config";

// Định nghĩa interface cho vé
interface Ticket {
  id: string;
  date: string;
  movieTitle: string;
  cinema: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  price?: number;
  seatPrice?: number;
  seats?: string[];
  statusCode?: string;
  room_name?: string;
  foodDrinks?: FoodDrinkItem[];
  startDateTime: Date;
}

interface FoodDrinkItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Định nghĩa kiểu cho tham số day trong onDayPress
interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

// Dữ liệu giả cho vé sắp tới (Upcoming)
const initialTickets: Ticket[] = [
  {
    id: "1",
    date: "29 July 2022",
    movieTitle: "Alien Romulus",
    cinema: "Starlight Cinemas",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    totalPrice: 54.5,
    price: 52.0,
    seatPrice: 2.5,
    statusCode: "Enter Room",
    startDateTime: new Date("2022-07-29T09:00:00"),
  },
  {
    id: "2",
    date: "27 November 2024, Thu",
    movieTitle: "Above the Trees",
    cinema: "Starlight Cinemas",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    totalPrice: 24.7,
    price: 22.2,
    seatPrice: 2.5,
    statusCode: "Enter Room",
    startDateTime: new Date("2024-11-27T09:00:00"),
  },
];

// Hàm chuyển đổi định dạng ngày từ "27 November 2024" sang "2024-11-27"
const parseDateToISO = (dateStr: string): string => {
  const [dayMonthYear] = dateStr.split(","); // Lấy "27 November 2024"
  const [day, month, year] = dayMonthYear.trim().split(" ");
  const monthIndex = new Date(`${month} 1, 2020`).getMonth(); // Chuyển tháng thành số (0-11)
  return `${year}-${(monthIndex + 1)
    .toString()
    .padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const MyTicketScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">(
    "upcoming"
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [historyFilterDate, setHistoryFilterDate] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
  }, [tickets]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const userTickets = await getUserTickets();

      // Chuyển đổi định dạng từ API sang dạng hiển thị
      const formattedTickets = userTickets.map((ticket: any) => {
        const screening = ticket.screening;
        const theaterRoom = screening?.theaterRoom;
        const theater = theaterRoom?.theater;

        // Xử lý thông tin về ghế từ ticket_seats
        const ticketSeats = ticket.ticketSeats || [];
        const seats = ticketSeats.map((ts: any) => ts.seat);
        const seatNumbers = seats
          .map((seat: any) =>
            seat ? `${seat.seat_row}${seat.seat_number}` : ""
          )
          .filter(Boolean);

        // Xử lý thông tin về đồ ăn từ food_drinks
        const foodDrinks = (ticket.foodDrinks || []).map((fd: any) => ({
          id: fd.id,
          name: fd.foodDrink?.name || "Item không xác định",
          quantity: fd.quantity,
          unitPrice: fd.unit_price,
          totalPrice: fd.unit_price * fd.quantity,
          status: fd.status,
        }));

        const startTime = new Date(screening.start_time);
        const endTime = new Date(screening.end_time);

        const dateStr = startTime.toLocaleDateString("vi-VN");
        const startTimeStr = startTime.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const endTimeStr = endTime.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Sử dụng total_price từ API
        const totalPrice = ticket.total_price || 0;

        // Tính giá ghế nếu cần hiển thị chi tiết
        const seatPrice = ticketSeats.reduce(
          (sum: number, ts: any) => sum + parseFloat(ts.price || "0"),
          0
        );

        // Giá vé phim = tổng trừ giá ghế
        const ticketPrice = totalPrice - seatPrice;

        return {
          id: ticket.id.toString(),
          movieTitle: screening.movie.title,
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          cinema: theater?.name || "",
          hallNo: theaterRoom?.room_name || "",
          seats: seatNumbers,
          statusCode: ticket.status === "paid" ? "active" : "used",
          expired: startTime < new Date(),
          totalPrice: totalPrice,
          price: ticketPrice,
          seatPrice: seatPrice,
          room_name: screening.theaterRoom.room_name || "",
          foodDrinks: foodDrinks,
          image:
            `${BASE_URL}${screening.movie.poster_url}` ||
            "https://via.placeholder.com/200x300",
          startDateTime: new Date(screening.start_time),
        };
      });

      setTickets(formattedTickets);

      // Kiểm tra nếu không còn vé booked/pending
      const hasActiveTicket = formattedTickets.some(
        (ticket: any) =>
          ticket.statusCode === "booked" || ticket.statusCode === "pending"
      );
      if (!hasActiveTicket) {
        Alert.alert(
          "Thông báo",
          "Vé của bạn đã hết hạn do chưa thanh toán. Vui lòng đặt lại."
        );
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      // Nếu API lỗi hoặc chưa có thì dùng dữ liệu mẫu
      setTickets(initialTickets);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterDate = () => {
    setShowCalendar(true);
  };
  const handleDetail = (ticket: Ticket) => {
    navigation.navigate("TicketDetail", {
      ticketId: Number(ticket.id),
    });
  };
  const handleApplyFilter = () => {
    setShowCalendar(false);
    // Không setTickets ở đây nếu đang ở tab Lịch sử
  };

  const handleCancelFilter = () => {
    setShowCalendar(false);
    setTickets(initialTickets); // Reset về danh sách gốc
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketMovie}>{item.movieTitle}</Text>
        <Text style={styles.ticketCinema}>{item.cinema}</Text>
        <Text style={styles.ticketTime}>
          {item.startTime}| {item.date}
        </Text>
      </View>

      <View style={styles.ticketPriceContainer}>
        <Text style={styles.ticketPrice}>Giá vé:</Text>
        <Text style={styles.ticketPriceValue}>
          {item.totalPrice?.toLocaleString()}đ
        </Text>
      </View>
      <TouchableOpacity
        style={styles.detailButton}
        onPress={() => handleDetail(item)}
      >
        <Text style={styles.detailButtonText}>Chi tiết</Text>
      </TouchableOpacity>
    </View>
  );

  const getUpcomingTickets = (tickets: Ticket[]) => {
    const now = new Date();
    return tickets.filter((ticket) => ticket.startDateTime > now);
  };
  const getHistoryTickets = (tickets: Ticket[]) => {
    let filtered = tickets;
    if (historyFilterDate) {
      filtered = filtered.filter((ticket) => {
        const ticketDate = ticket.startDateTime.toISOString().split("T")[0];
       
        return ticketDate === historyFilterDate;
      });
    }
    return filtered;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vé của tôi</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab điều hướng */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.activeTabText,
            ]}
          >
            Sắp chiếu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách vé */}
      <FlatList
        data={
          activeTab === "upcoming"
            ? getUpcomingTickets(tickets)
            : getHistoryTickets(tickets)
        }
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ticketList}
      />

      {/* Bộ lọc ngày */}
      {activeTab === "history" && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterDate}
        >
          <Text style={styles.filterText}>Lọc ngày</Text>
        </TouchableOpacity>
      )}

      {/* Modal lịch */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarContainer}>
            <Text style={styles.modalTitle}>Filter Date</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: CalendarDay) => {
                setSelectedDate(day.dateString);
                if (activeTab === "history") {
                  setHistoryFilterDate(day.dateString);
                 
                }
              }}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: "#FF4444" },
              }}
              theme={{
                calendarBackground: "#2C3539",
                textSectionTitleColor: "#fff",
                dayTextColor: "#fff",
                selectedDayTextColor: "#fff",
                monthTextColor: "#fff",
                textDisabledColor: "#666",
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelFilter}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilter}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {activeTab === "history" && historyFilterDate && (
        <TouchableOpacity
          onPress={() => setHistoryFilterDate(null)}
          style={{ alignSelf: "flex-end", margin: 10 }}
        >
          <Text style={{ color: "#FF4444" }}>Bỏ lọc ngày</Text>
        </TouchableOpacity>
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
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF4444",
  },
  tabText: {
    color: "#888",
    fontSize: 14,
  },
  activeTabText: {
    color: "#FF4444",
    fontWeight: "bold",
  },
  ticketList: {
    padding: 15,
  },
  ticketCard: {
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  ticketDate: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  ticketInfo: {
    marginBottom: 10,
  },
  ticketMovie: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  ticketCinema: {
    color: "#888",
    fontSize: 14,
    marginBottom: 5,
  },
  ticketTime: {
    color: "#888",
    fontSize: 12,
  },
  ticketSeat: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  ticketPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  ticketPrice: {
    color: "#888",
    fontSize: 14,
  },
  ticketPriceValue: {
    color: "#fff",
    fontSize: 14,
  },
  detailButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  detailButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  filterButton: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#2C3539",
  },
  filterText: {
    color: "#FF4444",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    backgroundColor: "#2C3539",
    borderRadius: 10,
    padding: 15,
    width: Dimensions.get("window").width - 30,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#888",
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#FF4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2C3539",
    backgroundColor: "#1C2526",
  },
  tabBarItem: {
    alignItems: "center",
  },
  tabBarText: {
    color: "#888",
    fontSize: 12,
  },
});

export default MyTicketScreen;
