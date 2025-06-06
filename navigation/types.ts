export type RootStackParamList = {
  Home: undefined;
  MovieDetail: { movieId: number };
  Login: undefined;
  CreateAccount: undefined;
  Verification: { email: string };
  VerificationSuccess: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Security: undefined;
  Language: undefined;
  Booking: { movieId: number; date?: string };
  SelectSeats: {
    screeningId: number;
    movieTitle: string;
    date: string;
    time: string;
  };
  FoodDrink: {
    screeningId: number;
    selectedSeats: number[];
    seatPrices: number[];
    movieTitle: string;
    date: string;
    time: string;
  };
  Checkout: {
    screeningId: number;
    selectedSeats: number[];
    seatPrices: number[];
    foodDrinks?: Array<{ food_drink_id: number; quantity: number }>;
    movieTitle: string;
    date: string;
    time: string;
    totalPrice: number;
  };
  PayPalPayment: {
    amount: number;
    ticketIds: number[];
    description: string;
  };
  MyTicket: undefined;
  TicketDetail: { ticketId: number };
  TicketHistory: undefined;
  Notification: undefined;
  Message: undefined;
  MessageHome: undefined;
  MessageDetail: { name: string; avatar: string; friendId: number };
  MyFavorite: undefined;
  Search: undefined;
  Cinemas: undefined;
  CinemasMap: undefined;
  BoxOffice: undefined;
  VideoCallScreen: {
    friendId: number;
    name: string;
    avatar: string;
    isCallerFlag?: boolean;
  };
};

export type MessageStackParamList = {
  MessageHome: undefined;
  MessageDetail: { name: string; avatar: string; friendId: number };
  VideoCallScreen: {
    friendId: number;
    name: string;
    avatar: string;
    isCallerFlag?: boolean;
  };
};
