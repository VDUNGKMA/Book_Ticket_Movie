import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getTicketDetail } from "../api/api";
import QRCode from "react-native-qrcode-svg";

const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { ticketId } = route.params as { ticketId: number };

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getTicketDetail(ticketId);
        console.log("getTicketDetail data:", data);
        setTicket(data);
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      console.log("Ticket detail (state):", ticket);
    }
  }, [ticket]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#FF4444"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "#fff", marginTop: 40, textAlign: "center" }}>
          Không tìm thấy vé
        </Text>
      </SafeAreaView>
    );
  }

  // Map dữ liệu từ API
  const movieTitle = ticket.screening?.movie?.title || "";
  const cinema = ticket.screening?.theaterRoom?.theater?.name || "";
  const startTime = ticket.screening?.start_time
    ? new Date(ticket.screening.start_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const endTime = ticket.screening?.end_time
    ? new Date(ticket.screening.end_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const date = ticket.screening?.start_time
    ? new Date(ticket.screening.start_time).toLocaleDateString("vi-VN")
    : "";
  const ticketCount = Array.isArray(ticket.ticketSeats)
    ? ticket.ticketSeats.length
    : 0;
  const seats = Array.isArray(ticket.ticketSeats)
    ? ticket.ticketSeats
        .map((s: any) =>
          s.seat ? (s.seat.seat_row || "") + (s.seat.seat_number || "") : ""
        )
        .join(", ")
    : "";
  const statusCode = ticket.status || "active";
  const price = ticket.total_price || 0;
  const room_name = ticket.screening?.theaterRoom?.room_name || "";
  const foodDrinks = Array.isArray(ticket.foodDrinks)
    ? ticket.foodDrinks.map((item: any) => ({
        id: item.foodDrink?.id,
        name: item.foodDrink?.name || "N/A",
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        status: item.status,
      }))
    : [];

  // Giá suất chiếu (giá mặc định của screening)
  const screeningPrice = Number(ticket.screening?.price) || 0;

  // Tổng giá ghế (cộng tất cả price của ticketSeats)
  const seatTotal = Array.isArray(ticket.ticketSeats)
    ? ticket.ticketSeats.reduce(
        (sum: number, s: any) => sum + (Number(s.price) || 0),
        0
      )
    : 0;

  // Tổng giá vé (suất chiếu + ghế)
  const ticketTotal = screeningPrice + seatTotal;

  // Tổng giá đồ ăn
  const foodTotal = Array.isArray(foodDrinks)
    ? foodDrinks.reduce(
        (sum: number, item: any) => sum + (Number(item.totalPrice) || 0),
        0
      )
    : 0;

  // Tổng cộng
  const grandTotal = ticketTotal + foodTotal;

  const handleDownloadPDF = () => {
    alert("Downloading ticket PDF... (feature to be implemented)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Thanh trên cùng */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết vé</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Thông tin phim */}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle}>{movieTitle}</Text>
          <Text style={styles.cinemaTime}>
            {cinema} | {startTime} - {endTime}
          </Text>
        </View>

        {/* Thông tin đặt vé */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ngày đặt</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phòng chiếu</Text>
            <Text style={styles.detailValue}>{room_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số lượng ghế</Text>
            <Text style={styles.detailValue}>{ticketCount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ghế</Text>
            <View style={styles.seatWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={[styles.detailValue, styles.seatValue]}>
                  {seats}
                </Text>
              </ScrollView>
              <Text
                style={[
                  styles.seatStatus,
                  { color: statusCode === "active" ? "#00FF00" : "#FF4444" },
                ]}
              >
                {statusCode}
              </Text>
            </View>
          </View>
        </View>

        {/* Thông tin giá vé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết giá vé</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Giá suất chiếu</Text>
            <Text style={styles.detailValue}>
              {screeningPrice.toLocaleString("vi-VN")}đ
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng giá ghế</Text>
            <Text style={styles.detailValue}>
              {seatTotal.toLocaleString("vi-VN")}đ
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng giá vé</Text>
            <Text style={styles.detailValue}>
              {ticketTotal.toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>

        {/* Thông tin đồ ăn nếu có */}
        {Array.isArray(foodDrinks) && foodDrinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đồ ăn & Thức uống</Text>
            {foodDrinks.map((item: any, index: number) => (
              <View key={index} style={styles.foodItem}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name || "N/A"}</Text>
                  <Text style={styles.foodQuantity}>x{item.quantity ?? 0}</Text>
                </View>
                <View>
                  <Text style={styles.foodPrice}>
                    Đơn giá:{" "}
                    {item.unitPrice
                      ? item.unitPrice.toLocaleString("vi-VN")
                      : 0}
                    đ
                  </Text>
                  <Text style={styles.foodPrice}>
                    Thành tiền:{" "}
                    {item.totalPrice
                      ? item.totalPrice.toLocaleString("vi-VN")
                      : 0}
                    đ
                  </Text>
                </View>
              </View>
            ))}
            {/* Tổng giá đồ ăn */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tổng giá đồ ăn</Text>
              <Text style={styles.detailValue}>
                {foodTotal.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          </View>
        )}

        {/* Tổng cộng */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                { fontWeight: "bold", color: "#FF4444" },
              ]}
            >
              Tổng cộng
            </Text>
            <Text
              style={[
                styles.detailValue,
                { fontWeight: "bold", color: "#FF4444" },
              ]}
            >
              {grandTotal.toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>

        {/* Mã QR code nếu có */}
        {ticket.qrCode &&
          ticket.qrCode.qr_code &&
          typeof ticket.qrCode.qr_code === "string" && (
            <View style={styles.barcodeSection}>
              <TouchableOpacity onPress={() => setQrModalVisible(true)}>
                <QRCode
                  value={ticket.qrCode.qr_code}
                  size={250}
                  color="black"
                  backgroundColor="white"
                />
              </TouchableOpacity>
              <Text style={styles.barcodeText}>
                Quét mã này tại quầy soát vé
              </Text>
            </View>
          )}
      </ScrollView>
      {/* Nút Download Ticket PDF */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownloadPDF}
      >
        <Text style={styles.downloadButtonText}>Tải vé PDF</Text>
      </TouchableOpacity>

      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <QRCode
              value={ticket.qrCode.qr_code}
              size={350}
              color="black"
              backgroundColor="white"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  movieInfo: {
    padding: 15,
  },
  movieTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cinemaTime: {
    color: "#888",
    fontSize: 14,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: {
    color: "#888",
    fontSize: 14,
  },
  detailValue: {
    color: "#fff",
    fontSize: 14,
  },
  seatWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  seatValue: {
    marginRight: 10,
    maxWidth: 180,
  },
  seatStatus: {
    fontSize: 14,
  },
  barcodeSection: {
    alignItems: "center",
    padding: 15,
  },
  barcode: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  barcodeText: {
    color: "#888",
    fontSize: 14,
  },
  downloadButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 15,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  foodInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  foodName: {
    color: "#fff",
    fontSize: 14,
    marginRight: 10,
  },
  foodQuantity: {
    color: "#888",
    fontSize: 14,
  },
  foodPrice: {
    color: "#fff",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#FF4444",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default TicketDetailScreen;
