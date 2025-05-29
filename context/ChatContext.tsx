import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUserContext } from "./UserContext";
import { BASE_URL } from "../config/config";
import * as SecureStore from "expo-secure-store";
import { View, Text } from "react-native";

export interface ChatMessage {
  id: string;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  replyToMessage?: ChatMessage | null;
  avatar?: string;
}

interface ChatContextType {
  socket: Socket | null;
  messages: ChatMessage[];
  sendMessage: (
    receiverId: number,
    content: string,
    replyToMessageId?: number
  ) => void;
  fetchHistory: (friendId: number) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onlineFriends: number[];
  setOnlineFriends: React.Dispatch<React.SetStateAction<number[]>>;
  onFriendRequest?: (data: any) => void;
  sendCallRequest?: (receiverId: number) => void;
  sendCallAccept?: (receiverId: number) => void;
  sendCallReject?: (receiverId: number) => void;
  sendSignal?: (receiverId: number, signal: any) => void;
  onCallRequest?: (cb: (data: any) => void) => void;
  onCallAccept?: (cb: (data: any) => void) => void;
  onCallReject?: (cb: (data: any) => void) => void;
  onSignal?: (cb: (data: any) => void) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUserContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [onlineFriends, setOnlineFriends] = useState<number[]>([]);
  const [autoTestResult, setAutoTestResult] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    // Hàm async để lấy JWT và kết nối socket
    const connectSocket = async () => {
      let token: string = String(user.id);
      try {
        const jwt = await SecureStore.getItemAsync("access_token");
        if (jwt) token = jwt;
      } catch (e) {
        // fallback dùng user.id nếu không lấy được JWT
      }
      const socket = io(`${BASE_URL}/chat`, {
        query: { token },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("private_message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, mapMessage(msg)]);
      });
      socket.on("message_history", (history: ChatMessage[]) => {
        setMessages(history.map(mapMessage));
      });
      socket.on("friend_online", ({ userId }) => {
        setOnlineFriends((prev) =>
          prev.includes(userId) ? prev : [...prev, userId]
        );
      });
      socket.on("friend_offline", ({ userId }) => {
        setOnlineFriends((prev) => prev.filter((id) => id !== userId));
      });
      socket.on("friend_accepted", (data) => {
        if (typeof window !== "undefined" && (window as any).onFriendAccepted) {
          (window as any).onFriendAccepted(data);
        }
      });
      socket.on("friend_request", (data) => {
        console.log("✅ [AUTO TEST] Nhận event friend_request:", data);
        if (data && data.from && data.from.id) {
          setAutoTestResult("PASS");
        } else {
          setAutoTestResult("FAIL");
        }
        if (typeof window !== "undefined" && (window as any).onFriendRequest) {
          (window as any).onFriendRequest(data);
        }
      });
      socket.on("friend_rejected", (data) => {
        console.log("[AUTO TEST] Nhận event friend_rejected:", data);
        // Nếu muốn hiện toast, có thể tích hợp react-native-toast-message ở đây
      });
      // --- Video call signaling ---
      socket.on("call_request", (data) => {
        if (callRequestCb.current) callRequestCb.current(data);
      });
      socket.on("call_accept", (data) => {
        if (callAcceptCb.current) callAcceptCb.current(data);
      });
      socket.on("call_reject", (data) => {
        if (callRejectCb.current) callRejectCb.current(data);
      });
      socket.on("signaling", (data) => {
        if (signalCb.current) signalCb.current(data);
      });
    };
    connectSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const sendMessage = (
    receiverId: number,
    content: string,
    replyToMessageId?: number
  ) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("private_message", {
      senderId: user.id,
      receiverId,
      content,
      replyToMessageId,
    });
  };

  const fetchHistory = (friendId: number) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("message_history", {
      userId: user.id,
      friendId,
    });
  };

  // --- Video call signaling logic ---
  const callRequestCb = useRef<((data: any) => void) | null>(null);
  const callAcceptCb = useRef<((data: any) => void) | null>(null);
  const callRejectCb = useRef<((data: any) => void) | null>(null);
  const signalCb = useRef<((data: any) => void) | null>(null);

  const sendCallRequest = (receiverId: number) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("call_request", { senderId: user.id, receiverId });
  };
  const sendCallAccept = (receiverId: number) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("call_accept", { senderId: user.id, receiverId });
  };
  const sendCallReject = (receiverId: number) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("call_reject", { senderId: user.id, receiverId });
  };
  const sendSignal = (receiverId: number, signal: any) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("signaling", {
      senderId: user.id,
      receiverId,
      signal,
    });
  };
  const onCallRequest = (cb: (data: any) => void) => {
    callRequestCb.current = cb;
  };
  const onCallAccept = (cb: (data: any) => void) => {
    callAcceptCb.current = cb;
  };
  const onCallReject = (cb: (data: any) => void) => {
    callRejectCb.current = cb;
  };
  const onSignal = (cb: (data: any) => void) => {
    signalCb.current = cb;
  };

  return (
    <ChatContext.Provider
      value={{
        socket: socketRef.current,
        messages,
        sendMessage,
        fetchHistory,
        setMessages,
        onlineFriends,
        setOnlineFriends,
        sendCallRequest,
        sendCallAccept,
        sendCallReject,
        sendSignal,
        onCallRequest,
        onCallAccept,
        onCallReject,
        onSignal,
      }}
    >
      {autoTestResult && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "#fff",
            padding: 8,
            zIndex: 9999,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: autoTestResult === "PASS" ? "green" : "red",
              fontWeight: "bold",
            }}
          >
            {autoTestResult === "PASS" ? "Realtime OK" : "Realtime FAIL"}
          </Text>
        </View>
      )}
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};

// Hàm chuyển snake_case sang camelCase cho message
function mapMessage(msg: any): ChatMessage {
  return {
    ...msg,
    senderId: msg.senderId ?? msg.sender_id,
    receiverId: msg.receiverId ?? msg.receiver_id,
    createdAt: msg.createdAt ?? msg.created_at,
    imageUrl: msg.imageUrl ?? msg.image_url,
    fileUrl: msg.fileUrl ?? msg.file_url,
    fileName: msg.fileName ?? msg.file_name,
    replyToMessage: msg.replyToMessage ?? msg.reply_to_message,
    avatar: msg.avatar ?? msg.avatar_url,
  };
}
