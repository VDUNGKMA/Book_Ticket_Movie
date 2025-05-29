import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../config/config";
import { User } from "../context/UserContext";
import { Movie } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Kiểm tra nếu SecureStore hợp lệ
const isSecureStoreValid = () => {
  try {
    return typeof SecureStore.getItemAsync === "function";
  } catch (e) {
    console.log("SecureStore is not available:", e);
    return false;
  }
};

// Hàm làm mới token
const refreshAccessToken = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (!refreshToken) {
      console.log("No refresh token available");
      // Xóa token cũ vì không còn hợp lệ
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      throw new Error("No refresh token available");
    }

    const response = await api.post("/auth/refresh", {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data;

    // Lưu token mới
    await SecureStore.setItemAsync("access_token", access_token);
    if (refresh_token) {
      await SecureStore.setItemAsync("refresh_token", refresh_token);
    }

    return access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    // Đảm bảo các token bị xóa khi có lỗi
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    throw error;
  }
};

// Thêm vào đầu file api.ts
const PUBLIC_ENDPOINTS = [
  "/movies/popular",
  "/movies/upcoming",
  "/movies/now-playing",
  "/movies/top-rated-list",
  // "/movies",
  // "/movies/:id",
];

// Sửa lại interceptor request
api.interceptors.request.use(
  async (config) => {
    // Kiểm tra xem endpoint có trong danh sách public không
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      config.url?.startsWith(endpoint.replace(":id", ""))
    );

    if (!isPublicEndpoint && isSecureStoreValid()) {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Sửa lại interceptor response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra xem endpoint có trong danh sách public không
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      originalRequest.url?.startsWith(endpoint.replace(":id", ""))
    );

    // Chỉ xử lý refresh token nếu không phải là public endpoint
    if (
      !isPublicEndpoint &&
      error.response?.status === 401 &&
      isSecureStoreValid() &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log("Token refresh failed, please login again");
        // Đã xóa token trong hàm refreshAccessToken
        return Promise.reject({
          ...error,
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
      }
    }
    return Promise.reject(error);
  }
);

// Định nghĩa interface cho response
export interface ApiResponse<T> {
  data?: T;
  message?: string | string[];
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

// Đăng ký
export const register = async (
  username: string,
  email: string,
  password: string
): Promise<ApiResponse<any>> => {
  try {
    const response: AxiosResponse<ApiResponse<any>> = await api.post(
      "/auth/register",
      {
        name: username,
        email,
        password,
      }
    );
    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    const errorData = axiosError.response?.data;

    console.log("API Error:", {
      message: error.message,
      response: axiosError.response?.data,
      status: axiosError.response?.status,
    });

    if (errorData) {
      if (Array.isArray(errorData.message)) {
        throw { message: errorData.message.join("\n") };
      } else if (typeof errorData.message === "string") {
        throw { message: errorData.message };
      } else if (Array.isArray(errorData)) {
        throw { message: errorData.join("\n") };
      }
    }
    throw { message: "Có lỗi xảy ra khi gọi API" };
  }
};

// Đăng nhập
export const login = async (
  email: string,
  password: string
): Promise<ApiResponse<any>> => {
  try {
    const response: AxiosResponse<ApiResponse<any>> = await api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );
    const { access_token, refresh_token, user } = response.data;

    // Lưu token vào SecureStore
    if (access_token && isSecureStoreValid()) {
      await SecureStore.setItemAsync("access_token", access_token);
    }
    if (refresh_token && isSecureStoreValid()) {
      await SecureStore.setItemAsync("refresh_token", refresh_token);
    }

    // Trả về thông tin người dùng
    return { ...response.data };
  } catch (error: any) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    const errorData = axiosError.response?.data;

    console.log("API Error:", {
      message: error.message,
      response: axiosError.response?.data,
      status: axiosError.response?.status,
    });

    if (errorData) {
      if (Array.isArray(errorData.message)) {
        throw { message: errorData.message.join("\n") };
      } else if (typeof errorData.message === "string") {
        throw { message: errorData.message };
      } else if (Array.isArray(errorData)) {
        throw { message: errorData.join("\n") };
      }
    }
    throw { message: "Có lỗi xảy ra khi gọi API" };
  }
};

// Lấy thông tin profile
export const getProfile = async () => {
  try {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) {
      console.log("No access token available for getProfile");
      throw new Error("Bạn cần đăng nhập lại");
    }

    const response: AxiosResponse<any> = await api.get("/users/profile");
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Nếu có response từ API, log thông tin chi tiết
      console.error("API Error:", error.response?.data);
      console.error("API Status:", error.response?.status);

      if (error.response.status === 401) {
        // Xóa token nếu lỗi xác thực
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
    } else {
      // Nếu không có response (lỗi mạng, timeout,...)
      console.error("Network Error:", error.message);
    }

    throw new Error("Có lỗi xảy ra khi lấy thông tin profile");
  }
};

// Cập nhật thông tin profile
export const updateProfile = async (
  updateData: any
): Promise<ApiResponse<any>> => {
  try {
    const response: AxiosResponse<ApiResponse<any>> = await api.put(
      "/users/profile",
      updateData
    );
    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    console.log("API Error:", {
      message: error.message,
      response: axiosError.response?.data,
      status: axiosError.response?.status,
    });
    throw { message: "Có lỗi xảy ra khi cập nhật profile" };
  }
};

// Tải lên ảnh đại diện
export const uploadImage = async (uri: string): Promise<ApiResponse<any>> => {
  const formData = new FormData();
  formData.append("image", {
    uri,
    type: "image/jpeg",
    name: `profile-${Date.now()}.jpg`,
  } as any);

  try {
    const response: AxiosResponse<ApiResponse<any>> = await api.post(
      "/users/profile/upload-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    console.log("API Error:", {
      message: error.message,
      response: axiosError.response?.data,
      status: axiosError.response?.status,
    });
    throw { message: "Có lỗi xảy ra khi tải ảnh lên" };
  }
};

// Lấy danh sách phim phổ biến
export const getPopularMovies = async (): Promise<Movie[]> => {
  try {
    const response = await api.get("/movies/popular");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching popular movies:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách phim phổ biến" };
  }
};

// Lấy danh sách phim sắp chiếu
export const getUpcomingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await api.get("/movies/upcoming");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching upcoming movies:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách phim sắp chiếu" };
  }
};

// Lấy danh sách phim đang chiếu
export const getNowPlayingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await api.get("/movies/now-playing");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching now playing movies:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách phim đang chiếu" };
  }
};

// Lấy danh sách phim có đánh giá cao
export const getTopRatedMovies = async (): Promise<Movie[]> => {
  try {
    const response = await api.get("/movies/top-rated-list");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching top rated movies:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách phim có đánh giá cao" };
  }
};

// Lấy chi tiết của một phim theo ID
export const getMovieDetail = async (id: number): Promise<Movie> => {
  try {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching movie details:", error);
    throw { message: "Có lỗi xảy ra khi lấy thông tin chi tiết phim" };
  }
};
export const getScreenings = async ({
  movieId,
  date,
}: {
  movieId: string;
  date: string;
}) => {
  try {
    const res = await api.get(`/screenings`, {
      params: { movieId, date },
    });
    return res.data;
  } catch (error: any) {
    console.error("Error fetching screenings:", error);
    throw { message: "Có lỗi xảy ra khi lấy thông tin chiếu phim" };
  }
};
export const getSeats = async ({
  theaterRoomId,
}: {
  theaterRoomId: number;
}) => {
  try {
    const res = await api.get(`/seats`, {
      params: { theaterRoomId },
    });
    return res.data;
  } catch (error: any) {
    console.error("Error fetching seats:", error);
    throw { message: "Có lỗi xảy ra khi lấy thông tin ghế" };
  }
};

// Tạo đặt chỗ tạm thời (seat reservations)
export const createSeatReservations = async ({
  screeningId,
  seatIds,
  requireAll = true,
  suggestAlternatives = true,
}: {
  screeningId: number;
  seatIds: number[];
  requireAll?: boolean;
  suggestAlternatives?: boolean;
}) => {
  try {
    // Lấy thông tin user_id từ profile đã lưu hoặc token
    let userId: number;
    try {
      // Cố gắng lấy thông tin người dùng từ profile
      const userProfile = await getProfile();
      userId = userProfile.id;
      console.log("Lấy được user_id:", userId);
    } catch (error) {
      // Nếu không lấy được, sử dụng ID mặc định (trong môi trường phát triển)
      console.warn("Không lấy được user_id từ profile, sử dụng ID mặc định");
      userId = 1; // ID mặc định cho môi trường phát triển
    }

    console.log("Gửi request đặt chỗ:", {
      user_id: userId,
      screening_id: screeningId,
      seat_ids: seatIds,
      require_all: requireAll,
      suggest_alternatives: suggestAlternatives,
    });

    const response = await api.post("/seat-reservations", {
      user_id: userId,
      screening_id: screeningId,
      seat_ids: seatIds,
      reservation_type: "temporary",
      require_all: requireAll,
      suggest_alternatives: suggestAlternatives,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error creating seat reservations:", error);
    console.error("Response data:", error.response?.data);
    console.error("Request data:", error.config?.data);

    if (error.response?.data?.unavailableSeats) {
      throw {
        message: "Một số ghế không khả dụng",
        unavailableSeats: error.response.data.unavailableSeats,
        alternativeSuggestions: error.response.data.alternativeSuggestions,
      };
    }

    // Hiển thị thông báo lỗi cụ thể từ server nếu có
    if (error.response?.data?.message) {
      if (Array.isArray(error.response.data.message)) {
        throw { message: error.response.data.message.join(", ") };
      } else {
        throw { message: error.response.data.message };
      }
    }

    throw { message: "Có lỗi xảy ra khi đặt chỗ. Vui lòng thử lại sau." };
  }
};

// Cập nhật trạng thái đặt chỗ khi tiến hành thanh toán
export const updateReservationStatus = async ({
  screeningId,
  seatIds,
}: {
  screeningId: number;
  seatIds: number[];
}) => {
  try {
    // Lấy thông tin user_id từ profile đã lưu hoặc token
    let userId: number;
    try {
      const userProfile = await getProfile();
      userId = userProfile.id;
    } catch (error) {
      // Nếu không lấy được, sử dụng ID mặc định
      userId = 1; // ID mặc định cho môi trường phát triển
    }

    console.log("Cập nhật trạng thái đặt chỗ:", {
      user_id: userId,
      screening_id: screeningId,
      seat_ids: seatIds,
    });

    const response = await api.post("/seat-reservations/update-type", {
      user_id: userId,
      screening_id: screeningId,
      seat_ids: seatIds,
      reservation_type: "processing_payment",
    });

    return response.data;
  } catch (error: any) {
    console.error("Error updating reservation status:", error);
    console.error("Response data:", error.response?.data);

    if (error.response?.data?.message) {
      if (Array.isArray(error.response.data.message)) {
        throw { message: error.response.data.message.join(", ") };
      } else {
        throw { message: error.response.data.message };
      }
    }

    throw { message: "Có lỗi xảy ra khi cập nhật trạng thái đặt chỗ" };
  }
};

// Lấy danh sách ghế khả dụng cho một suất chiếu
export const getAvailableSeats = async (screeningId: number) => {
  try {
    const response = await api.get(
      `/seat-reservations/available-seats/${screeningId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching available seats:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách ghế trống" };
  }
};

// Tạo vé sau khi đặt chỗ
export const createTicket = async ({
  screeningId,
  seatId,
  price,
}: {
  screeningId: number;
  seatId: number;
  price: number;
}) => {
  try {
    // Lấy thông tin user_id từ profile
    let userId: number;
    try {
      const userProfile = await getProfile();
      userId = userProfile.id;
    } catch (error) {
      // Nếu không lấy được, sử dụng ID mặc định
      userId = 1; // ID mặc định cho môi trường phát triển
    }

    console.log("Tạo vé:", {
      user_id: userId,
      screening_id: screeningId,
      seat_id: seatId,
      price,
    });

    const response = await api.post("/tickets", {
      user_id: userId,
      screening_id: screeningId,
      seat_id: seatId,
      price: price,
      status: "booked", // Sử dụng 'booked' thay vì 'reserved', phù hợp với enum trong model
    });

    return response.data;
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    console.error("Response data:", error.response?.data);

    if (error.response?.data?.message) {
      if (Array.isArray(error.response.data.message)) {
        throw { message: error.response.data.message.join(", ") };
      } else {
        throw { message: error.response.data.message };
      }
    }

    throw { message: "Có lỗi xảy ra khi tạo vé" };
  }
};

// Tạo nhiều vé cùng lúc
export const createMultipleTickets = async ({
  screeningId,
  seatIds,
  prices,
  foodDrinks,
}: {
  screeningId: number;
  seatIds: number[];
  prices: number[];
  foodDrinks?: Array<{ food_drink_id: number; quantity: number }>;
}) => {
  try {
    // Sử dụng API endpoint mới để tạo một vé với nhiều ghế
    const response = await api.post("/tickets/multiple-seats", {
      screening_id: screeningId,
      seat_ids: seatIds,
      prices: prices,
      food_drinks: foodDrinks,
    });

    return [response.data]; // Trả về mảng chứa một vé để giữ tương thích với code cũ
  } catch (error: any) {
    console.error("Error creating ticket with multiple seats:", error);
    if (error.response?.data?.message) {
      if (Array.isArray(error.response.data.message)) {
        throw { message: error.response.data.message.join(", ") };
      } else {
        throw { message: error.response.data.message };
      }
    }
    throw { message: "Có lỗi xảy ra khi tạo vé" };
  }
};

// Xử lý thanh toán
export const processPayment = async ({
  ticketIds,
  paymentMethod,
  amount,
  transactionId,
  userId: providedUserId,
}: {
  ticketIds: number[];
  paymentMethod: string;
  amount: number;
  transactionId?: string;
  userId?: number;
}) => {
  try {
    // Lấy thông tin user_id từ profile nếu không được cung cấp
    let userId = providedUserId;
    if (!userId) {
      try {
        const userProfile = await getProfile();
        userId = userProfile.id;
      } catch (error) {
        // Nếu không lấy được, sử dụng ID mặc định
        userId = 1; // ID mặc định cho môi trường phát triển
      }
    }

    // Tạo transaction ID nếu chưa có
    const txId =
      transactionId || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log("Xử lý thanh toán:", {
      amount: amount,
      payment_method: paymentMethod,
      ticket_ids: ticketIds,
      transaction_id: txId,
      user_id: userId,
    });

    if (!ticketIds || ticketIds.length === 0) {
      throw new Error("Không có vé nào để thanh toán");
    }

    // Với mô hình mới, một vé có thể có nhiều ghế
    // Lấy ticket_id đầu tiên làm vé chính
    const primaryTicketId = ticketIds[0];

    // Tạo một payment cho vé đầu tiên với toàn bộ số tiền
    const response = await api.post("/payments", {
      ticket_id: primaryTicketId,
      user_id: userId,
      payment_method: paymentMethod === "paypal" ? "PayPal" : paymentMethod,
      amount: amount, // Toàn bộ số tiền
      transaction_id: txId,
      payment_status: "completed",
    });

    // Nếu có nhiều vé, xử lý các vé còn lại
    // Mỗi vé sẽ được tạo với số tiền là 0 và cùng transaction_id
    if (ticketIds.length > 1) {
      const remainingTickets = ticketIds.slice(1);
      const remainingPaymentPromises = remainingTickets.map((ticketId) =>
        api.post("/payments", {
          ticket_id: ticketId,
          user_id: userId,
          payment_method: paymentMethod === "paypal" ? "PayPal" : paymentMethod,
          amount: 0, // Số tiền 0 vì toàn bộ số tiền đã được gán cho vé đầu tiên
          transaction_id: txId,
          payment_status: "completed",
        })
      );

      // Sử dụng Promise.allSettled để xử lý tất cả các payment còn lại
      // ngay cả khi một số có thể thất bại
      const remainingResults = await Promise.allSettled(
        remainingPaymentPromises
      );

      // Log kết quả của các vé còn lại
      remainingResults.forEach(
        (result: PromiseSettledResult<any>, index: number) => {
          if (result.status === "fulfilled") {
            console.log(
              `Thanh toán cho vé ${remainingTickets[index]} thành công`
            );
          } else {
            console.error(
              `Thanh toán cho vé ${remainingTickets[index]} thất bại:`,
              (result as PromiseRejectedResult).reason
            );
          }
        }
      );
    }

    return response.data;
  } catch (error: any) {
    console.error("Error processing payment:", error);
    console.error("Response data:", error.response?.data);

    if (error.response?.data?.message) {
      if (Array.isArray(error.response.data.message)) {
        throw { message: error.response.data.message.join(", ") };
      } else {
        throw { message: error.response.data.message };
      }
    }

    throw { message: "Có lỗi xảy ra khi xử lý thanh toán" };
  }
};

// Lấy danh sách vé của người dùng
export const getUserTickets = async () => {
  try {
    const response = await api.get("/tickets/my-tickets");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching user tickets:", error);
    throw { message: "Có lỗi xảy ra khi lấy danh sách vé" };
  }
};

// Lấy thông tin chi tiết của một vé
export const getTicketDetail = async (ticketId: number) => {
  try {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching ticket detail:", error);
    throw { message: "Có lỗi xảy ra khi lấy thông tin chi tiết vé" };
  }
};

export const reserveSeats = async (
  screeningId: number,
  seatIds: number[],
  userId: number
) => {
  try {
    const response = await api.post<{
      success: boolean;
      message?: string;
      suggestedSeats?: any[];
      suggestedGroups?: any[][];
    }>(`/seat-reservations/reserve`, {
      screeningId,
      seatIds,
      userId,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("Có lỗi xảy ra khi giữ ghế");
  }
};

// Interface cho đề xuất ghế
interface SeatSuggestion {
  id: number;
  seat_row: string;
  seat_number: number;
  seat_type: string;
}

interface SeatReservationResponse {
  success: boolean;
  message?: string;
  conflictedSeats?: number[];
  suggestedSeats?: SeatSuggestion[];
  suggestedGroups?: SeatSuggestion[][];
  reservationId?: string;
  expiresAt?: string;
  alternativeSuggestions?: {
    seats: SeatSuggestion[];
    pairs: SeatSuggestion[][];
  };
}

// Hàm đặt ghế với đề xuất thay thế
export const reserveSeatsWithSuggestions = async (
  screeningId: number,
  seatIds: number[],
  userId: number
): Promise<SeatReservationResponse> => {
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!screeningId || !seatIds || seatIds.length === 0 || !userId) {
      console.error("Invalid input data:", { screeningId, seatIds, userId });
      throw new Error("Dữ liệu không hợp lệ");
    }

    // Đảm bảo các giá trị là số
    const validScreeningId = Number(screeningId);
    const validUserId = Number(userId);
    const validSeatIds = seatIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);

    if (
      isNaN(validScreeningId) ||
      isNaN(validUserId) ||
      validSeatIds.length === 0
    ) {
      console.error("Invalid numeric data:", {
        validScreeningId,
        validUserId,
        validSeatIds,
        originalSeatIds: seatIds,
      });
      throw new Error("Dữ liệu không đúng định dạng số");
    }

    console.log("Gửi yêu cầu đặt ghế:", {
      user_id: validUserId,
      screening_id: validScreeningId,
      seat_ids: validSeatIds,
      reservation_type: "temporary",
      suggest_alternatives: true,
    });

    const response = await api.post<SeatReservationResponse>(
      `/seat-reservations`,
      {
        user_id: validUserId,
        screening_id: validScreeningId,
        seat_ids: validSeatIds,
        reservation_type: "temporary",
        suggest_alternatives: true,
      }
    );

    console.log("Phản hồi đặt ghế thành công:", {
      success: response.data.success,
      reservationId: response.data.reservationId,
      expiresAt: response.data.expiresAt,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error reserving seats:", error);

    // Log chi tiết lỗi từ server nếu có
    if (error.response?.data) {
      console.error("Server error details:", error.response.data);
    }

    if (error.response?.status === 400) {
      console.error("Bad Request Error:", {
        data: error.response?.data,
        message: error.response?.data?.message,
        config: error.config?.data,
      });

      // Kiểm tra lỗi cụ thể
      if (error.response?.data?.message?.includes("already reserved")) {
        throw new Error(
          "Ghế đã được đặt bởi người khác. Vui lòng chọn ghế khác."
        );
      }
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error("Có lỗi xảy ra khi đặt ghế. Vui lòng thử lại sau.");
  }
};

// Hàm lấy đề xuất ghế thay thế
export const getSeatSuggestions = async (
  screeningId: number,
  seatIds: number[],
  count: number,
  preferPairs: boolean = true
): Promise<SeatSuggestion[][]> => {
  try {
    const response = await api.post<{ suggestedGroups: SeatSuggestion[][] }>(
      `/seat-reservations/suggest-alternatives`,
      {
        screeningId,
        seatIds,
        count,
        preferPairs,
      }
    );
    return response.data.suggestedGroups || [];
  } catch (error: any) {
    console.error("Error getting seat suggestions:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error("Có lỗi xảy ra khi lấy đề xuất ghế");
  }
};

// Hàm hủy đặt ghế theo reservationId
export const cancelSeatReservations = async (
  reservationId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.delete<{ success: boolean; message?: string }>(
      `/seat-reservations/${reservationId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error canceling seat reservations:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw { success: false, message: "Có lỗi xảy ra khi hủy đặt ghế" };
  }
};

// Food and Drinks API
export interface FoodDrink {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: "food" | "drink" | "combo";
  is_available: boolean;
  stock_quantity?: number;
  createdAt: string;
  updatedAt: string;
}

export const getFoodAndDrinks = async (
  category?: "food" | "drink" | "combo"
): Promise<FoodDrink[]> => {
  try {
    let url = `/food-drinks`;
    if (category) {
      url += `?category=${category}`;
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching food and drinks:", error);
    throw error;
  }
};

export interface OrderItem {
  food_drink_id: number;
  quantity: number;
}

export interface OrderFoodDrinkData {
  ticket_id: number;
  items: OrderItem[];
}

export interface OrderFoodDrinkResponse {
  success: boolean;
  message: string;
  items: {
    id: number;
    ticket_id: number;
    food_drink_id: number;
    quantity: number;
    unit_price: number;
    status: "pending" | "ready" | "delivered" | "cancelled";
    createdAt: string;
    updatedAt: string;
  }[];
}

export const orderFoodDrinks = async (
  orderData: OrderFoodDrinkData
): Promise<OrderFoodDrinkResponse> => {
  try {
    const response = await api.post("/food-drinks/order", orderData);
    return response.data;
  } catch (error) {
    console.error("Error ordering food and drinks:", error);
    throw error;
  }
};

export interface TicketFoodDrinkItem {
  id: number;
  ticket_id: number;
  food_drink_id: number;
  quantity: number;
  unit_price: number;
  status: "pending" | "ready" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  foodDrink: FoodDrink;
}

export interface TicketFoodDrinkResponse {
  items: TicketFoodDrinkItem[];
  total: number;
}

export const getTicketFoodDrinks = async (
  ticketId: number
): Promise<TicketFoodDrinkResponse> => {
  try {
    const response = await api.get(`/food-drinks/ticket/${ticketId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket food and drinks:", error);
    throw error;
  }
};

// PayPal Payment API Functions
export interface CreatePayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export const createPayPalOrder = async (
  amount: number,
  description: string,
  returnUrl?: string,
  cancelUrl?: string,
  ticketIds?: number[],
  userId?: number,
  localeOptions?: {
    locale?: string;
    country_code?: string;
    currency?: string;
  }
): Promise<CreatePayPalOrderResponse> => {
  try {
    // Create a JSON string with ticket and user data for the webhook to use
    const customId = JSON.stringify({
      ticketIds,
      userId,
      amount,
      timestamp: new Date().toISOString(),
    });

    const response = await api.post("/payments/paypal/create-order", {
      amount,
      currency: localeOptions?.currency || "USD", // luôn truyền USD
      description,
      returnUrl,
      cancelUrl,
      custom_id: customId, // Add custom_id for webhook processing
      locale: localeOptions?.locale || "vi_VN",
      country_code: localeOptions?.country_code || "VN",
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating PayPal order:", error);
    throw {
      message:
        error.response?.data?.message ||
        "Có lỗi xảy ra khi tạo đơn hàng PayPal",
    };
  }
};

export const capturePayPalPayment = async (orderId: string): Promise<any> => {
  try {
    const response = await api.post("/payments/paypal/capture-payment", {
      orderId,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error capturing PayPal payment:", error);
    throw {
      message:
        error.response?.data?.message ||
        "Có lỗi xảy ra khi xử lý thanh toán PayPal",
    };
  }
};

export const getPayPalOrderDetails = async (orderId: string): Promise<any> => {
  try {
    const response = await api.get(
      `/payments/paypal/order-details?orderId=${orderId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error getting PayPal order details:", error);
    throw {
      message:
        error.response?.data?.message ||
        "Có lỗi xảy ra khi lấy thông tin đơn hàng PayPal",
    };
  }
};

// Interface cho lịch sử đặt vé
export interface TicketHistoryItem {
  id: number;
  ticket_id: number;
  action: string;
  details: string;
  created_by: number;
  createdAt: string;
  updatedAt: string;
  ticket: {
    id: number;
    user_id: number;
    screening_id: number;
    total_price: number;
    status: string;
    payment_status: string;
    createdAt: string;
    updatedAt: string;
    screening: {
      id: number;
      movie_id: number;
      theater_room_id: number;
      start_time: string;
      end_time: string;
      movie: {
        id: number;
        title: string;
        poster_path: string;
      };
      theaterRoom: {
        id: number;
        name: string;
        theater_id: number;
        theater: {
          id: number;
          name: string;
        };
      };
    };
    ticketSeats: {
      id: number;
      ticket_id: number;
      seat_id: number;
      price: number;
      seat: {
        id: number;
        theater_room_id: number;
        seat_row: string;
        seat_number: number;
        seat_type: string;
      };
    }[];
    ticketFoodDrinks: {
      id: number;
      ticket_id: number;
      food_drink_id: number;
      quantity: number;
      unit_price: number;
      total_price: number;
      status: string;
      foodDrink: {
        id: number;
        name: string;
        price: number;
        image_url: string;
        category: string;
      };
    }[];
  };
}

// Đánh giá phim
export const rateMovie = async (
  movieId: number,
  userId: number,
  rating: number,
  comment?: string
) => {
  const response = await api.post(`/movies/${movieId}/rate`, {
    user_id: userId,
    rating,
    comment,
  });
  console.log("check comment", response.data);
  return response.data;
};

export const getMovieAverageRating = async (movieId: number) => {
  const response = await api.get(`/movies/${movieId}/average-rating`);
  return response.data;
};

export const getMovieRatings = async (movieId: number) => {
  const response = await api.get(`/movies/${movieId}/ratings`);
  return response.data;
};

// Lấy danh sách phim gợi ý cá nhân hóa cho user (Wide&Deep)
export const getPersonalRecommendations = async (
  userId: number,
  topN: number = 10
) => {
  try {
    const response = await api.get(`/recommendations/widedeep`, {
      params: { userId, topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy gợi ý phim cá nhân.",
    };
  }
};

// Lấy danh sách phim mới ra rạp
export const getNewMovies = async (topN: number = 10) => {
  try {
    const response = await api.get(`/recommendations/new`, {
      params: { topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message: error?.response?.data?.message || "Không thể lấy phim mới.",
    };
  }
};

// Lấy gợi ý phim theo vị trí
export const getMoviesByLocation = async (
  location: string,
  topN: number = 10
) => {
  try {
    const response = await api.get(`/recommendations/by-location`, {
      params: { location, topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy gợi ý theo vị trí.",
    };
  }
};

// Lấy gợi ý phim theo thời tiết
export const getMoviesByWeather = async (
  location: string,
  topN: number = 10
) => {
  try {
    const response = await api.get(`/recommendations/by-weather`, {
      params: { location, topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy gợi ý theo thời tiết.",
    };
  }
};

// Lấy gợi ý phim theo ngày lễ
export const getMoviesByHoliday = async (topN: number = 10) => {
  try {
    const response = await api.get(`/recommendations/by-holiday`, {
      params: { topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy gợi ý theo ngày lễ.",
    };
  }
};

// Lấy gợi ý phim theo thời gian
export const getMoviesByTime = async (topN: number = 10) => {
  try {
    const response = await api.get(`/recommendations/by-time`, {
      params: { topN },
    });
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy gợi ý theo thời gian.",
    };
  }
};

// Lấy toàn bộ danh sách phim (dùng cho map poster_url)
export const getAllMovies = async () => {
  try {
    const response = await api.get("/movies");
    return response.data;
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message || "Không thể lấy danh sách phim.",
    };
  }
};

// Kết bạn
export const sendFriendRequest = async (friendId: number) => {
  const response = await api.post("/users/friends/request", { friendId });
  return response.data;
};

export const acceptFriendRequest = async (friendId: number) => {
  const response = await api.post("/users/friends/accept", { friendId });
  return response.data;
};

export const rejectFriendRequest = async (friendId: number) => {
  const response = await api.post("/users/friends/reject", { friendId });
  return response.data;
};

export const getFriends = async () => {
  const response = await api.get("/users/friends");
  return response.data;
};

export const getPendingFriendRequests = async () => {
  const response = await api.get("/users/friends/pending");
  return response.data;
};

export const searchUsers = async (query: string) => {
  const response = await api.get("/users/search", { params: { query } });
  return response.data;
};

export default api;
