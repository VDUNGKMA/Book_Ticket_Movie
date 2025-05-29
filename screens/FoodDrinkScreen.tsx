import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { getFoodAndDrinks, FoodDrink } from "../api/api";
import { BASE_URL } from "../config/config";

type FoodDrinkScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "FoodDrinkScreen"
>;

interface FoodDrinkItem extends FoodDrink {
  quantity: number;
}

const FoodDrinkScreen: React.FC = () => {
  const navigation = useNavigation<FoodDrinkScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as {
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
  };

  const [foodItems, setFoodItems] = useState<FoodDrinkItem[]>([]);
  const [drinkItems, setDrinkItems] = useState<FoodDrinkItem[]>([]);
  const [comboItems, setComboItems] = useState<FoodDrinkItem[]>([]);
  const [activeTab, setActiveTab] = useState<"food" | "drink" | "combo">(
    "food"
  );
  const [isLoading, setIsLoading] = useState(true);

  // Timer state for reservation
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    loadFoodAndDrinks();

    // Set up timer for reservation
    if (params.expiresAt) {
      const calculateRemainingTime = () => {
        const expiry = new Date(params.expiresAt).getTime();
        const now = new Date().getTime();
        return Math.max(0, Math.floor((expiry - now) / 1000));
      };

      setRemainingTime(calculateRemainingTime());

      const timer = setInterval(() => {
        if (!timerActive) return;

        const timeLeft = calculateRemainingTime();
        setRemainingTime(timeLeft);

        if (timeLeft <= 0) {
          // Time expired
          clearInterval(timer);
          Alert.alert(
            "Hết thời gian đặt vé",
            "Thời gian giữ ghế đã hết. Vui lòng chọn ghế lại.",
            [
              {
                text: "OK",
                onPress: () =>
                  navigation.navigate("MovieDetailScreen", {
                    movieId: params.movieId,
                  }),
              },
            ]
          );
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  const loadFoodAndDrinks = async () => {
    setIsLoading(true);
    try {
      // Fetch all categories
      const foodData = await getFoodAndDrinks("food");
      const drinkData = await getFoodAndDrinks("drink");
      const comboData = await getFoodAndDrinks("combo");

      // Log để debug
      console.log(
        "Sample food item price:",
        foodData[0]?.price,
        "Type:",
        typeof foodData[0]?.price
      );

      // Add quantity property to each item
      setFoodItems(foodData.map((item) => ({ ...item, quantity: 0 })));
      setDrinkItems(drinkData.map((item) => ({ ...item, quantity: 0 })));
      setComboItems(comboData.map((item) => ({ ...item, quantity: 0 })));
    } catch (error) {
      console.error("Error loading food and drinks:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải danh sách đồ ăn và thức uống. Vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrement = (id: number) => {
    if (activeTab === "food") {
      setFoodItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else if (activeTab === "drink") {
      setDrinkItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setComboItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    }
  };

  const handleDecrement = (id: number) => {
    if (activeTab === "food") {
      setFoodItems((items) =>
        items.map((item) =>
          item.id === id && item.quantity > 0
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else if (activeTab === "drink") {
      setDrinkItems((items) =>
        items.map((item) =>
          item.id === id && item.quantity > 0
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else {
      setComboItems((items) =>
        items.map((item) =>
          item.id === id && item.quantity > 0
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    }
  };

  const getTotalItems = () => {
    const foodCount = foodItems.reduce((sum, item) => sum + item.quantity, 0);
    const drinkCount = drinkItems.reduce((sum, item) => sum + item.quantity, 0);
    const comboCount = comboItems.reduce((sum, item) => sum + item.quantity, 0);
    return foodCount + drinkCount + comboCount;
  };

  const getTotalPrice = () => {
    const foodTotal = foodItems.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          (typeof item.price === "string"
            ? parseFloat(item.price)
            : item.price),
      0
    );
    const drinkTotal = drinkItems.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          (typeof item.price === "string"
            ? parseFloat(item.price)
            : item.price),
      0
    );
    const comboTotal = comboItems.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          (typeof item.price === "string"
            ? parseFloat(item.price)
            : item.price),
      0
    );
    return foodTotal + drinkTotal + comboTotal;
  };

  const handleContinue = () => {
    // Combine all selected items
    const selectedItems = [
      ...foodItems.filter((item) => item.quantity > 0),
      ...drinkItems.filter((item) => item.quantity > 0),
      ...comboItems.filter((item) => item.quantity > 0),
    ];

    // Navigate to checkout screen with food/drink selections
    navigation.navigate("CheckoutScreen", {
      ...params,
      foodDrinks: selectedItems,
      foodDrinkTotal: getTotalPrice(),
    });
  };

  const handleSkip = () => {
    // Go to checkout without any food/drinks
    navigation.navigate("CheckoutScreen", {
      ...params,
      foodDrinks: [],
      foodDrinkTotal: 0,
    });
  };

  const renderTimeRemaining = () => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const renderItem = ({ item }: { item: FoodDrinkItem }) => (
    <View style={styles.itemContainer}>
      <Image
        // source={{ uri: item.image_url || "https://via.placeholder.com/100" }}
        source={{
          uri: item.image_url?.startsWith("http")
            ? item.image_url
            : `${BASE_URL}${item.image_url}`,
        }}
        style={styles.itemImage}
      />

      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description || "No description available"}
        </Text>
        <Text style={styles.itemPrice}>
          {(typeof item.price === "string"
            ? parseFloat(item.price)
            : item.price
          ).toLocaleString("vi-VN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }) + "đ"}
        </Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleDecrement(item.id)}
          disabled={item.quantity === 0}
        >
          <Ionicons
            name="remove"
            size={20}
            color={item.quantity === 0 ? "#ccc" : "#e74c3c"}
          />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleIncrement(item.id)}
          disabled={
            !item.is_available ||
            (item.stock_quantity !== null &&
              item.stock_quantity !== undefined &&
              item.quantity >= item.stock_quantity)
          }
        >
          <Ionicons name="add" size={20} color="#2ecc71" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm đồ ăn & thức uống</Text>
        <Text style={styles.timerText}>{renderTimeRemaining()}</Text>
      </View>

      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{params.movieTitle}</Text>
        <Text style={styles.movieDetails}>
          {params.cinemaName} | {params.date} | {params.time}
        </Text>
        <Text style={styles.seatInfo}>{params.selectedSeatsText}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "food" && styles.activeTab]}
          onPress={() => setActiveTab("food")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "food" && styles.activeTabText,
            ]}
          >
            Đồ ăn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "drink" && styles.activeTab]}
          onPress={() => setActiveTab("drink")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "drink" && styles.activeTabText,
            ]}
          >
            Thức uống
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "combo" && styles.activeTab]}
          onPress={() => setActiveTab("combo")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "combo" && styles.activeTabText,
            ]}
          >
            Combo
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e74c3c" />
        </View>
      ) : (
        <FlatList
          data={
            activeTab === "food"
              ? foodItems
              : activeTab === "drink"
              ? drinkItems
              : comboItems
          }
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có sản phẩm</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {getTotalItems()} món -{" "}
            {getTotalPrice().toLocaleString("vi-VN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }) + "đ"}
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Bỏ qua</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              getTotalItems() === 0 && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={getTotalItems() === 0}
          >
            <Text style={styles.continueButtonText}>Tiếp tục</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1116",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#161921",
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  timerText: {
    fontSize: 16,
    color: "#e74c3c",
    fontWeight: "bold",
  },
  movieInfo: {
    padding: 16,
    backgroundColor: "#1a1d24",
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  movieDetails: {
    fontSize: 14,
    color: "#bbb",
    marginBottom: 4,
  },
  seatInfo: {
    fontSize: 14,
    color: "#e74c3c",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#161921",
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#e74c3c",
  },
  tabText: {
    fontSize: 16,
    color: "#aaa",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#aaa",
    fontSize: 16,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1d24",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    color: "#e74c3c",
    fontWeight: "bold",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222530",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#161921",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#222530",
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
  },
  skipButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#222530",
    marginRight: 8,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  continueButton: {
    flex: 2,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#e74c3c",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#994433",
    opacity: 0.7,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default FoodDrinkScreen;
