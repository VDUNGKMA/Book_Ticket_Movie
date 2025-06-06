import { FunctionComponent } from "react";

export interface Movie {
  id: number;
  movie_id?: number;
  title: string;
  description?: string;
  duration: number;
  release_date: string; // ISO string khi truyền qua API
  age_restriction?: number;
  director?: string;
  cast?: string; // Nếu backend trả về dạng JSON string[] thì để string[], còn TEXT thì để string
  poster_url?: string;
  trailer_url?: string;
  popularity?: number;
  rating?: number;
  genres?: Genre[]; // Nếu API trả về mảng thể loại, cần định nghĩa thêm interface Genre
  screenings?: Screening[]; // Nếu API trả về các suất chiếu, cần định nghĩa thêm interface Screening
}

export interface Genre {
  id: number;
  name: string;
}

export interface Screening {
  id: number;
  movie_id: number;
  cinema_id: number;
  date: string;
  time: string;
}

export type RootStackParamList = {
  HomeScreen: undefined;
  Home:
    | {
        screen?: string;
        params?: any;
      }
    | undefined;
  Auth:
    | {
        screen?: string;
        params?: any;
      }
    | undefined;
  Login:
    | {
        redirectParams?: {
          screen: keyof RootStackParamList;
          params: any;
        };
      }
    | undefined;
  CreateAccount: undefined;
  MovieList:
    | {
        type?: string;
      }
    | undefined;
  Booking: { movieId: string; movieName: string };
  Settings: undefined;
  SettingsHome: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Verification: undefined;
  Language: undefined;
  VerificationSuccess: undefined;
  Security: undefined;
  Notifications: undefined;
  Search: undefined;
  SearchMain: undefined;
  Cinemas: undefined;
  CinemasMap: undefined;
  CinemasList: undefined;
  // MovieDetail: { movieTitle: string };
  MovieDetail: { movieId: number };
  Favorite: undefined;
  SelectSeatsScreen: {
    screeningId: string;
    movieId: string;
    movieName: string;
    date: string;
    roomName: string;
    time: string;
    cinemaName: string;
    theaterRoomId: number;
    screeningPrice: number;
    fromPaymentSuccess?: boolean;
  };
  Checkout: {
    movieTitle: string;
    ticketCount: number;
    date: string;
    time: string;
    price: number;
  };
  CheckoutScreen: {
    movieTitle: string;
    ticketCount: number;
    date: string;
    time: string;
    price: number;
    screeningId: number;
    seatIds: number[];
    selectedSeatsText: string;
    cinemaName: string;
    reservationId?: string;
    expiresAt?: string;
    movieId: string;
    foodDrinks?: any[];
    foodDrinkTotal?: number;
  };
  FoodDrinkScreen: {
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
  MyTicket: {
    fromPaymentSuccess?: boolean;
  };
  MyTicketHome: undefined;
  TicketDetail: {
    ticketId: number;
  };
  PayPalPaymentScreen: {
    amount: number;
    description: string;
    ticketIds: number[];
  };
  Message: undefined;
  MessageHome: undefined;
  MessageDetail: {
    name: string;
    avatar: string;
    friendId: number;
  };
  MovieDetailScreen: { movieId: string };
  BoxOfficeScreen: undefined;
  SearchScreen: undefined;
  LoginScreen: undefined;
  CreateAccountScreen: undefined;
  MyTicketsScreen: undefined;
  Profile:
    | {
        screen?: keyof RootStackParamList;
        params?: any;
      }
    | undefined;
  UserProfile: undefined;
  EditProfileScreen: undefined;
  Recommendation: undefined;
  ChatSuggest: undefined;
  GroupRecommendation: undefined;
  InviteHistory: undefined;
};
