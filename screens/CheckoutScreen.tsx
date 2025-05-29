import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import {
  updateReservationStatus,
  createMultipleTickets,
  processPayment,
  cancelSeatReservations,
  orderFoodDrinks,
  FoodDrink,
} from "../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCurrency } from "../utils/formatUtils";

// Định nghĩa interface cho phương thức thanh toán
interface PaymentMethod {
  id: string;
  name: string;
  image: string;
  details: string;
  selected: boolean;
}

// Dữ liệu cho phương thức thanh toán
const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: "1",
    name: "PayPal",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png",
    details: "Thanh toán an toàn qua PayPal",
    selected: true,
  },
  {
    id: "2",
    name: "Mastercard",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png",
    details: "4272 4724 ****",
    selected: false,
  },
];

interface FoodDrinkItem extends FoodDrink {
  quantity: number;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const {
    movieTitle,
    ticketCount,
    date,
    time,
    price,
    screeningId,
    seatIds,
    selectedSeatsText,
    cinemaName,
    reservationId,
    expiresAt,
    movieId,
    foodDrinks,
    foodDrinkTotal,
  } = route.params as {
    movieTitle: string;
    ticketCount: number;
    date: string;
    time: string;
    price: number;
    screeningId: number;
    seatIds: number[];
    selectedSeatsText: string;
    cinemaName: string;
    reservationId: string;
    expiresAt: string;
    movieId: string;
    foodDrinks?: FoodDrinkItem[];
    foodDrinkTotal?: number;
  };

  const [selectedPayment, setSelectedPayment] = useState<string | null>(
    defaultPaymentMethods.find((pm) => pm.selected)?.id || null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    defaultPaymentMethods
  );
  // State cho countdown timer
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [createdTicketIds, setCreatedTicketIds] = useState<number[]>([]);
  const [expandFoodDrink, setExpandFoodDrink] = useState(false);

  const totalPrice = price + (foodDrinkTotal || 0);
  const RESERVATION_STORAGE_KEY = `booking_${screeningId}_${movieId}`;

  // Hàm lưu trạng thái reservation trong AsyncStorage
  const saveReservationState = async () => {
    try {
      if (reservationId) {
        await AsyncStorage.setItem(
          RESERVATION_STORAGE_KEY,
          JSON.stringify({
            reservationId: reservationId,
            expiresAt: expiresAt,
            navigationState: "in_checkout",
            timestamp: new Date().toISOString(),
            selectedSeats: seatIds,
            isTemporary: true,
            createdTicketIds: createdTicketIds,
          })
        );
        console.log(
          "Đã lưu trạng thái reservation trong CheckoutScreen:",
          reservationId
        );
      }
    } catch (error) {
      console.error("Lỗi khi lưu trạng thái trong CheckoutScreen:", error);
    }
  };

  // Xử lý timer khi có expiresAt
  useEffect(() => {
    if (!expiresAt) return;

    // Lưu trạng thái khi component mount
    saveReservationState();

    const calculateRemainingTime = () => {
      const expiry = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((expiry - now) / 1000));
    };

    setRemainingTime(calculateRemainingTime());

    const timer = setInterval(() => {
      if (!timerActive) return;

      const timeLeft = calculateRemainingTime();
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        // Hết thời gian, hủy reservation và quay về màn hình chọn ghế
        clearInterval(timer);
        handleReservationExpired();
      }
    }, 1000);

    // Handle back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => {
      clearInterval(timer);
      backHandler.remove();
    };
  }, [expiresAt, timerActive]);

  // Kiểm tra nếu đã có thanh toán từ PayPal
  useEffect(() => {
    const checkPayPalTransaction = async () => {
      try {
        const transactionId = await AsyncStorage.getItem(
          "paypal_transaction_id"
        );
        if (transactionId) {
          console.log("Đã tìm thấy PayPal transaction ID:", transactionId);
          // Xóa transaction ID từ AsyncStorage
          await AsyncStorage.removeItem("paypal_transaction_id");
          // Xử lý hoàn tất thanh toán
          handlePayPalSuccess(transactionId);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra PayPal transaction:", error);
      }
    };

    checkPayPalTransaction();
  }, []);

  // Xử lý khi người dùng nhấn nút back
  const handleBackPress = () => {
    // Không cần hủy reservation vì cần giữ khi quay lại màn hình chọn ghế
    navigation.goBack();
    return true;
  };

  // Xử lý khi reservation hết hạn
  const handleReservationExpired = async () => {
    try {
      setTimerActive(false);

      // Hủy reservation
      if (reservationId) {
        await cancelSeatReservations(reservationId);
        console.log("Đã hủy reservation do hết thời gian:", reservationId);

        // Xóa dữ liệu từ AsyncStorage
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
      }

      Alert.alert(
        "Hết thời gian đặt vé",
        "Thời gian giữ ghế đã hết. Vui lòng chọn ghế lại.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Lỗi khi xử lý hết hạn reservation:", error);
      navigation.goBack();
    }
  };

  const handleSelectPayment = (id: string) => {
    setSelectedPayment(id);
    const updatedMethods = paymentMethods.map((pm: PaymentMethod) =>
      pm.id === id ? { ...pm, selected: true } : { ...pm, selected: false }
    );
    setPaymentMethods(updatedMethods);
  };

  const handleAddPayment = () => {
    Alert.alert(
      "Thông báo",
      "Tính năng thêm phương thức thanh toán sẽ được phát triển trong tương lai"
    );
  };

  // Xử lý khi PayPal thanh toán thành công
  const handlePayPalSuccess = async (transactionId: string) => {
    try {
      setIsProcessing(true);

      // Kiểm tra xem giao dịch này đã được xử lý trước đó chưa
      const processedTransactions = await AsyncStorage.getItem(
        "processed_paypal_transactions"
      );
      const processedTxList = processedTransactions
        ? JSON.parse(processedTransactions)
        : [];

      // Nếu giao dịch đã được xử lý, chuyển thẳng đến màn hình vé
      if (processedTxList.includes(transactionId)) {
        console.log("Giao dịch đã được xử lý trước đó:", transactionId);

        // Đảm bảo đánh dấu thanh toán thành công
        await AsyncStorage.setItem("payment_completed", "true");
        await AsyncStorage.setItem(
          "payment_success_timestamp",
          new Date().toISOString()
        );

        // Xóa các dữ liệu tạm thời nếu còn
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem("paypal_transaction_id");
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

        // Chuyển đến màn hình vé
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "MyTicket",
              params: {
                fromPaymentSuccess: true,
                timestamp: new Date().getTime(),
              },
            },
          ],
        });

        // Xóa toàn bộ thông tin liên quan đến ticketId, reservation, payment flag
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        await AsyncStorage.removeItem("payment_completed");
        await AsyncStorage.removeItem("payment_success_timestamp");
        await AsyncStorage.removeItem("paypal_transaction_id");

        return;
      }

      // Lưu giao dịch vào danh sách đã xử lý trước khi thực hiện xử lý
      const updatedTxList = [...processedTxList, transactionId];
      await AsyncStorage.setItem(
        "processed_paypal_transactions",
        JSON.stringify(updatedTxList)
      );
      console.log("Đã lưu giao dịch vào danh sách đã xử lý:", transactionId);

      // Lấy ticket IDs từ AsyncStorage
      let ticketIdsToProcess = createdTicketIds;
      try {
        const savedTicketIds = await AsyncStorage.getItem("created_ticket_ids");
        if (savedTicketIds) {
          ticketIdsToProcess = JSON.parse(savedTicketIds);
          console.log("Đã lấy ticket IDs từ AsyncStorage:", ticketIdsToProcess);
        } else if (!ticketIdsToProcess || ticketIdsToProcess.length === 0) {
          throw new Error("Không tìm thấy thông tin vé");
        }

        // Xử lý các bước sau khi thanh toán PayPal thành công
        try {
          // Cập nhật trạng thái thanh toán cho các vé
          await processPayment({
            ticketIds: ticketIdsToProcess,
            paymentMethod: "paypal",
            amount: totalPrice,
            transactionId: transactionId,
          });
          console.log("Xử lý thanh toán thành công với mã:", transactionId);
        } catch (processError: any) {
          console.error("Lỗi khi xử lý payment:", processError);

          // Nếu lỗi là do mã giao dịch đã tồn tại
          if (
            processError.message &&
            (processError.message.includes("đã tồn tại") ||
              processError.message.includes("already exists"))
          ) {
            console.log("Giao dịch đã được xử lý trên server:", transactionId);
            // Tiếp tục xử lý như thành công
          } else {
            // Nếu là lỗi khác, xóa giao dịch khỏi danh sách đã xử lý để có thể thử lại
            const filteredTxList = processedTxList.filter(
              (tx: string) => tx !== transactionId
            );
            await AsyncStorage.setItem(
              "processed_paypal_transactions",
              JSON.stringify(filteredTxList)
            );

            throw processError;
          }
        }

        // Đặt đồ ăn nếu có
        if (foodDrinks && foodDrinks.length > 0) {
          try {
            const ticketId = ticketIdsToProcess[0]; // Lấy ID vé đầu tiên
            const foodDrinkItems = foodDrinks.map((item) => ({
              food_drink_id: item.id,
              quantity: item.quantity,
            }));

            await orderFoodDrinks({
              ticket_id: ticketId,
              items: foodDrinkItems,
            });
            console.log("Đã đặt đồ ăn thành công");
          } catch (foodError) {
            console.error("Lỗi khi đặt đồ ăn:", foodError);
            // Vẫn coi là thành công vì vé đã được tạo và thanh toán
          }
        }

        // Xóa thông tin đặt chỗ tạm thời sau khi thanh toán thành công
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        // Xóa ticket IDs đã lưu
        await AsyncStorage.removeItem("created_ticket_ids");

        // Đánh dấu thanh toán thành công trong AsyncStorage
        await AsyncStorage.setItem("payment_completed", "true");
        // Thêm timestamp để đảm bảo reload dữ liệu
        await AsyncStorage.setItem(
          "payment_success_timestamp",
          new Date().toISOString()
        );

        // Thông báo thành công và chuyển hướng
        Alert.alert(
          "Thanh toán thành công!",
          "Vé của bạn đã được đặt thành công. Bạn có thể xem vé trong mục 'Vé của tôi'.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: "MyTicket",
                      params: {
                        fromPaymentSuccess: true,
                        timestamp: new Date().getTime(),
                      },
                    },
                  ],
                });
              },
            },
          ]
        );

        // Xóa toàn bộ thông tin liên quan đến ticketId, reservation, payment flag
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        await AsyncStorage.removeItem("payment_completed");
        await AsyncStorage.removeItem("payment_success_timestamp");
        await AsyncStorage.removeItem("paypal_transaction_id");
      } catch (error: any) {
        // Xóa giao dịch khỏi danh sách đã xử lý nếu xảy ra lỗi
        const filteredTxList = processedTxList.filter(
          (tx: string) => tx !== transactionId
        );
        await AsyncStorage.setItem(
          "processed_paypal_transactions",
          JSON.stringify(filteredTxList)
        );

        console.error("Lỗi khi hoàn tất thanh toán PayPal:", error);
        Alert.alert(
          "Lỗi thanh toán",
          error.message ||
            "Đã xảy ra lỗi trong quá trình hoàn tất thanh toán. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Lỗi khi hoàn tất thanh toán PayPal:", error);
      Alert.alert(
        "Lỗi thanh toán",
        error.message ||
          "Đã xảy ra lỗi trong quá trình hoàn tất thanh toán. Vui lòng thử lại."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) {
      Alert.alert("Thông báo", "Vui lòng chọn phương thức thanh toán!");
      return;
    }

    setIsProcessing(true);
    setTimerActive(false); // Tạm dừng timer khi đang xử lý thanh toán

    try {
      // 1. Cập nhật trạng thái đặt chỗ thành "processing_payment"
      await updateReservationStatus({
        screeningId,
        seatIds,
      });

      // 2. Tạo vé cho tất cả ghế đã chọn
      // Giả sử mỗi ghế có giá bằng nhau, tính bằng cách chia đều tổng tiền
      const pricePerSeat = price / seatIds.length;
      const prices = seatIds.map(() => pricePerSeat);

      const tickets = await createMultipleTickets({
        screeningId,
        seatIds,
        prices,
        foodDrinks:
          foodDrinks?.map((item) => ({
            food_drink_id: item.id,
            quantity: item.quantity,
          })) || [],
      });

      console.log("Đã tạo vé thành công:", tickets);

      // Lưu lại danh sách ID vé đã tạo
      const ticketIds = tickets.map((ticket) => ticket.id);
      setCreatedTicketIds(ticketIds);

      // Lưu vào AsyncStorage cho hàm callback có thể truy cập
      await AsyncStorage.setItem(
        "created_ticket_ids",
        JSON.stringify(ticketIds)
      );

      const selectedMethod = paymentMethods.find(
        (m: PaymentMethod) => m.id === selectedPayment
      );

      // 3. Xử lý thanh toán theo phương thức đã chọn
      if (selectedMethod?.name === "PayPal") {
        // Thanh toán bằng PayPal
        setIsProcessing(false); // Dừng hiển thị loading để chuyển sang màn hình PayPal

        // Chuyển sang màn hình thanh toán PayPal
        navigation.navigate("PayPalPaymentScreen", {
          amount: totalPrice,
          description: `Đặt vé xem phim ${movieTitle} - ${cinemaName}`,
          ticketIds: ticketIds,
        });
      } else {
        // Thanh toán bằng các phương thức khác
        const foodDrinkItems = [];
        if (foodDrinks && foodDrinks.length > 0) {
          for (const item of foodDrinks) {
            foodDrinkItems.push({
              food_drink_id: item.id,
              quantity: item.quantity,
            });
          }
        }

        await processPayment({
          ticketIds,
          paymentMethod: selectedMethod?.name.toLowerCase() || "credit_card",
          amount: totalPrice,
        });

        // Đánh dấu thanh toán thành công trong AsyncStorage
        await AsyncStorage.setItem("payment_completed", "true");

        // Xóa thông tin đặt chỗ tạm thời sau khi thanh toán thành công
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

        // Đặt đồ ăn nếu có
        if (foodDrinkItems.length > 0) {
          try {
            const ticketId = tickets[0].id; // Lấy ID vé đầu tiên
            await orderFoodDrinks({
              ticket_id: ticketId,
              items: foodDrinkItems,
            });
          } catch (foodError) {
            console.error("Lỗi khi đặt đồ ăn:", foodError);
            // Vẫn coi là thành công vì vé đã được tạo và thanh toán
          }
        }

        // 4. Thông báo thành công và chuyển hướng
        Alert.alert(
          "Thanh toán thành công!",
          "Vé của bạn đã được đặt thành công. Bạn có thể xem vé trong mục 'Vé của tôi'.",
          [
            {
              text: "OK",
              onPress: () => {
                // Set payment success flag in AsyncStorage to ensure it persists
                AsyncStorage.setItem(
                  "payment_success_timestamp",
                  new Date().toISOString()
                ).then(() => {
                  console.log("Payment success flag set in AsyncStorage");

                  // Clear any existing navigation state and force reload
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: "MyTicket",
                        params: {
                          fromPaymentSuccess: true,
                          timestamp: new Date().getTime(), // Add timestamp to force update
                        },
                      },
                    ],
                  });
                });
              },
            },
          ]
        );

        // Xóa toàn bộ thông tin liên quan đến ticketId, reservation, payment flag
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        await AsyncStorage.removeItem("payment_completed");
        await AsyncStorage.removeItem("payment_success_timestamp");
        await AsyncStorage.removeItem("paypal_transaction_id");
      }
    } catch (error: any) {
      setIsProcessing(false);
      console.error("Payment error:", error);

      // Kiểm tra lỗi ghế đã bị đặt
      if (
        error.message &&
        (error.message.includes("Ghế với id") ||
          error.message.includes("đã được đặt"))
      ) {
        // Hiển thị thông báo lỗi ghế đã bị đặt
        Alert.alert(
          "Ghế đã bị đặt",
          "Có người đã đặt trước ghế của bạn. Vui lòng quay lại chọn ghế khác."
        );
      } else {
        // Hiển thị thông báo lỗi chung
        Alert.alert(
          "Lỗi",
          error.message || "Có lỗi xảy ra trong quá trình thanh toán"
        );
      }
    }
  };

  // Xử lý khi focus vào màn hình
  useFocusEffect(
    React.useCallback(() => {
      // Lưu trạng thái reservation khi focus vào màn hình
      saveReservationState();

      return () => {
        // Không cần làm gì khi unfocus
      };
    }, [reservationId, expiresAt, seatIds])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>

        {/* Hiển thị timer nếu có expiresAt */}
        {expiresAt && (
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Text style={styles.timerText}>
              {Math.floor(remainingTime / 60)}:
              {(remainingTime % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Thông tin phim */}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle}>{movieTitle}</Text>
          <View style={styles.ratingDuration}>
            <Text style={styles.duration}>{cinemaName}</Text>
          </View>
        </View>

        {/* Thông tin đặt vé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đặt vé</Text>
          <View style={styles.bookingRow}>
            <Ionicons name="ticket" size={20} color="#888" />
            <Text style={styles.bookingLabel}>Vé</Text>
            <Text style={styles.bookingValue}>{ticketCount} Vé</Text>
          </View>
          <View style={styles.bookingRow}>
            <Ionicons name="calendar" size={20} color="#888" />
            <Text style={styles.bookingLabel}>Ngày</Text>
            <Text style={styles.bookingValue}>{date}</Text>
          </View>
          <View style={styles.bookingRow}>
            <Ionicons name="time" size={20} color="#888" />
            <Text style={styles.bookingLabel}>Thời gian</Text>
            <Text style={styles.bookingValue}>{time}</Text>
          </View>
          <View style={styles.bookingRow}>
            <Ionicons name="grid" size={20} color="#888" />
            <Text style={styles.bookingLabel}>Ghế</Text>
            <Text style={styles.bookingValue}>{selectedSeatsText}</Text>
          </View>
        </View>

        {/* Thông tin giá */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá vé</Text>
            <Text style={styles.priceValue}>
              {price.toLocaleString("vi-VN") + "đ"}
            </Text>
          </View>

          {foodDrinkTotal && foodDrinkTotal > 0 && (
            <>
              <TouchableOpacity
                style={styles.expandableRow}
                onPress={() => setExpandFoodDrink(!expandFoodDrink)}
              >
                <View style={styles.expandableLabelContainer}>
                  <Ionicons name="fast-food-outline" size={18} color="#888" />
                  <Text style={styles.priceLabel}>Đồ ăn & Thức uống</Text>
                  <Ionicons
                    name={expandFoodDrink ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#888"
                  />
                </View>
                <Text style={styles.priceValue}>
                  {foodDrinkTotal.toLocaleString("vi-VN") + "đ"}
                </Text>
              </TouchableOpacity>

              {expandFoodDrink && foodDrinks && foodDrinks.length > 0 && (
                <View style={styles.expandedContent}>
                  {foodDrinks.map((item, index) => (
                    <View key={`food-${index}`} style={styles.foodItemRow}>
                      <View style={styles.foodItemInfo}>
                        <Text style={styles.foodItemName}>{item.name}</Text>
                        <Text style={styles.foodItemQuantity}>
                          x{item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.foodItemPrice}>
                        {(item.quantity * item.price).toLocaleString("vi-VN") +
                          "đ"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.totalPriceRow}>
            <Text style={styles.totalPriceLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalPriceValue}>
              {totalPrice.toLocaleString("vi-VN") + "đ"}
            </Text>
          </View>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          {paymentMethods.map((method: PaymentMethod) => (
            <TouchableOpacity
              key={method.id}
              style={styles.paymentMethodRow}
              onPress={() => handleSelectPayment(method.id)}
            >
              <Image
                source={{ uri: method.image }}
                style={styles.paymentIcon}
              />
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentName}>{method.name}</Text>
                <Text style={styles.paymentDetailsText}>{method.details}</Text>
              </View>
              <Ionicons
                name={
                  selectedPayment === method.id
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color="#FF4444"
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={handleAddPayment}
          >
            <Ionicons name="add" size={20} color="#FF4444" />
            <Text style={styles.addPaymentText}>
              Thêm phương thức thanh toán
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thêm khoảng trống ở cuối để đảm bảo có thể cuộn qua nút thanh toán */}
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Nút Confirm Payment - cố định ở dưới cùng */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isProcessing && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Xác nhận thanh toán</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  ratingDuration: {
    flexDirection: "row",
    alignItems: "center",
  },
  duration: {
    color: "#888",
    fontSize: 14,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingLabel: {
    color: "#888",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  bookingValue: {
    color: "#fff",
    fontSize: 14,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceLabel: {
    color: "#888",
    fontSize: 14,
  },
  priceValue: {
    color: "#fff",
    fontSize: 14,
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  paymentIcon: {
    width: 30,
    height: 20,
    marginRight: 10,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentName: {
    color: "#fff",
    fontSize: 14,
  },
  paymentDetailsText: {
    color: "#888",
    fontSize: 12,
  },
  addPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  addPaymentText: {
    color: "#FF4444",
    fontSize: 14,
    marginLeft: 5,
  },
  buttonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2C3539",
    backgroundColor: "#1C2526",
  },
  confirmButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmButtonDisabled: {
    backgroundColor: "#888",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 14,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    color: "#fff",
    fontSize: 14,
  },
  orderDetail: {
    color: "#888",
    fontSize: 12,
  },
  orderPrice: {
    color: "#fff",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#2C3539",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: "#888",
    fontSize: 14,
  },
  totalValue: {
    color: "#fff",
    fontSize: 14,
  },
  bottomSpace: {
    height: 80, // Thêm khoảng trống để đảm bảo có thể cuộn qua nút
  },
  totalPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 5,
  },
  totalPriceLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  totalPriceValue: {
    color: "#FF4444",
    fontSize: 18,
    fontWeight: "bold",
  },
  expandableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C3539",
  },
  expandableLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandedContent: {
    paddingVertical: 10,
    paddingLeft: 15,
    backgroundColor: "#1a2023",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  foodItemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  foodItemName: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  foodItemQuantity: {
    color: "#888",
    fontSize: 12,
    marginLeft: 8,
    minWidth: 30,
  },
  foodItemPrice: {
    color: "#fff",
    fontSize: 14,
  },
});

export default CheckoutScreen;
