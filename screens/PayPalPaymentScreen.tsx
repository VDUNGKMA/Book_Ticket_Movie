import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import {
  createPayPalOrder,
  capturePayPalPayment,
  processPayment,
  getPayPalOrderDetails,
  getProfile,
} from "../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PayPalPaymentScreenParams {
  amount: number;
  description: string;
  ticketIds: number[];
}

const PayPalPaymentScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const webViewRef = useRef<WebView>(null);

  const { amount, description, ticketIds } =
    route.params as PayPalPaymentScreenParams;

  const [isLoading, setIsLoading] = useState(true);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const VND_TO_USD = 24000; // Tỉ giá cố định, có thể lấy từ config hoặc API

  // Define custom URLs that we can detect in the WebView
  const successUrl = "https://example.com/payment/success";
  const cancelUrl = "https://example.com/payment/cancel";

  // Chuyển đổi VND sang USD cho PayPal
  const amountUSD = (amount / VND_TO_USD).toFixed(2);

  const initPayPalOrder = async () => {
    try {
      setIsLoading(true);

      // Lấy userId từ API getProfile thay vì AsyncStorage
      let userId: number | null = null;
      try {
        const userProfile = await getProfile();
        userId = userProfile.id;
      } catch (err) {
        setError(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
        Alert.alert(
          "Lỗi",
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
        setIsLoading(false);
        return;
      }

      // Pass our custom URLs to the backend along with ticket and user data
      if (!userId) {
        setError(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
        Alert.alert(
          "Lỗi",
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
        setIsLoading(false);
        return;
      }

      // Tạo đơn hàng PayPal với các tùy chọn địa phương hóa
      const orderResponse = await createPayPalOrder(
        Number(amountUSD), // số tiền USD
        description,
        successUrl,
        cancelUrl,
        ticketIds,
        userId,
        {
          locale: "vi_VN",
          country_code: "VN",
          currency: "USD", // truyền currency rõ ràng
        }
      );

      // Find the approval URL from the returned links
      const approvalUrl = orderResponse.links.find(
        (link) => link.rel === "approve"
      )?.href;

      if (!approvalUrl) {
        throw new Error("Không tìm thấy URL phê duyệt từ PayPal");
      }

      console.log("PayPal Order ID:", orderResponse.id);
      console.log("PayPal Approval URL:", approvalUrl);

      // Store ticketIds for local processing if webhook fails
      await AsyncStorage.setItem(
        "created_ticket_ids",
        JSON.stringify(ticketIds)
      );

      setPaypalOrderId(orderResponse.id);
      setWebViewUrl(approvalUrl);
    } catch (err: any) {
      console.error("PayPal initialization error:", err);
      setError(err.message || "Đã xảy ra lỗi khi khởi tạo thanh toán PayPal");
      Alert.alert("Lỗi", err.message || "Không thể kết nối với PayPal");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initPayPalOrder();
  }, []);

  const handleNavigationStateChange = async (navState: any) => {
    console.log("WebView navigating to:", navState.url);

    // Kiểm tra các URLs có chứa thông tin về lỗi token đã bị tiêu thụ
    const isTokenConsumedError =
      (navState.url.includes("generic-error") &&
        navState.url.includes("TOKEN_CONSUMED")) ||
      (navState.url.includes("token") && navState.url.includes("used")) ||
      (navState.url.includes("token") && navState.url.includes("consumed")) ||
      navState.url.includes("already-approved");

    // Kiểm tra lỗi token đã bị sử dụng
    if (isTokenConsumedError) {
      console.log(
        "Token đã bị sử dụng, chuyển sang kiểm tra trạng thái thanh toán"
      );

      // Ngăn WebView tiếp tục tải
      webViewRef.current?.stopLoading();

      setIsLoading(true);

      // Kiểm tra trạng thái đơn hàng từ PayPal để xác nhận đã thanh toán thành công chưa
      try {
        if (paypalOrderId) {
          // Kiểm tra xem giao dịch này đã được xử lý trước đó chưa
          const processedTransactions = await AsyncStorage.getItem(
            "processed_paypal_transactions"
          );
          const processedTxList = processedTransactions
            ? JSON.parse(processedTransactions)
            : [];

          // Nếu giao dịch đã được xử lý, chuyển thẳng đến trang vé
          if (processedTxList.includes(paypalOrderId)) {
            console.log("Giao dịch đã được xử lý trước đó:", paypalOrderId);

            // Đảm bảo các flags được thiết lập
            await AsyncStorage.setItem("payment_completed", "true");
            await AsyncStorage.setItem(
              "payment_success_timestamp",
              new Date().toISOString()
            );

            // Xóa dữ liệu tạm thời nếu còn
            await AsyncStorage.removeItem("created_ticket_ids");
            await AsyncStorage.removeItem("paypal_transaction_id");

            // Chuyển thẳng đến trang vé
            Alert.alert(
              "Thông báo",
              "Giao dịch đã được xử lý trước đó. Chuyển đến trang vé của bạn.",
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
            return;
          }

          // Kiểm tra chi tiết đơn hàng từ PayPal
          const orderDetails = await getPayPalOrderDetails(paypalOrderId);
          console.log("Kiểm tra chi tiết đơn hàng:", orderDetails);

          if (orderDetails && orderDetails.status === "COMPLETED") {
            // Xử lý như thanh toán thành công
            await handleSuccessfulPayment(paypalOrderId);
          } else if (orderDetails && orderDetails.status === "APPROVED") {
            // Trạng thái APPROVED, cần capture thanh toán
            try {
              console.log(
                "Payment approved, capturing payment for order:",
                paypalOrderId
              );
              // Gọi API để capture thanh toán
              const captureResponse = await capturePayPalPayment(paypalOrderId);
              console.log("Capture response:", captureResponse);

              if (captureResponse.status === "COMPLETED") {
                await handleSuccessfulPayment(paypalOrderId);
              } else {
                // Thanh toán thất bại hoặc chưa hoàn thành
                Alert.alert(
                  "Thông báo",
                  "Thanh toán chưa hoàn thành. Vui lòng thử lại."
                );
              }
            } catch (captureError: any) {
              console.error("PayPal capture error:", captureError);

              // Kiểm tra nếu lỗi là do token đã được sử dụng
              if (
                captureError.message &&
                (captureError.message.includes("token") ||
                  captureError.message.includes("TOKEN_CONSUMED") ||
                  captureError.message.includes("already captured"))
              ) {
                // Kiểm tra lại trạng thái đơn hàng
                try {
                  const refreshedOrderDetails = await getPayPalOrderDetails(
                    paypalOrderId
                  );
                  if (
                    refreshedOrderDetails &&
                    refreshedOrderDetails.status === "COMPLETED"
                  ) {
                    console.log("Đơn hàng đã hoàn thành, xử lý thanh toán");
                    await handleSuccessfulPayment(paypalOrderId);
                    return;
                  }
                } catch (orderError) {
                  console.error(
                    "Lỗi khi kiểm tra chi tiết đơn hàng:",
                    orderError
                  );
                }
              }

              Alert.alert(
                "Lỗi",
                captureError.message || "Xảy ra lỗi khi xác nhận thanh toán"
              );
            }
          } else {
            // Có token consumed nhưng trạng thái không phải COMPLETED hoặc APPROVED
            Alert.alert(
              "Thông báo",
              "Cần khởi tạo lại giao dịch thanh toán. Vui lòng thử lại.",
              [
                {
                  text: "Thử lại",
                  onPress: () => {
                    setIsLoading(true);
                    setWebViewUrl(null);
                    setPaypalOrderId(null);
                    setError(null);
                    initPayPalOrder();
                  },
                },
                {
                  text: "Hủy",
                  onPress: () => navigation.goBack(),
                  style: "cancel",
                },
              ]
            );
          }
        } else {
          throw new Error("Không tìm thấy ID đơn hàng PayPal");
        }
      } catch (error) {
        console.error("Error checking PayPal order status:", error);
        Alert.alert(
          "Lỗi",
          "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Check if URL contains our success or cancel indicators
    if (navState.url.includes(successUrl) && paypalOrderId) {
      setIsLoading(true);
      try {
        console.log(
          "Payment approved, capturing payment for order:",
          paypalOrderId
        );
        // Call API to capture the payment
        const captureResponse = await capturePayPalPayment(paypalOrderId);
        console.log("Capture response:", captureResponse);

        if (captureResponse.status === "COMPLETED") {
          await handleSuccessfulPayment(paypalOrderId);
        } else {
          // Payment failed or incomplete
          Alert.alert(
            "Thông báo",
            "Thanh toán chưa hoàn thành. Vui lòng thử lại."
          );
        }
      } catch (err: any) {
        console.error("PayPal capture error:", err);

        // Kiểm tra nếu lỗi là do token đã được sử dụng
        if (
          err.message &&
          (err.message.includes("token") ||
            err.message.includes("TOKEN_CONSUMED") ||
            err.message.includes("already captured"))
        ) {
          try {
            // Kiểm tra trạng thái đơn hàng
            const orderDetails = await getPayPalOrderDetails(paypalOrderId);
            if (orderDetails && orderDetails.status === "COMPLETED") {
              console.log("Đơn hàng đã hoàn thành, xử lý thanh toán");
              await handleSuccessfulPayment(paypalOrderId);
              return;
            }
          } catch (orderError) {
            console.error("Lỗi khi kiểm tra chi tiết đơn hàng:", orderError);
          }
        }

        Alert.alert("Lỗi", err.message || "Xảy ra lỗi khi xác nhận thanh toán");
      } finally {
        setIsLoading(false);
      }
    } else if (navState.url.includes(cancelUrl)) {
      // User canceled the payment
      console.log("Người dùng đã hủy thanh toán");
      Alert.alert(
        "Đã hủy thanh toán",
        "Bạn đã hủy thanh toán PayPal. Bạn có muốn thử lại?",
        [
          {
            text: "Thử lại",
            onPress: () => {
              // Restart the PayPal flow
              setIsLoading(true);
              setWebViewUrl(null);
              setPaypalOrderId(null);
              setError(null);
              initPayPalOrder();
            },
          },
          {
            text: "Hủy",
            onPress: () => navigation.goBack(),
            style: "cancel",
          },
        ]
      );
    }
  };

  const handleGoBack = () => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn hủy quá trình thanh toán này không?",
      [
        {
          text: "Tiếp tục thanh toán",
          style: "cancel",
        },
        {
          text: "Hủy thanh toán",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Hàm xử lý thanh toán thành công
  const handleSuccessfulPayment = async (orderId: string) => {
    try {
      // Kiểm tra xem giao dịch này đã được xử lý trước đó chưa
      const processedTransactions = await AsyncStorage.getItem(
        "processed_paypal_transactions"
      );
      const processedTxList = processedTransactions
        ? JSON.parse(processedTransactions)
        : [];

      // Kiểm tra giao dịch đã được xử lý chưa
      if (processedTxList.includes(orderId)) {
        console.log("Giao dịch đã được xử lý trước đó:", orderId);

        // Đảm bảo các flags được thiết lập
        await AsyncStorage.setItem("payment_completed", "true");
        await AsyncStorage.setItem(
          "payment_success_timestamp",
          new Date().toISOString()
        );

        // Xóa dữ liệu tạm thời nếu còn
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem("paypal_transaction_id");

        // Giao dịch đã được xử lý trước đó, chuyển thẳng đến trang vé
        Alert.alert(
          "Thông báo",
          "Giao dịch đã được xử lý trước đó. Chuyển đến trang vé của bạn.",
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
        return;
      }

      // Kiểm tra trên server xem giao dịch đã được xử lý chưa trước khi thực hiện thanh toán
      try {
        // Lấy thông tin ticket IDs
        const savedTicketIds = await AsyncStorage.getItem("created_ticket_ids");
        if (!savedTicketIds) {
          throw new Error("Không tìm thấy thông tin vé");
        }

        const ticketIdsToProcess = JSON.parse(savedTicketIds);

        // Thực hiện lưu transactionId này vào danh sách đã xử lý trước khi gọi API
        // để đảm bảo không xử lý trùng lặp ngay cả khi có lỗi mạng
        const updatedTxList = [...processedTxList, orderId];
        await AsyncStorage.setItem(
          "processed_paypal_transactions",
          JSON.stringify(updatedTxList)
        );
        console.log("Đã lưu giao dịch vào danh sách đã xử lý:", orderId);

        // Lưu transactionId vào AsyncStorage
        await AsyncStorage.setItem("paypal_transaction_id", orderId);

        try {
          // Xử lý hoàn tất thanh toán
          await processPayment({
            ticketIds: ticketIdsToProcess,
            paymentMethod: "paypal",
            amount: amount,
            transactionId: orderId,
          });
          console.log("Xử lý thanh toán thành công với mã:", orderId);
        } catch (paymentError: any) {
          console.error("Lỗi xử lý thanh toán:", paymentError);

          // Nếu lỗi là do mã giao dịch đã tồn tại, vẫn xem như thành công
          if (
            paymentError.message &&
            (paymentError.message.includes("đã tồn tại") ||
              paymentError.message.includes("already exists"))
          ) {
            console.log("Thanh toán đã được xử lý trên server:", orderId);
            // Tiếp tục xử lý như thành công
          } else {
            // Nếu là lỗi khác, xóa giao dịch khỏi danh sách đã xử lý để cho phép thử lại
            const filteredTxList = processedTxList.filter(
              (tx: string) => tx !== orderId
            );
            await AsyncStorage.setItem(
              "processed_paypal_transactions",
              JSON.stringify(filteredTxList)
            );

            throw paymentError;
          }
        }

        // Xóa toàn bộ thông tin liên quan đến ticketId, reservation, payment flag
        await AsyncStorage.removeItem("created_ticket_ids");
        await AsyncStorage.removeItem("paypal_transaction_id");
        await AsyncStorage.removeItem("payment_completed");
        await AsyncStorage.removeItem("payment_success_timestamp");
        await AsyncStorage.removeItem("RESERVATION_STORAGE_KEY");

        // Lưu trạng thái thanh toán thành công
        await AsyncStorage.setItem("payment_completed", "true");
        await AsyncStorage.setItem(
          "payment_success_timestamp",
          new Date().toISOString()
        );

        // Thông báo thành công và chuyển hướng
        Alert.alert("Thành công", "Thanh toán PayPal thành công!", [
          {
            text: "OK",
            onPress: () => {
              // Chuyển thẳng đến màn hình vé
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
        ]);
      } catch (error: any) {
        // Xử lý lỗi
        console.error("Lỗi xử lý thanh toán:", error);
        Alert.alert(
          "Lỗi thanh toán",
          error.message || "Có lỗi xảy ra khi hoàn tất thanh toán",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Lỗi xử lý thanh toán:", error);
      Alert.alert(
        "Lỗi thanh toán",
        error.message || "Có lỗi xảy ra khi hoàn tất thanh toán",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán PayPal</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Đang kết nối với PayPal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lỗi</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#FF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
              initPayPalOrder();
            }}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán PayPal</Text>
        <View style={{ width: 24 }} />
      </View>
      {webViewUrl && (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          startInLoadingState={true}
          originWhitelist={["*"]}
          injectedJavaScript={`
            // Cố gắng đặt ngôn ngữ cho PayPal
            try {
              // Đặt ngôn ngữ cho HTML
              if (document.querySelector('html')) {
                document.querySelector('html').setAttribute('lang', 'vi-VN');
              }
              
              // Thêm meta tag để đảm bảo hiển thị đúng tiếng Việt
              var meta = document.createElement('meta');
              meta.setAttribute('charset', 'UTF-8');
              document.head.appendChild(meta);
              
              // Thêm meta viewport để đảm bảo hiển thị tốt trên mobile
              var viewport = document.createElement('meta');
              viewport.setAttribute('name', 'viewport');
              viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
              document.head.appendChild(viewport);
              
              // Cố gắng tìm và click nút ngôn ngữ nếu có
              setTimeout(function() {
                // Tìm các phần tử liên quan đến ngôn ngữ
                var languageElements = document.querySelectorAll('[data-testid*="language"], [data-testid*="locale"], [aria-label*="language"], [aria-label*="Language"]');
                
                // Click vào phần tử đầu tiên tìm thấy
                if (languageElements && languageElements.length > 0) {
                  languageElements[0].click();
                  
                  // Sau khi click, tìm và chọn tiếng Việt
                  setTimeout(function() {
                    var vietnameseOptions = document.querySelectorAll('[data-testid*="VN"], [data-testid*="vi"], [aria-label*="Vietnamese"], [aria-label*="Tiếng Việt"]');
                    if (vietnameseOptions && vietnameseOptions.length > 0) {
                      vietnameseOptions[0].click();
                    }
                  }, 1000);
                }
              }, 2000);
            } catch(e) {
              console.error('Error setting language:', e);
            }
            true;
          `}
          renderLoading={() => (
            <View style={styles.webViewLoaderContainer}>
              <ActivityIndicator size="large" color="#FF4444" />
              <Text style={styles.loadingText}>
                Đang tải trang thanh toán...
              </Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error:", nativeEvent);
            setError("Lỗi khi tải trang thanh toán PayPal. Vui lòng thử lại.");
          }}
        />
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
    fontSize: 18,
    fontWeight: "bold",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  webView: {
    flex: 1,
  },
  webViewLoaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(28, 37, 38, 0.8)",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#FF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PayPalPaymentScreen;
