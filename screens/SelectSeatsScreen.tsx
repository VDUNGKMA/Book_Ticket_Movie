import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import {
  RouteProp,
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import {
  getSeats,
  getAvailableSeats,
  createSeatReservations,
  reserveSeats,
  reserveSeatsWithSuggestions,
  cancelSeatReservations,
} from "../api/api";
import { LinearGradient } from "expo-linear-gradient";
import { useUserContext } from "../context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";

interface Seat {
  id: number;
  theater_room_id: number;
  seat_row: string;
  seat_number: number;
  seat_type: "regular" | "vip" | "deluxe";
  price: string;
  createdAt: string;
  updatedAt: string;
  status: "available" | "booked" | "selected";
}

interface SeatSuggestion {
  id: number;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

const { width, height } = Dimensions.get("window");

const SelectSeatsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "SelectSeatsScreen">>();
  const { user } = useUserContext();
  const {
    screeningId: screeningIdStr,
    movieId,
    movieName,
    date,
    roomName,
    time,
    cinemaName,
    theaterRoomId,
    screeningPrice,
    fromPaymentSuccess, // Thêm fromPaymentSuccess là optional
  } = route.params as typeof route.params & { fromPaymentSuccess?: boolean };

  // Chuyển đổi screeningId từ string sang number
  const screeningId = parseInt(screeningIdStr, 10);

  // Log để kiểm tra giá trị
  console.log(
    "SelectSeatsScreen - screeningId:",
    screeningId,
    "từ string:",
    screeningIdStr
  );

  if (isNaN(screeningId)) {
    console.error("screeningId không hợp lệ:", screeningIdStr);
  }

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);
  const [reservationInProgress, setReservationInProgress] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestedSeats, setSuggestedSeats] = useState<SeatSuggestion[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<SeatSuggestion[][]>(
    []
  );

  // Thêm state cho thông tin reservation và timer
  const [reservationInfo, setReservationInfo] = useState<{
    reservationId: string | null;
    expiresAt: string | null;
  }>({
    reservationId: null,
    expiresAt: null,
  });
  const [remainingTime, setRemainingTime] = useState(0);
  const [hasNavigatedAway, setHasNavigatedAway] = useState(false);

  // Thêm một flag để đảm bảo không load lại khi quay lại từ màn hình
  const [isFirstLoading, setIsFirstLoading] = useState(true);
  const [isBackFromCheckout, setIsBackFromCheckout] = useState(false);
  const [isBackFromCheckoutProcessed, setIsBackFromCheckoutProcessed] =
    useState(false);

  // Thêm state để theo dõi thay đổi trong selection
  const [hasModifiedSelection, setHasModifiedSelection] = useState(false);

  const RESERVATION_STORAGE_KEY = `booking_${screeningId}_${movieId}`;

  // Cải thiện hàm lưu trạng thái reservation
  const saveReservationState = async (navigationState = "navigated_away") => {
    try {
      if (reservationInfo.reservationId) {
        console.log(
          `Lưu trạng thái reservation với navigationState=${navigationState}`
        );

        // Lấy danh sách ID các ghế đã chọn
        const selectedSeatIds: number[] = [];

        // Chỉ xử lý ghế trong trường hợp có ghế được chọn
        if (selectedSeats.length > 0) {
          // Duyệt qua từng ghế đã chọn và kiểm tra kỹ lưỡng
          for (const seatKey of selectedSeats) {
            const [row, numStr] = seatKey.split("-");
            if (!row || !numStr) continue;

            const seatNum = parseInt(numStr, 10);
            if (isNaN(seatNum)) continue;

            // Tìm ghế trong danh sách
            const seat = seats.find(
              (s) => s.seat_row === row && s.seat_number === seatNum
            );

            if (seat && seat.id > 0) {
              selectedSeatIds.push(seat.id);
            }
          }
        }

        // Lưu thông tin chi tiết và đầy đủ
        const dataToSave = {
          reservationId: reservationInfo.reservationId,
          expiresAt: reservationInfo.expiresAt,
          navigationState: navigationState, // Lưu trạng thái navigation
          timestamp: new Date().toISOString(),
          selectedSeats: selectedSeatIds,
          screeningId: screeningId,
          movieId: movieId,
          isTemporary: true, // Đánh dấu đây là reservation tạm thời
        };

        await AsyncStorage.setItem(
          RESERVATION_STORAGE_KEY,
          JSON.stringify(dataToSave)
        );

        console.log(
          "Đã lưu trạng thái reservation:",
          reservationInfo.reservationId,
          "với",
          selectedSeatIds.length,
          "ghế đã chọn"
        );
      }
    } catch (error) {
      console.error("Lỗi khi lưu trạng thái:", error);
    }
  };

  // Sửa lại hàm checkReservationState để cải thiện xử lý
  const checkReservationState = async () => {
    if (fromPaymentSuccess) {
      console.log("Skipping reservation check due to payment success");
      return;
    }

    try {
      const storedData = await AsyncStorage.getItem(RESERVATION_STORAGE_KEY);

      if (storedData) {
        const data = JSON.parse(storedData);
        console.log("Đã tìm thấy dữ liệu reservation đã lưu:", data);

        // Double-check if payment was successful (in case the flag was set after this function was called)
        if (fromPaymentSuccess) {
          console.log("Payment was successful, ignoring stored reservation");
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          return;
        }

        // Kiểm tra dữ liệu có hợp lệ không
        if (!data.reservationId || !data.expiresAt) {
          console.log("Dữ liệu reservation không hợp lệ");
          return;
        }

        // Kiểm tra xem thời gian có còn hợp lệ không
        const expiryTime = new Date(data.expiresAt).getTime();
        const now = new Date().getTime();
        const remainingMs = expiryTime - now;

        if (remainingMs <= 0) {
          console.log("Thời gian reservation đã hết hạn");
          // Xóa dữ liệu lưu trữ
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          // Reset trạng thái
          setReservationInfo({ reservationId: null, expiresAt: null });
          setSelectedSeats([]);
          fetchSeatsData(); // Tải lại danh sách ghế
          return;
        }

        // Trường hợp đã có reservation hợp lệ và quay lại từ màn hình home
        console.log("Phát hiện reservation hợp lệ, khôi phục trạng thái");

        // Cập nhật thông tin reservation để hiện countdown
        setReservationInfo({
          reservationId: data.reservationId,
          expiresAt: data.expiresAt,
        });

        // Cập nhật thời gian còn lại
        setRemainingTime(Math.floor(remainingMs / 1000));

        // Khôi phục danh sách ghế đã chọn
        if (
          data.selectedSeats &&
          Array.isArray(data.selectedSeats) &&
          data.selectedSeats.length > 0
        ) {
          console.log(
            "Khôi phục ghế đã chọn từ reservation cũ:",
            data.selectedSeats
          );

          // QUAN TRỌNG: Đánh dấu là cần khôi phục từ reservation
          try {
            await fetchSeatsDataWithReservation(
              data.reservationId,
              data.selectedSeats
            );
            console.log(
              "Đã khôi phục thành công ghế đã chọn từ reservation cũ"
            );
          } catch (error) {
            console.error("Lỗi khi khôi phục ghế:", error);
            fetchSeatsData(); // Tải lại nếu gặp lỗi
          }

          return;
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra trạng thái:", error);
    }
  };

  // Thêm hàm mới để fetch dữ liệu ghế khi giữ nguyên reservation
  const fetchSeatsDataWhileKeepingReservation = async (
    reservationId: string
  ) => {
    try {
      setIsLoading(true);
      // Lấy tất cả ghế trong phòng
      const seatsData = await getSeats({ theaterRoomId });

      // Lấy danh sách ghế còn trống cho suất chiếu này
      const availableSeatsData = await getAvailableSeats(screeningId);

      // Tạo danh sách ID ghế còn trống
      const availableSeatIds = availableSeatsData.map((seat: any) => seat.id);

      // Lấy danh sách ghế trong reservation hiện tại (đã chọn)
      // Mô phỏng thông qua state selectedSeats hiện tại
      const selectedSeatKeys = [...selectedSeats];

      // Xác định ghế nào đã được đặt và ghế nào đã chọn
      const transformedSeats = seatsData.map((seat: Omit<Seat, "status">) => {
        const uniqueSeatKey = `${seat.seat_row}-${seat.seat_number}`;
        const isSelected = selectedSeatKeys.includes(uniqueSeatKey);

        // Nếu ghế đã được chọn, đánh dấu là selected
        if (isSelected) {
          return { ...seat, status: "selected" as const };
        }
        // Ngược lại kiểm tra xem còn trống không
        return {
          ...seat,
          status: availableSeatIds.includes(seat.id)
            ? ("available" as const)
            : ("booked" as const),
        };
      });

      setSeats(transformedSeats);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi không xác định khi tải danh sách ghế";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Cải thiện hàm fetch seats data để đảm bảo nhất quán
  const fetchSeatsData = async () => {
    try {
      console.log("Bắt đầu tải danh sách ghế...");
      setIsLoading(true);

      // If coming from successful payment, clear all state first
      if (fromPaymentSuccess) {
        console.log(
          "fetchSeatsData: Payment success detected, ensuring clean state"
        );

        // Clear AsyncStorage immediately
        try {
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          console.log(
            "Successfully cleared reservation from AsyncStorage in fetchSeatsData"
          );
        } catch (err) {
          console.error("Error clearing AsyncStorage in fetchSeatsData:", err);
        }

        // Reset all states
        setSelectedSeats([]);
        setReservationInfo({ reservationId: null, expiresAt: null });
        setRemainingTime(0);
        setHasModifiedSelection(false);
        setIsBackFromCheckout(false);
        setIsBackFromCheckoutProcessed(false);
      }

      let timeoutId: NodeJS.Timeout | null = null;

      // Thiết lập timeout chỉ khi thực sự cần
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Timeout khi tải danh sách ghế"));
        }, 15000); // 15 giây timeout
      });

      // Race giữa việc tải dữ liệu và timeout
      const fetchDataPromise = async () => {
        // Lấy tất cả ghế trong phòng
        console.log("Gọi API getSeats với theaterRoomId:", theaterRoomId);
        const seatsData = await getSeats({ theaterRoomId });
        console.log(`Nhận được ${seatsData?.length || 0} ghế từ API getSeats`);

        // Lấy danh sách ghế còn trống cho suất chiếu này
        console.log("Gọi API getAvailableSeats với screeningId:", screeningId);
        const availableSeatsData = await getAvailableSeats(screeningId);
        console.log(
          `Nhận được ${
            availableSeatsData?.length || 0
          } ghế trống từ API getAvailableSeats`
        );

        // Tạo danh sách ID ghế còn trống
        const availableSeatIds = availableSeatsData.map((seat: any) => seat.id);

        // Đảm bảo reset danh sách ghế đã chọn
        setSelectedSeats([]);

        // Xác định ghế nào đã được đặt
        const transformedSeats = seatsData.map(
          (seat: Omit<Seat, "status">) => ({
            ...seat,
            status: availableSeatIds.includes(seat.id) ? "available" : "booked",
          })
        );

        // Log seat status for debugging
        if (fromPaymentSuccess) {
          console.log("Seat status after payment:");
          const selectedCount = transformedSeats.filter(
            (s: Seat) => s.status === "selected"
          ).length;
          const bookedCount = transformedSeats.filter(
            (s: Seat) => s.status === "booked"
          ).length;
          const availableCount = transformedSeats.filter(
            (s: Seat) => s.status === "available"
          ).length;
          console.log(
            `Selected: ${selectedCount}, Booked: ${bookedCount}, Available: ${availableCount}`
          );

          // Double check for any seats incorrectly marked as selected
          if (selectedCount > 0) {
            console.warn(
              "Found seats incorrectly marked as selected after payment, fixing..."
            );
            // Fix any seats incorrectly marked as selected
            transformedSeats.forEach((seat: Seat) => {
              if (seat.status === "selected") {
                seat.status = "booked"; // Force change to booked
              }
            });
          }
        }

        console.log("Đã xử lý xong danh sách ghế, cập nhật state...");
        return { seatsData, transformedSeats };
      };

      // Thực hiện Promise.race
      const result = await Promise.race([fetchDataPromise(), timeoutPromise]);

      // Hủy timeout nếu thành công
      if (timeoutId) clearTimeout(timeoutId);

      if (result) {
        // Cập nhật state với dữ liệu đã tải
        setSeats(result.transformedSeats);
        // Reset reservation info khi load lại hoàn toàn
        setReservationInfo({ reservationId: null, expiresAt: null });
        console.log("Hoàn thành tải danh sách ghế");
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách ghế:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi không xác định khi tải danh sách ghế";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Log thông tin params khi component mount
  useEffect(() => {
    console.log("SelectSeatsScreen - Route params:", {
      screeningIdStr,
      movieId,
      movieName,
      date,
      roomName,
      time,
      cinemaName,
      theaterRoomId,
      screeningPrice,
    });

    // Thiết lập timeout cho lần tải đầu tiên nhưng chỉ hiển thị nếu isLoading vẫn true
    let seatsLoaded = false;
    const loadingTimeout = setTimeout(() => {
      if (isLoading && !seatsLoaded) {
        console.log("Timeout khi mount component, reset loading state");
        setIsLoading(false);
        Alert.alert(
          "Thông báo",
          "Không thể tải danh sách ghế. Vui lòng thử lại hoặc chọn suất chiếu khác."
        );
      }
    }, 20000); // 20 giây

    // Kiểm tra xem component đã mount lần đầu tiên chưa
    if (isFirstLoading) {
      console.log("Component mount lần đầu, tải danh sách ghế");
      // Tải danh sách ghế ngay khi component mount
      fetchSeatsData().then(() => {
        seatsLoaded = true;
      });
      setIsFirstLoading(false);
    }

    return () => {
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Add this useEffect at the top of other useEffects to ensure it runs first
  useEffect(() => {
    // This effect runs when component mounts or fromPaymentSuccess changes
    if (fromPaymentSuccess) {
      console.log("PAYMENT SUCCESS DETECTED - CLEARING ALL STATES AND CACHE");

      // Clear AsyncStorage immediately
      const clearStorage = async () => {
        try {
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          console.log(
            "Successfully removed reservation from AsyncStorage after payment"
          );
        } catch (err) {
          console.error("Error clearing AsyncStorage:", err);
        }
      };
      clearStorage();

      // Reset all states
      setSelectedSeats([]);
      setReservationInfo({ reservationId: null, expiresAt: null });
      setRemainingTime(0);
      setHasModifiedSelection(false);
      setIsBackFromCheckout(false);
      setIsBackFromCheckoutProcessed(false);

      // Force reload seats with fresh data from server
      fetchSeatsData();
    }
  }, [fromPaymentSuccess]);

  // Đảm bảo timer không chạy nếu không còn reservation hoặc vừa thanh toán xong
  useEffect(() => {
    if (fromPaymentSuccess || !reservationInfo.expiresAt) {
      setRemainingTime(0);
      return;
    }
    // ... code timer cũ ...
  }, [reservationInfo.expiresAt, fromPaymentSuccess]);

  // Cập nhật useFocusEffect để xử lý tốt hơn việc quay lại
  useFocusEffect(
    React.useCallback(() => {
      // Skip normal focus handling if payment was successful
      if (fromPaymentSuccess) {
        console.log(
          "useFocusEffect: Payment success detected, skipping normal focus handling"
        );
        return;
      }

      // Handle normal screen focus (not after payment)
      const handleScreenFocus = async () => {
        try {
          console.log("Handle screen focus: Bắt đầu xử lý khi focus màn hình");

          // Check reservation state
          await checkReservationState();

          // Reset navigation state
          setHasNavigatedAway(false);
        } catch (error) {
          console.error("Lỗi khi focus lại màn hình:", error);
          fetchSeatsData();
        }
      };

      console.log("Normal screen focus handling");
      handleScreenFocus();

      return () => {
        // When unfocusing the screen
        console.log("Screen bị unfocus, hasNavigatedAway = true");
        setHasNavigatedAway(true);

        // Kiểm tra nếu đang quay lại màn hình BookingScreen (không phải đi tiếp tới FoodDrinkScreen)
        const currentRoute = navigation.getState().routes;
        const isNavigatingBack =
          currentRoute.length > 0 &&
          (currentRoute[currentRoute.length - 1].name === "Booking" ||
            currentRoute[currentRoute.length - 1].name !== "FoodDrinkScreen");

        if (isNavigatingBack && reservationInfo.reservationId) {
          // Hủy reservation khi quay lại màn hình Booking
          console.log("Đang quay lại màn hình Booking, hủy reservation");
          (async () => {
            try {
              // Lưu ID vào biến local trước khi xóa state
              const reservationId = reservationInfo.reservationId;

              // Reset state reservation và selected seats trước
              setReservationInfo({ reservationId: null, expiresAt: null });
              setSelectedSeats([]);

              // Xóa dữ liệu reservation khỏi AsyncStorage
              await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

              if (reservationId) {
                // Hủy reservation
                try {
                  await cancelSeatReservations(reservationId);
                  console.log(
                    "Đã hủy reservation khi quay lại màn hình Booking:",
                    reservationId
                  );
                } catch (error) {
                  console.error("Lỗi khi hủy reservation:", error);
                }
              }
            } catch (error) {
              console.error(
                "Lỗi khi xử lý hủy reservation trong useFocusEffect:",
                error
              );
            }
          })();
        } else if (reservationInfo.reservationId) {
          // Nếu đang điều hướng đến màn hình khác (không phải quay lại), lưu trạng thái
          saveReservationState();
        }
      };
    }, [fromPaymentSuccess, navigation])
  );

  // Cải thiện hàm khôi phục dữ liệu từ AsyncStorage
  const restoreFromAsyncStorage = async () => {
    if (fromPaymentSuccess) return false;
    try {
      console.log("Bắt đầu khôi phục dữ liệu từ AsyncStorage");
      const storedData = await AsyncStorage.getItem(RESERVATION_STORAGE_KEY);

      if (!storedData) {
        console.log("Không tìm thấy dữ liệu reservation trong AsyncStorage");
        return false;
      }

      console.log("Đã tìm thấy dữ liệu trong AsyncStorage");
      const data = JSON.parse(storedData);
      console.log("Dữ liệu reservation:", data);

      // Kiểm tra tính hợp lệ của dữ liệu
      if (!data.reservationId || !data.expiresAt) {
        console.log(
          "Dữ liệu reservation không hợp lệ, thiếu thông tin cần thiết"
        );
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        return false;
      }

      // Kiểm tra thời gian hết hạn
      const expiryTime = new Date(data.expiresAt).getTime();
      const now = new Date().getTime();
      const remainingMs = expiryTime - now;

      if (remainingMs <= 0) {
        console.log("Reservation đã hết hạn, không thể khôi phục");

        // Hủy reservation nếu còn tồn tại
        try {
          await cancelSeatReservations(data.reservationId);
          console.log("Đã hủy reservation hết hạn:", data.reservationId);
        } catch (error: any) {
          console.error("Lỗi khi hủy reservation hết hạn:", error);
        }

        // Xóa dữ liệu và reset state
        await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
        setReservationInfo({ reservationId: null, expiresAt: null });
        setSelectedSeats([]);

        // Tải lại danh sách ghế
        fetchSeatsData();
        return false;
      }

      // Kiểm tra trạng thái navigation
      const isFromCheckout =
        data.navigationState === "in_checkout" ||
        data.navigationState === "navigating_to_checkout";

      console.log(
        "Trạng thái navigation:",
        data.navigationState,
        "isFromCheckout:",
        isFromCheckout
      );

      // Lưu thông tin reservation vào state
      setReservationInfo({
        reservationId: data.reservationId,
        expiresAt: data.expiresAt,
      });

      // Khôi phục danh sách ghế đã chọn
      if (
        data.selectedSeats &&
        Array.isArray(data.selectedSeats) &&
        data.selectedSeats.length > 0
      ) {
        try {
          // Tải lại dữ liệu với reservation đã lưu
          console.log(
            "Khôi phục danh sách ghế với",
            data.selectedSeats.length,
            "ghế đã chọn"
          );
          await fetchSeatsDataWithReservation(
            data.reservationId,
            data.selectedSeats
          );

          // Đánh dấu đã quay lại từ checkout nếu đúng trạng thái
          if (isFromCheckout) {
            setIsBackFromCheckout(true);
            console.log("Đánh dấu đã quay lại từ checkout");
          }

          // Cập nhật trạng thái mới vào AsyncStorage
          const updatedData = {
            ...data,
            navigationState: isFromCheckout
              ? "restored_from_checkout"
              : "restored",
            timestamp: new Date().toISOString(),
            movieId: movieId, // Thêm movieId để đảm bảo đủ thông tin khi navigate
          };

          await AsyncStorage.setItem(
            RESERVATION_STORAGE_KEY,
            JSON.stringify(updatedData)
          );
          console.log(
            "Đã cập nhật trạng thái mới sau khi khôi phục:",
            updatedData.navigationState
          );

          return true;
        } catch (error) {
          console.error("Lỗi khi khôi phục ghế đã chọn:", error);
          // Nếu có lỗi, thử tải lại danh sách ghế
          fetchSeatsData();
          return false;
        }
      } else {
        console.warn(
          "Không tìm thấy thông tin ghế đã chọn trong dữ liệu lưu trữ"
        );
        fetchSeatsData();
        return false;
      }
    } catch (error: any) {
      console.error("Lỗi khi khôi phục dữ liệu từ AsyncStorage:", error);
      return false;
    }
  };

  // Group and sort seats
  const groupedSeats = useMemo(() => {
    // First, group seats by row
    const grouped = seats.reduce((acc, seat) => {
      if (!acc[seat.seat_row]) {
        acc[seat.seat_row] = [];
      }
      acc[seat.seat_row].push(seat);
      return acc;
    }, {} as Record<string, Seat[]>);

    // Sort seats within each row by seat number
    Object.keys(grouped).forEach((row) => {
      grouped[row].sort((a, b) => a.seat_number - b.seat_number);
    });

    // Sort rows alphabetically
    const sortedRows = Object.keys(grouped).sort();
    const sortedGroupedSeats: Record<string, Seat[]> = {};
    sortedRows.forEach((row) => {
      sortedGroupedSeats[row] = grouped[row];
    });

    return sortedGroupedSeats;
  }, [seats]);

  // Xử lý khi người dùng chọn ghế
  const handleSeatSelect = async (seat: Seat) => {
    if (seat.status === "booked") {
      Alert.alert("Thông báo", "Ghế này đã được đặt.");
      return;
    }

    const uniqueSeatKey = `${seat.seat_row}-${seat.seat_number}`;
    const isSeatSelected = selectedSeats.includes(uniqueSeatKey);

    console.log(
      `Xử lý ghế ${uniqueSeatKey}, trạng thái hiện tại: ${
        isSeatSelected ? "đã chọn" : "chưa chọn"
      }`
    );

    // Nếu đã có reservation trước đó (đã từng đi tới checkout)
    if (reservationInfo.reservationId) {
      if (isSeatSelected) {
        // Nếu click vào ghế đã chọn, đơn giản là bỏ chọn nó, không cần hủy reservation
        console.log(`Bỏ chọn ghế ${uniqueSeatKey} từ danh sách đã chọn`);
        setSelectedSeats(selectedSeats.filter((id) => id !== uniqueSeatKey));

        // Cập nhật trạng thái trong danh sách ghế
        const updatedSeats = [...seats];
        const seatIndex = updatedSeats.findIndex((s) => s.id === seat.id);
        if (seatIndex !== -1) {
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "available",
          };
          setSeats(updatedSeats);
        }
      } else {
        // Nếu click vào ghế chưa chọn, thêm nó vào selection hiện tại
        console.log(`Thêm ghế ${uniqueSeatKey} vào danh sách đã chọn`);
        setSelectedSeats([...selectedSeats, uniqueSeatKey]);

        // Cập nhật trạng thái trong danh sách ghế
        const updatedSeats = [...seats];
        const seatIndex = updatedSeats.findIndex((s) => s.id === seat.id);
        if (seatIndex !== -1) {
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "selected",
          };
          setSeats(updatedSeats);
        }
      }

      // Đánh dấu rằng người dùng đã thay đổi selection
      setHasModifiedSelection(true);
    } else {
      // Xử lý thông thường khi không có reservation trước đó
      if (isSeatSelected) {
        // Bỏ chọn ghế
        console.log(`Bỏ chọn ghế ${uniqueSeatKey}`);
        setSelectedSeats(selectedSeats.filter((id) => id !== uniqueSeatKey));

        // Cập nhật trạng thái trong danh sách ghế
        const updatedSeats = [...seats];
        const seatIndex = updatedSeats.findIndex((s) => s.id === seat.id);
        if (seatIndex !== -1) {
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "available",
          };
          setSeats(updatedSeats);
        }
      } else {
        // Chọn ghế mới
        console.log(`Chọn mới ghế ${uniqueSeatKey}`);
        setSelectedSeats([...selectedSeats, uniqueSeatKey]);

        // Cập nhật trạng thái trong danh sách ghế
        const updatedSeats = [...seats];
        const seatIndex = updatedSeats.findIndex((s) => s.id === seat.id);
        if (seatIndex !== -1) {
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "selected",
          };
          setSeats(updatedSeats);
        }
      }
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    // If no seats are selected, return 0
    if (selectedSeats.length === 0) {
      return 0;
    }

    const selectedSeatsDetails = seats.filter((seat) =>
      selectedSeats.includes(`${seat.seat_row}-${seat.seat_number}`)
    );

    // Safely parse price, removing any non-numeric characters and converting to number
    const seatsPrice = selectedSeatsDetails.reduce((total, seat) => {
      // Remove any non-digit characters except decimal point and parse as float
      const cleanPrice = seat.price.replace(/[^\d.]/g, "");
      return total + Math.round(parseFloat(cleanPrice));
    }, 0);

    // Safely parse screening price
    const cleanScreeningPrice =
      screeningPrice?.toString().replace(/[^\d.]/g, "") || "0";
    const parsedScreeningPrice = Math.round(parseFloat(cleanScreeningPrice));

    // Add screening price to seat prices
    const totalPrice = seatsPrice + parsedScreeningPrice;

    return totalPrice;
  };

  const totalPrice = calculateTotalPrice();

  const getSelectedSeatsText = () => {
    if (selectedSeats.length === 0) return "Chưa chọn ghế";

    return selectedSeats
      .sort((a, b) => {
        const [aRow, aNum] = a.split("-");
        const [bRow, bNum] = b.split("-");

        if (aRow === bRow) {
          return parseInt(aNum) - parseInt(bNum);
        }
        return aRow.localeCompare(bRow);
      })
      .map((seat) => {
        const [row, num] = seat.split("-");
        return `${row}${num}`;
      })
      .join(", ");
  };

  // Hàm cải thiện để xử lý việc hủy đặt chỗ trước đó
  const clearPreviousReservation = async () => {
    try {
      const storedData = await AsyncStorage.getItem(RESERVATION_STORAGE_KEY);

      if (storedData) {
        const data = JSON.parse(storedData);
        console.log("clearPreviousReservation: Tìm thấy reservation cũ:", data);

        // Kiểm tra tính hợp lệ của dữ liệu
        if (!data.reservationId) {
          console.log(
            "Dữ liệu reservation không hợp lệ, không có reservationId"
          );
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          return;
        }

        // Kiểm tra thời gian còn lại
        if (data.expiresAt) {
          const expiryTime = new Date(data.expiresAt).getTime();
          const now = new Date().getTime();
          const remainingMs = expiryTime - now;

          if (remainingMs <= 0) {
            console.log("Reservation đã hết hạn, tiến hành xóa");
            try {
              await cancelSeatReservations(data.reservationId);
              console.log("Đã hủy reservation hết hạn:", data.reservationId);
            } catch (cancelError: any) {
              console.error("Lỗi khi hủy reservation hết hạn:", cancelError);
            }
            await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
            return;
          }
        }

        // Hủy đặt chỗ trước đó
        try {
          console.log("Tiến hành hủy reservation:", data.reservationId);
          const result = await cancelSeatReservations(data.reservationId);
          console.log("Kết quả hủy reservation:", result);

          // Xóa dữ liệu lưu trữ
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

          // Reset state liên quan
          setSelectedSeats([]);
          setReservationInfo({ reservationId: null, expiresAt: null });

          console.log("Đã xóa thông tin reservation khỏi AsyncStorage");
          return true;
        } catch (error: any) {
          console.error("Lỗi khi hủy reservation:", error);

          // Nếu lỗi do không tìm thấy reservation, vẫn xóa dữ liệu lưu trữ
          if (error.message && error.message.includes("not found")) {
            await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
            console.log(
              "Reservation không tồn tại trên server, đã xóa dữ liệu local"
            );
            return true;
          }

          // Các lỗi khác
          return false;
        }
      } else {
        console.log("Không tìm thấy reservation cũ trong AsyncStorage");
        return true; // Không có reservation cũ
      }
    } catch (error: any) {
      console.error("Lỗi khi kiểm tra/xóa reservation cũ:", error);
      return false;
    }
  };

  // Xử lý việc đặt chỗ và chuyển tới màn hình thanh toán
  const handleReserveSeats = async () => {
    try {
      if (selectedSeats.length === 0) {
        Alert.alert("Thông báo", "Vui lòng chọn ít nhất một ghế!");
        return;
      }

      // Nếu đã có reservation và đã thay đổi selection, hiển thị thông báo xác nhận
      if (reservationInfo.reservationId && hasModifiedSelection) {
        Alert.alert(
          "Xác nhận thay đổi ghế",
          "Bạn đã thay đổi lựa chọn ghế. Hệ thống sẽ cập nhật lại và đặt lại ghế với lựa chọn mới. Tiếp tục?",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Tiếp tục",
              onPress: () => proceedWithReservation(),
            },
          ]
        );
        return;
      }

      // Nếu không cần xác nhận, tiến hành đặt chỗ
      await proceedWithReservation();
    } catch (error: any) {
      // Xử lý lỗi
      console.error("Lỗi khi khởi tạo đặt chỗ:", error);
      Alert.alert(
        "Lỗi",
        "Đã xảy ra lỗi khi chuẩn bị đặt chỗ. Vui lòng thử lại!"
      );
    }
  };

  // Hàm thực thi đặt chỗ sau khi đã xác nhận
  const proceedWithReservation = async () => {
    try {
      // Hiển thị loading
      setReservationInProgress(true);

      // Lấy danh sách ID ghế đã chọn
      const selectedSeatIds: number[] = [];

      // Duyệt qua từng ghế đã chọn để lấy ID
      for (const seatKey of selectedSeats) {
        const [row, numStr] = seatKey.split("-");
        if (!row || !numStr) continue;

        const seatNum = parseInt(numStr, 10);
        if (isNaN(seatNum)) continue;

        // Tìm ghế trong danh sách
        const seat = seats.find(
          (s) => s.seat_row === row && s.seat_number === seatNum
        );

        if (seat && seat.id > 0) {
          selectedSeatIds.push(seat.id);
        }
      }

      console.log("Tiến hành đặt chỗ với các ghế:", selectedSeatIds);

      // Kiểm tra xem có đủ ID ghế không
      if (selectedSeatIds.length === 0) {
        Alert.alert("Lỗi", "Không thể xác định ID của ghế đã chọn!");
        setReservationInProgress(false);
        return;
      }

      // Lưu thông tin countdown timer hiện tại (nếu có) để sau này khôi phục
      const currentTimerState = {
        reservationId: reservationInfo.reservationId,
        expiresAt: reservationInfo.expiresAt,
      };

      // Lấy thông tin user_id từ context
      let userId = user?.id || 1; // Fallback to 1 for testing

      if (typeof userId !== "number") {
        userId = parseInt(userId, 10); // Convert to number if it's a string
        if (isNaN(userId)) userId = 1; // Fallback if parsing fails
      }

      // Kiểm tra nếu đã có reservation (đã thêm/bớt ghế) thì hủy cái cũ trước
      if (reservationInfo.reservationId) {
        try {
          console.log(
            "Hủy reservation cũ để tạo mới:",
            reservationInfo.reservationId
          );
          await cancelSeatReservations(reservationInfo.reservationId);
          console.log("Đã hủy reservation cũ thành công");
        } catch (error) {
          console.error("Lỗi khi hủy reservation cũ:", error);
          // Tiếp tục xử lý bình thường ngay cả khi hủy thất bại
        }
      }

      // Gửi request đặt chỗ
      const result = await reserveSeatsWithSuggestions(
        screeningId,
        selectedSeatIds,
        userId
      );

      // Kiểm tra kết quả
      if (!result.success) {
        // Khôi phục timer state nếu có lỗi (giữ timer cũ)
        if (currentTimerState.reservationId && currentTimerState.expiresAt) {
          setReservationInfo(currentTimerState);
        }

        // Xử lý trường hợp thất bại
        if (result.alternativeSuggestions) {
          // Hiển thị modal gợi ý các ghế thay thế
          setSuggestedSeats(result.alternativeSuggestions.seats || []);
          setSuggestedGroups(result.alternativeSuggestions.pairs || []);
          setShowSuggestionModal(true);
          setReservationInProgress(false);
          return;
        } else {
          throw new Error(result.message || "Có lỗi xảy ra khi đặt chỗ");
        }
      }

      // Xử lý trường hợp thành công
      if (result.reservationId && result.expiresAt) {
        // Lưu thông tin reservation vào state
        setReservationInfo({
          reservationId: result.reservationId,
          expiresAt: result.expiresAt,
        });

        // Reset flag thay đổi selection
        setHasModifiedSelection(false);

        // Lưu trạng thái reservation vào AsyncStorage
        await AsyncStorage.setItem(
          RESERVATION_STORAGE_KEY,
          JSON.stringify({
            reservationId: result.reservationId,
            expiresAt: result.expiresAt,
            selectedSeats: selectedSeatIds,
            screeningId: screeningId,
            movieId: movieId,
            navigationState: "navigating_to_checkout",
            timestamp: new Date().toISOString(),
            isTemporary: true, // Đánh dấu đây là reservation tạm thời
          })
        );

        console.log(
          "Đặt chỗ thành công với reservation ID:",
          result.reservationId
        );

        // Tính tổng tiền vé
        const totalPrice = calculateTotalPrice();
        const selectedSeatsText = getSelectedSeatsText();

        // Đánh dấu đã thoát khỏi màn hình
        setHasNavigatedAway(true);

        // Chuyển tới màn hình đồ ăn thay vì checkout
        navigation.navigate("FoodDrinkScreen", {
          movieTitle: movieName,
          ticketCount: selectedSeats.length,
          date: date,
          time: time,
          price: totalPrice,
          screeningId: screeningId,
          seatIds: selectedSeatIds,
          selectedSeatsText: selectedSeatsText,
          cinemaName: cinemaName,
          reservationId: result.reservationId,
          expiresAt: result.expiresAt,
          movieId: movieId,
        });
      } else {
        throw new Error("Không nhận được thông tin đặt chỗ từ máy chủ");
      }
    } catch (error: any) {
      // Xử lý lỗi
      console.error("Lỗi khi đặt chỗ:", error);
      Alert.alert(
        "Lỗi",
        error.message ||
          "Đã xảy ra lỗi trong quá trình đặt chỗ. Vui lòng thử lại!"
      );
    } finally {
      setReservationInProgress(false);
    }
  };

  const handleSelectSuggestedSeats = async (
    suggestedSeats: SeatSuggestion[]
  ) => {
    try {
      setShowSuggestionModal(false);
      setReservationInProgress(true);

      // Lấy danh sách ID ghế đã chọn từ gợi ý
      const selectedSeatIds = suggestedSeats.map((seat) => seat.id);

      // Lấy user ID
      const userId = user?.id || 1;

      // Gửi request đặt chỗ với các ghế được đề xuất
      const result = await reserveSeatsWithSuggestions(
        screeningId,
        selectedSeatIds,
        userId
      );

      // Xử lý kết quả
      if (result.success && result.reservationId && result.expiresAt) {
        setReservationInfo({
          reservationId: result.reservationId,
          expiresAt: result.expiresAt,
        });

        // Tải lại danh sách ghế với ghế đã chọn
        await fetchSeatsDataWithReservation(
          result.reservationId,
          selectedSeatIds
        );

        // Lưu trạng thái
        await AsyncStorage.setItem(
          RESERVATION_STORAGE_KEY,
          JSON.stringify({
            reservationId: result.reservationId,
            expiresAt: result.expiresAt,
            selectedSeats: selectedSeatIds,
            screeningId: screeningId,
            movieId: movieId,
            navigationState: "navigating_to_checkout",
            timestamp: new Date().toISOString(),
            isTemporary: true,
          })
        );

        // Tính tổng giá
        const calculatePriceForSeats = (seats: SeatSuggestion[]) => {
          return seats.reduce((total, seat) => {
            // Giả sử giá vé dựa trên loại ghế, có thể điều chỉnh tùy theo logic thực tế
            let price = screeningPrice;
            if (seat.seat_type === "vip") price *= 1.5;
            if (seat.seat_type === "deluxe") price *= 2;
            return total + price;
          }, 0);
        };

        const totalPrice = calculatePriceForSeats(suggestedSeats);
        const seatText = suggestedSeats
          .map((seat) => `${seat.seat_row}${seat.seat_number}`)
          .join(", ");

        // Chuyển hướng đến màn hình thanh toán
        navigation.navigate("CheckoutScreen", {
          movieTitle: movieName,
          ticketCount: suggestedSeats.length,
          date: date,
          time: time,
          price: totalPrice,
          screeningId: screeningId,
          seatIds: selectedSeatIds,
          selectedSeatsText: seatText,
          cinemaName: cinemaName,
          reservationId: result.reservationId,
          expiresAt: result.expiresAt,
          movieId: movieId,
        });
      } else {
        throw new Error(result.message || "Có lỗi xảy ra khi đặt chỗ");
      }
    } catch (error: any) {
      console.error("Lỗi khi đặt chỗ được đề xuất:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Có lỗi xảy ra khi đặt chỗ. Vui lòng thử lại!"
      );
    } finally {
      setReservationInProgress(false);
    }
  };

  // Cải thiện hàm xử lý danh sách ghế đã chọn khi quay lại từ checkout
  const fetchSeatsDataWithReservation = async (
    reservationId: string,
    selectedSeatIds: number[] = []
  ) => {
    // If coming from successful payment, use fetchSeatsData instead
    if (fromPaymentSuccess) {
      console.log(
        "Payment success detected in fetchSeatsDataWithReservation, using fetchSeatsData instead"
      );
      await fetchSeatsData();
      return true;
    }

    try {
      setIsLoading(true);

      console.log(
        `Đang tải dữ liệu ghế với ${selectedSeatIds.length} ghế đã chọn:`,
        selectedSeatIds
      );

      // Lấy tất cả ghế trong phòng
      const seatsData = await getSeats({ theaterRoomId });
      console.log(`Nhận được ${seatsData.length} ghế từ API getSeats`);

      // Lấy danh sách ghế còn trống cho suất chiếu này
      const availableSeatsData = await getAvailableSeats(screeningId);
      console.log(
        `Nhận được ${availableSeatsData.length} ghế trống từ API getAvailableSeats`
      );

      // Tạo Set của ID ghế còn trống để tìm kiếm nhanh hơn
      const availableSeatIds = new Set(
        availableSeatsData.map((seat: any) => seat.id)
      );

      // Tạo Set của các ID ghế đã chọn để tìm kiếm nhanh hơn
      const selectedSeatIdsSet = new Set(selectedSeatIds);

      // Mảng lưu các key của ghế đã chọn (ví dụ: "A-1", "A-2")
      const newSelectedSeats: string[] = [];

      // QUAN TRỌNG: Tạo bản đồ từ ID ghế sang key ghế
      const seatIdToKeyMap = new Map();

      // Tạo ánh xạ từ ID ghế sang key (seat_row-seat_number)
      seatsData.forEach((seat: any) => {
        const seatKey = `${seat.seat_row}-${seat.seat_number}`;
        seatIdToKeyMap.set(seat.id, seatKey);

        // Nếu ghế này nằm trong danh sách ghế đã chọn, thêm vào danh sách key
        if (selectedSeatIdsSet.has(seat.id)) {
          newSelectedSeats.push(seatKey);
        }
      });

      console.log(
        "Danh sách ghế đã chọn đã được chuyển thành keys:",
        newSelectedSeats
      );

      // QUAN TRỌNG: Xử lý đặc biệt cho ghế đã chọn từ AsyncStorage
      // Đôi khi API có thể trả về ghế đã chọn là đã booked, cần ghi đè
      const transformedSeats = seatsData.map((seat: any) => {
        // ALWAYS prioritize our own selections from AsyncStorage
        if (selectedSeatIdsSet.has(seat.id)) {
          console.log(
            `Đánh dấu ghế ${seat.seat_row}-${seat.seat_number} (ID: ${seat.id}) là SELECTED`
          );
          return { ...seat, status: "selected" as const };
        }

        // Các ghế khác được đánh dấu dựa trên dữ liệu từ API
        const status = availableSeatIds.has(seat.id)
          ? ("available" as const)
          : ("booked" as const);

        return { ...seat, status };
      });

      // Debug: Đếm số ghế theo từng trạng thái
      const selectedCount = transformedSeats.filter(
        (s: Seat) => s.status === "selected"
      ).length;
      const availableCount = transformedSeats.filter(
        (s: Seat) => s.status === "available"
      ).length;
      const bookedCount = transformedSeats.filter(
        (s: Seat) => s.status === "booked"
      ).length;

      console.log("Số lượng ghế sau khi xử lý:");
      console.log(`- Selected: ${selectedCount}`);
      console.log(`- Available: ${availableCount}`);
      console.log(`- Booked: ${bookedCount}`);

      // Cập nhật state ghế và ghế đã chọn
      setSeats(transformedSeats);
      setSelectedSeats(newSelectedSeats);

      // Đánh dấu đã xử lý
      setIsBackFromCheckoutProcessed(true);

      // QUAN TRỌNG: Set flag cho ghế đã chọn
      if (newSelectedSeats.length > 0) {
        setIsBackFromCheckout(true);
      }

      return true;
    } catch (error) {
      console.error(
        "Lỗi khi tải danh sách ghế với reservation hiện tại:",
        error
      );
      Alert.alert(
        "Lỗi",
        "Không thể tải danh sách ghế đã chọn. Vui lòng thử lại."
      );

      // Nếu lỗi, tải lại danh sách ghế thông thường
      fetchSeatsData();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý timer khi có reservation
  useEffect(() => {
    // Skip timer setup if coming from successful payment
    if (fromPaymentSuccess) {
      console.log("Skipping timer setup due to payment success");
      return;
    }

    if (!reservationInfo.expiresAt) {
      console.log("No expiry time, skipping timer setup");
      return;
    }

    console.log(
      "Khởi tạo timer với thời gian hết hạn:",
      reservationInfo.expiresAt
    );

    const calculateRemainingTime = () => {
      const expiry = new Date(reservationInfo.expiresAt!).getTime();
      const now = new Date().getTime();
      const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000));
      console.log(
        `Thời gian còn lại: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
          .toString()
          .padStart(2, "0")}`
      );
      return timeLeft;
    };

    setRemainingTime(calculateRemainingTime());

    const timer = setInterval(() => {
      const timeLeft = calculateRemainingTime();
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        // Hết thời gian, cần load lại danh sách ghế
        console.log("Timer đã hết, reset trạng thái và tải lại dữ liệu ghế");
        fetchSeatsData();
        setReservationInfo({ reservationId: null, expiresAt: null });
        setSelectedSeats([]);
        clearInterval(timer);

        // Xóa dữ liệu đã lưu và hiển thị thông báo
        AsyncStorage.removeItem(RESERVATION_STORAGE_KEY)
          .then(() => {
            Alert.alert(
              "Thời gian giữ ghế đã hết",
              "Ghế của bạn đã được giải phóng do quá thời gian. Vui lòng chọn lại ghế."
            );
          })
          .catch((error) =>
            console.error("Lỗi khi xóa dữ liệu lưu trữ:", error)
          );
      }
    }, 1000);

    // Đảm bảo clear timer khi component unmount hoặc khi expiresAt thay đổi
    return () => {
      console.log("Hủy timer hiện tại do unmount hoặc expiresAt thay đổi");
      clearInterval(timer);
    };
  }, [reservationInfo.expiresAt, fromPaymentSuccess]);

  // Khi component unmount hoàn toàn
  useEffect(() => {
    return () => {
      console.log("Component unmount hoàn toàn");

      // Lưu trạng thái khi thoát hẳn ứng dụng
      if (reservationInfo.reservationId) {
        saveReservationState();
      }
    };
  }, [reservationInfo.reservationId]);

  // Thêm hàm để kiểm tra và log trạng thái ghế
  const logSeatStatus = () => {
    console.log("-------------------------");
    console.log("Kiểm tra trạng thái ghế:");
    console.log("Tổng số ghế:", seats.length);

    const selectedCount = seats.filter(
      (seat) => seat.status === "selected"
    ).length;
    const bookedCount = seats.filter((seat) => seat.status === "booked").length;
    const availableCount = seats.filter(
      (seat) => seat.status === "available"
    ).length;

    console.log("Số ghế đã chọn (selected):", selectedCount);
    console.log("Số ghế đã đặt (booked):", bookedCount);
    console.log("Số ghế còn trống (available):", availableCount);

    if (selectedSeats.length !== selectedCount) {
      console.warn(
        "CẢNH BÁO: Số ghế trong selectedSeats không khớp với số ghế có status=selected!"
      );
      console.log("selectedSeats:", selectedSeats);
      console.log(
        "Ghế có status=selected:",
        seats
          .filter((seat) => seat.status === "selected")
          .map((seat) => `${seat.seat_row}-${seat.seat_number}`)
      );
    }

    if (reservationInfo.reservationId) {
      console.log("Có reservation:", reservationInfo.reservationId);
      if (reservationInfo.expiresAt) {
        const expiry = new Date(reservationInfo.expiresAt).getTime();
        const now = new Date().getTime();
        console.log(
          "Thời gian còn lại:",
          Math.floor((expiry - now) / 1000),
          "giây"
        );
      }
    } else {
      console.log("Không có reservation");
    }
    console.log("-------------------------");
  };

  // Thêm hàm để đồng bộ trạng thái ghế sau khi tải
  const verifySeatSelections = () => {
    // Không làm gì nếu đang loading hoặc không có dữ liệu
    if (isLoading || seats.length === 0) return;

    // Nhận biết sự không nhất quán giữa selectedSeats và trạng thái ghế
    let hasDiscrepancies = false;

    // Clone lại mảng ghế để có thể sửa
    const updatedSeats = [...seats];

    // Kiểm tra từng ghế đã chọn
    selectedSeats.forEach((seatKey) => {
      const [row, numStr] = seatKey.split("-");
      const seatNum = parseInt(numStr, 10);

      // Tìm ghế trong danh sách
      const seatIndex = updatedSeats.findIndex(
        (seat) => seat.seat_row === row && seat.seat_number === seatNum
      );

      if (seatIndex !== -1) {
        // Ghế này đã được chọn, nhưng status có thể không đúng
        if (updatedSeats[seatIndex].status !== "selected") {
          console.warn(
            `Sửa ghế ${seatKey}: từ status=${updatedSeats[seatIndex].status} thành status=selected`
          );
          // Sửa trạng thái
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "selected",
          };
          hasDiscrepancies = true;
        }
      }
    });

    // Ngược lại, kiểm tra các ghế có status="selected" nhưng không có trong selectedSeats
    updatedSeats.forEach((seat, index) => {
      const seatKey = `${seat.seat_row}-${seat.seat_number}`;
      if (seat.status === "selected" && !selectedSeats.includes(seatKey)) {
        console.warn(
          `Ghế ${seatKey} có status=selected nhưng không có trong selectedSeats`
        );
        // Quyết định giữ ghế này là đã chọn và thêm vào selectedSeats
        if (!selectedSeats.includes(seatKey)) {
          hasDiscrepancies = true;
          selectedSeats.push(seatKey);
        }
      }
    });

    // Cập nhật lại state nếu cần
    if (hasDiscrepancies) {
      console.log("Đã sửa các sự không nhất quán trong trạng thái ghế");
      setSeats(updatedSeats);
    }
  };

  // Gọi hàm kiểm tra sau khi seats và selectedSeats thay đổi
  useEffect(() => {
    verifySeatSelections();
  }, [seats, selectedSeats]);

  // Thêm useEffect để đảm bảo ghế đã chọn luôn hiển thị đúng
  useEffect(() => {
    // Skip if no seats or during loading
    if (seats.length === 0 || isLoading) return;

    // Đảm bảo status "selected" cho các ghế đã chọn
    if (selectedSeats.length > 0) {
      let needsUpdate = false;
      const updatedSeats = [...seats];

      // Check và cập nhật status của ghế đã chọn
      selectedSeats.forEach((seatKey) => {
        const [row, numStr] = seatKey.split("-");
        const num = parseInt(numStr, 10);

        const seatIndex = updatedSeats.findIndex(
          (s) => s.seat_row === row && s.seat_number === num
        );

        if (seatIndex !== -1 && updatedSeats[seatIndex].status !== "selected") {
          console.log(
            `Cập nhật ghế ${seatKey} từ ${updatedSeats[seatIndex].status} thành selected`
          );
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: "selected",
          };
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        console.log("Đã cập nhật trạng thái các ghế đã chọn");
        setSeats(updatedSeats);
      }
    }
  }, [seats, selectedSeats, isLoading]);

  // Add a new useEffect that runs immediately when component mounts
  useEffect(() => {
    // Check for payment success flag in AsyncStorage
    const checkPaymentSuccess = async () => {
      try {
        // Check if payment was just completed
        const paymentCompleted = await AsyncStorage.getItem(
          "payment_completed"
        );
        const paymentSuccessTimestamp = await AsyncStorage.getItem(
          "payment_success_timestamp"
        );

        if (paymentCompleted === "true" || paymentSuccessTimestamp) {
          console.log(
            "PAYMENT SUCCESS DETECTED ON MOUNT - FORCING IMMEDIATE RELOAD"
          );

          // Clear payment flags
          await AsyncStorage.removeItem("payment_completed");
          await AsyncStorage.removeItem("payment_success_timestamp");

          // Clear reservation data
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

          // Reset all states
          setSelectedSeats([]);
          setReservationInfo({ reservationId: null, expiresAt: null });
          setRemainingTime(0);
          setHasModifiedSelection(false);
          setIsBackFromCheckout(false);
          setIsBackFromCheckoutProcessed(false);

          // Force reload seats with fresh data from server
          await fetchSeatsData();

          console.log("IMMEDIATE RELOAD COMPLETED AFTER PAYMENT");
        }
      } catch (err) {
        console.error("Error checking payment success:", err);
      }
    };

    checkPaymentSuccess();
  }, []);

  // Add a new useEffect that runs when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Force immediate check for payment success and reload
      const forceReloadAfterPayment = async () => {
        console.log("FORCE CHECKING PAYMENT SUCCESS STATUS ON FOCUS");

        try {
          // Check payment flags in AsyncStorage
          const paymentCompleted = await AsyncStorage.getItem(
            "payment_completed"
          );
          const paymentSuccessTimestamp = await AsyncStorage.getItem(
            "payment_success_timestamp"
          );

          if (
            paymentCompleted === "true" ||
            paymentSuccessTimestamp ||
            fromPaymentSuccess
          ) {
            console.log(
              "PAYMENT SUCCESS DETECTED - FORCING IMMEDIATE DATA RELOAD"
            );

            // Clear all payment flags
            await AsyncStorage.removeItem("payment_completed");
            await AsyncStorage.removeItem("payment_success_timestamp");
            await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

            // Reset all states completely
            setSelectedSeats([]);
            setReservationInfo({ reservationId: null, expiresAt: null });
            setRemainingTime(0);
            setHasModifiedSelection(false);
            setIsBackFromCheckout(false);
            setIsBackFromCheckoutProcessed(false);

            // Force immediate data reload from server
            setIsLoading(true);

            try {
              // Get fresh seat data from server
              const seatsData = await getSeats({ theaterRoomId });
              const availableSeatsData = await getAvailableSeats(screeningId);
              const availableSeatIds = availableSeatsData.map(
                (seat: any) => seat.id
              );

              // Transform seats with correct status
              const transformedSeats = seatsData.map(
                (seat: Omit<Seat, "status">) => ({
                  ...seat,
                  status: availableSeatIds.includes(seat.id)
                    ? "available"
                    : "booked",
                })
              );

              // Update state with fresh data
              setSeats(transformedSeats);
              console.log("SEAT DATA SUCCESSFULLY RELOADED AFTER PAYMENT");

              // Log seat counts for debugging
              const selectedCount = transformedSeats.filter(
                (s: Seat) => s.status === "selected"
              ).length;
              const bookedCount = transformedSeats.filter(
                (s: Seat) => s.status === "booked"
              ).length;
              const availableCount = transformedSeats.filter(
                (s: Seat) => s.status === "available"
              ).length;
              console.log(
                `After reload - Selected: ${selectedCount}, Booked: ${bookedCount}, Available: ${availableCount}`
              );
            } catch (error) {
              console.error("Error reloading seat data:", error);
              // Fallback to standard fetch
              fetchSeatsData();
            } finally {
              setIsLoading(false);
            }
          }
        } catch (err) {
          console.error("Error in force reload:", err);
        }
      };

      // Run the force reload check immediately when screen is focused
      forceReloadAfterPayment();

      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Add a function to directly fix any incorrectly marked seats
  const fixSeatStatusAfterPayment = () => {
    if (!fromPaymentSuccess) return;

    console.log("APPLYING DIRECT FIX TO SEAT STATUS AFTER PAYMENT");

    // Create a copy of the current seats array
    const updatedSeats = [...seats];
    let fixedCount = 0;

    // Check each seat and fix any that are incorrectly marked as "selected"
    updatedSeats.forEach((seat: Seat) => {
      if (seat.status === "selected") {
        seat.status = "booked"; // Force change to booked
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      console.log(
        `Fixed ${fixedCount} seats that were incorrectly marked as selected`
      );
      // Update the seats state with the fixed data
      setSeats(updatedSeats);
      // Clear selected seats array
      setSelectedSeats([]);
    }
  };

  // Call the fix function whenever seats or fromPaymentSuccess changes
  useEffect(() => {
    fixSeatStatusAfterPayment();
  }, [seats, fromPaymentSuccess]);

  // Add a special check specifically for seat B1 that was mentioned by the user
  useEffect(() => {
    if (fromPaymentSuccess && seats.length > 0) {
      console.log("Special check for seat B1 after payment");

      // Find seat B1
      const seatB1 = seats.find(
        (seat) => seat.seat_row === "B" && seat.seat_number === 1
      );

      if (seatB1) {
        console.log(`Found seat B1 with status: ${seatB1.status}`);

        // If B1 is incorrectly marked as selected, fix it
        if (seatB1.status === "selected") {
          console.log("Fixing seat B1 status from selected to booked");

          // Create a copy of the seats array
          const updatedSeats = [...seats];

          // Find and update B1 status
          const b1Index = updatedSeats.findIndex(
            (seat) => seat.seat_row === "B" && seat.seat_number === 1
          );

          if (b1Index !== -1) {
            updatedSeats[b1Index].status = "booked";
            setSeats(updatedSeats);
            console.log("Seat B1 status fixed to booked");
          }
        }
      }
    }
  }, [fromPaymentSuccess, seats]);

  // Force reload when component mounts if payment was successful
  useEffect(() => {
    if (fromPaymentSuccess) {
      console.log(
        "COMPONENT MOUNT WITH PAYMENT SUCCESS FLAG - FORCING IMMEDIATE RELOAD"
      );

      // Force immediate data reload
      const immediateReload = async () => {
        try {
          setIsLoading(true);

          // Clear all AsyncStorage data related to reservations
          await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);
          await AsyncStorage.removeItem("payment_completed");
          await AsyncStorage.removeItem("payment_success_timestamp");

          // Reset all states
          setSelectedSeats([]);
          setReservationInfo({ reservationId: null, expiresAt: null });
          setRemainingTime(0);

          // Get fresh data directly from server
          const seatsData = await getSeats({ theaterRoomId });
          const availableSeatsData = await getAvailableSeats(screeningId);
          const availableSeatIds = availableSeatsData.map(
            (seat: any) => seat.id
          );

          // Force all seats to have correct status
          const transformedSeats = seatsData.map(
            (seat: Omit<Seat, "status">) => ({
              ...seat,
              // Important: Ensure no seat is marked as "selected" after payment
              status: availableSeatIds.includes(seat.id)
                ? "available"
                : "booked",
            })
          );

          // Update state with fresh data
          setSeats(transformedSeats);
          console.log("IMMEDIATE RELOAD COMPLETED ON COMPONENT MOUNT");
        } catch (error) {
          console.error("Error in immediate reload:", error);
          // Fallback to standard fetch
          fetchSeatsData();
        } finally {
          setIsLoading(false);
        }
      };

      // Execute immediate reload
      immediateReload();
    }
  }, []);

  // Thêm useEffect để xử lý sự kiện nút back
  useEffect(() => {
    // Đăng ký một handler cho nút back
    const backAction = () => {
      // Nếu đang có reservation, hủy trước khi quay lại
      if (reservationInfo.reservationId) {
        Alert.alert(
          "Xác nhận",
          "Bạn có muốn quay lại màn hình chọn suất chiếu? Ghế đang chọn sẽ được giải phóng.",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Đồng ý",
              onPress: async () => {
                try {
                  // Hiển thị loading
                  setIsLoading(true);

                  // Lưu ID reservation vào biến local để tham chiếu sau khi state đã bị xóa
                  const reservationId = reservationInfo.reservationId;

                  // Reset state trước khi gọi API để ngăn hiển thị lại Alert
                  setReservationInfo({ reservationId: null, expiresAt: null });
                  setSelectedSeats([]);

                  // Xóa dữ liệu lưu trữ
                  await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

                  if (reservationId) {
                    // Hủy reservation
                    try {
                      await cancelSeatReservations(reservationId);
                      console.log(
                        "Đã hủy reservation khi nhấn nút back:",
                        reservationId
                      );
                    } catch (error) {
                      console.error("Lỗi khi hủy reservation:", error);
                      // Vẫn tiếp tục điều hướng ngay cả khi có lỗi
                    }
                  }

                  // Đặt flag chặn để tránh hiển thị Alert nhiều lần
                  // Giảm loading để có thể điều hướng
                  setIsLoading(false);

                  // Quay lại màn hình trước đó sau khi đã xử lý xong
                  navigation.goBack();
                } catch (error) {
                  console.error("Lỗi khi hủy reservation:", error);
                  // Đảm bảo reset loading state
                  setIsLoading(false);
                  // Vẫn quay lại màn hình trước đó ngay cả khi có lỗi
                  navigation.goBack();
                }
              },
            },
          ]
        );
        return true; // Ngăn chặn hành vi back mặc định
      }

      // Nếu không có reservation, cho phép back bình thường
      return false;
    };

    // Đăng ký handler với navigation
    const backHandler = navigation.addListener("beforeRemove", (e) => {
      // Ngăn chặn hành vi back mặc định nếu có reservation
      if (reservationInfo.reservationId && e.data.action.type === "GO_BACK") {
        e.preventDefault();
        backAction();
      }
    });

    return () => {
      // Hủy đăng ký handler khi component unmount
      backHandler();
    };
  }, [navigation, reservationInfo.reservationId]);

  // Thêm hàm xử lý nút back trong header
  const handleHeaderBackPress = () => {
    // Nếu đang có reservation, hủy trước khi quay lại
    if (reservationInfo.reservationId) {
      Alert.alert(
        "Xác nhận",
        "Bạn có muốn quay lại màn hình chọn suất chiếu? Ghế đang chọn sẽ được giải phóng.",
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Đồng ý",
            onPress: async () => {
              try {
                // Hiển thị loading
                setIsLoading(true);

                // Lưu reservation ID vào biến local để sử dụng sau khi state đã bị xóa
                const reservationId = reservationInfo.reservationId;

                // Xóa state reservation và selected seats trước
                setReservationInfo({ reservationId: null, expiresAt: null });
                setSelectedSeats([]);

                // Xóa dữ liệu lưu trữ
                await AsyncStorage.removeItem(RESERVATION_STORAGE_KEY);

                if (reservationId) {
                  // Hủy reservation
                  try {
                    await cancelSeatReservations(reservationId);
                    console.log(
                      "Đã hủy reservation khi nhấn nút back trong header:",
                      reservationId
                    );
                  } catch (error) {
                    console.error("Lỗi khi hủy reservation:", error);
                    // Vẫn tiếp tục điều hướng ngay cả khi có lỗi
                  }
                }

                // Tắt loading trước khi điều hướng
                setIsLoading(false);

                // Quay lại màn hình trước đó
                navigation.goBack();
              } catch (error) {
                console.error("Lỗi khi hủy reservation:", error);
                // Đảm bảo reset loading state
                setIsLoading(false);
                // Vẫn quay lại màn hình trước đó ngay cả khi có lỗi
                navigation.goBack();
              }
            },
          },
        ]
      );
    } else {
      // Nếu không có reservation, quay lại bình thường
      navigation.goBack();
    }
  };

  // Cập nhật useEffect để thiết lập header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 10 }}
          onPress={handleHeaderBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, reservationInfo.reservationId]);

  useEffect(() => {
    const cleanupPending = async () => {
      try {
        await api.post("/tickets/cleanup-pending", { screeningId });
      } catch (err) {
        console.warn("Không thể cleanup vé/ghế pending:", err);
      }
    };
    cleanupPending();
    // ... các logic khác khi mount hoặc reload seats
  }, [screeningId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#d01d27" />
        <Text style={styles.loadingText}>Đang tải danh sách ghế...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <LinearGradient
        colors={["#d01d27", "#9b0c15"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn ghế</Text>

        <View style={styles.headerRightContainer}>
          {/* Nút làm mới danh sách ghế */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              if (reservationInfo.reservationId) {
                // Nếu có reservation, hỏi người dùng có muốn hủy không
                Alert.alert(
                  "Làm mới danh sách ghế",
                  "Việc này sẽ hủy các ghế bạn đã chọn hiện tại. Bạn có chắc chắn không?",
                  [
                    {
                      text: "Hủy",
                      style: "cancel",
                    },
                    {
                      text: "Làm mới",
                      onPress: async () => {
                        // Xóa reservation hiện tại
                        await clearPreviousReservation();
                        // Tải lại danh sách ghế
                        fetchSeatsData();
                        Alert.alert("Thành công", "Đã làm mới danh sách ghế");
                      },
                    },
                  ]
                );
              } else {
                // Nếu không có reservation, làm mới trực tiếp
                fetchSeatsData();
              }
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Hiển thị timer nếu có reservation */}
          {reservationInfo.expiresAt && (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.timerText}>
                {Math.floor(remainingTime / 60)}:
                {(remainingTime % 60).toString().padStart(2, "0")}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Movie Info */}
      <LinearGradient colors={["#222", "#111"]} style={styles.infoSection}>
        <Text style={styles.movieName}>{movieName}</Text>
        <View style={styles.infoRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color="#aaa"
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            {cinemaName} | {roomName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#aaa"
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            {date} | {time}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Screen area */}
        <View style={styles.screenContainer}>
          <Text style={styles.screenText}>MÀN HÌNH</Text>
          <LinearGradient
            colors={["rgba(208,29,39,0.1)", "#d01d27", "rgba(208,29,39,0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.screenBar}
          />
        </View>

        {/* Seat map */}
        <View style={styles.seatMapContainer}>
          {Object.entries(groupedSeats).map(([row, rowSeats]) => (
            <View key={row} style={styles.seatRow}>
              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>{row}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seatRowScrollContent}
              >
                {rowSeats.map((seat) => {
                  const uniqueSeatKey = `${seat.seat_row}-${seat.seat_number}`;
                  const isSelected = selectedSeats.includes(uniqueSeatKey);

                  // Quan trọng: Ghế đã chọn luôn có độ ưu tiên cao hơn trạng thái "booked"
                  // Đảm bảo người dùng có thể nhìn thấy và bỏ chọn ghế của họ
                  const isSeatBooked = !isSelected && seat.status === "booked";

                  // Linh hoạt với các loại ghế
                  let SeatIcon = () => (
                    <FontAwesome5 name="chair" size={13} color="#fff" />
                  );
                  if (seat.seat_type === "deluxe") {
                    SeatIcon = () => (
                      <MaterialIcons
                        name="airline-seat-recline-extra"
                        size={15}
                        color="#fff"
                      />
                    );
                  }

                  // Ghi lại logs khi có sự không khớp giữa trạng thái và selection
                  if (isSelected && seat.status !== "selected") {
                    console.warn(
                      `Phát hiện ghế ${uniqueSeatKey} nằm trong selectedSeats nhưng có status=${seat.status}`
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={seat.id}
                      style={[
                        styles.seat,
                        seat.seat_type === "regular" && styles.regularSeat,
                        seat.seat_type === "vip" && styles.vipSeat,
                        seat.seat_type === "deluxe" && styles.deluxeSeat,
                        isSelected && styles.selectedSeat,
                        isSeatBooked && styles.bookedSeat,
                      ]}
                      onPress={() => !isSeatBooked && handleSeatSelect(seat)}
                      disabled={isSeatBooked}
                      activeOpacity={0.7}
                    >
                      <SeatIcon />
                      <Text style={styles.seatNumber}>{seat.seat_number}</Text>
                      {isSelected && <View style={styles.selectedIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.seatLegendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.regularSeat]} />
            <Text style={styles.legendText}>Thường</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.vipSeat]} />
            <Text style={styles.legendText}>VIP</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.deluxeSeat]} />
            <Text style={styles.legendText}>Đôi</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.selectedSeat]} />
            <Text style={styles.legendText}>Đã chọn</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.bookedSeat]} />
            <Text style={styles.legendText}>Đã đặt</Text>
          </View>
        </View>
      </ScrollView>

      {/* Selected seats preview */}
      <View style={styles.selectedSeatsBar}>
        <Text style={styles.selectedSeatsLabel}>Ghế đã chọn:</Text>
        <Text style={styles.selectedSeatsText}>{getSelectedSeatsText()}</Text>
      </View>

      {/* Footer */}
      <LinearGradient colors={["#111", "#000"]} style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Tổng tiền:</Text>
          <Text style={styles.priceValue}>{totalPrice.toLocaleString()}đ</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bookButton,
            selectedSeats.length === 0 && styles.disabledButton,
          ]}
          onPress={handleReserveSeats}
          activeOpacity={0.8}
          disabled={selectedSeats.length === 0}
        >
          <LinearGradient
            colors={
              selectedSeats.length === 0
                ? ["#666", "#444"]
                : ["#ff3b30", "#d01d27"]
            }
            style={styles.bookButtonGradient}
          >
            <Text style={styles.bookButtonText}>ĐẶT VÉ</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Modal đề xuất ghế thay thế */}
      <Modal
        visible={showSuggestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuggestionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đề xuất ghế thay thế</Text>
            <Text style={styles.modalDesc}>
              Các ghế bạn chọn đã bị giữ. Vui lòng chọn một trong các nhóm ghế
              sau:
            </Text>

            <ScrollView
              style={[styles.suggestionsContainer, { maxHeight: height * 0.4 }]}
            >
              {suggestedGroups.length > 0 ? (
                suggestedGroups.map((group, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionGroup}
                    onPress={() => handleSelectSuggestedSeats(group)}
                  >
                    <View style={styles.suggestedSeatsRow}>
                      {group.map((seat) => (
                        <Text key={seat.id} style={styles.suggestedSeat}>
                          {seat.seat_row}
                          {seat.seat_number}
                        </Text>
                      ))}
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noSuggestionsText}>
                  Không tìm thấy nhóm ghế phù hợp. Vui lòng chọn ghế khác.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSuggestionModal(false)}
            >
              <Text style={styles.closeButtonText}>Chọn lại ghế khác</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  infoIcon: {
    marginRight: 6,
  },
  movieName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoText: {
    color: "#aaa",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  scrollContainer: {
    alignItems: "center",
    paddingBottom: 200,
  },
  screenContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  screenText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    letterSpacing: 1,
  },
  screenBar: {
    width: width * 0.7,
    height: 6,
    borderRadius: 3,
    marginBottom: 30,
  },
  seatMapContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  rowLabelContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  seat: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    position: "relative",
  },
  selectedIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    elevation: 4,
  },
  regularSeat: {
    backgroundColor: "#3498db",
    borderColor: "#2980b9",
  },
  vipSeat: {
    backgroundColor: "#e74c3c",
    borderColor: "#c0392b",
  },
  deluxeSeat: {
    backgroundColor: "#2ecc71",
    borderColor: "#27ae60",
    width: 46, // slightly wider for couple seats
    height: 36,
  },
  selectedSeat: {
    backgroundColor: "#f39c12",
    borderColor: "#e67e22",
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  bookedSeat: {
    backgroundColor: "#666",
    borderColor: "#555",
    opacity: 0.5,
  },
  seatNumber: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  seatRowScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  seatLegendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    paddingVertical: 10,
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  legendSeat: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    color: "#aaa",
    fontSize: 12,
  },
  selectedSeatsBar: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 10, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    flexDirection: "row",
    alignItems: "center",
  },
  selectedSeatsLabel: {
    color: "#999",
    fontSize: 14,
    marginRight: 8,
  },
  selectedSeatsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: "#999",
    fontSize: 14,
  },
  priceValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  bookButton: {
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#d01d27",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  bookButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1C2526",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalDesc: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  suggestionsContainer: {
    maxHeight: 300,
  },
  suggestionGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2C3539",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  suggestedSeatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestedSeat: {
    color: "#fff",
    backgroundColor: "#FF4444",
    padding: 8,
    borderRadius: 5,
    marginRight: 8,
    fontSize: 14,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#2C3539",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  bottomBar: {
    backgroundColor: "#1C2526",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    color: "#ccc",
    fontSize: 14,
  },
  totalAmount: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  confirmButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginLeft: 15,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noSuggestionsText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    right: 16,
  },
  timerText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 14,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
});

export default SelectSeatsScreen;
