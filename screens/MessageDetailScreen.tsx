import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MessageStackParamList } from "../navigation/types";
import { useChatContext } from "../context/ChatContext";
import { useUserContext } from "../context/UserContext";
import { BASE_URL } from "../config/config";

// Định nghĩa kiểu cho params
interface MessageDetailParams {
  name: string;
  avatar: string;
  friendId: number;
}

const MessageDetailScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<MessageStackParamList>>();
  const route = useRoute();
  const { name, avatar, friendId } = route.params as MessageDetailParams;
  const { user } = useUserContext();
  const {
    messages: chatMessages,
    sendMessage,
    fetchHistory,
    setMessages,
  } = useChatContext();
  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (friendId && user) {
      fetchHistory(friendId);
    }
    return () => setMessages([]);
  }, [user, friendId]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSendMessage = () => {
    if (messageInput.trim() && friendId) {
      sendMessage(friendId, messageInput, replyTo?.id);
      setMessageInput("");
      setReplyTo(null);
    }
  };

  const handleReply = (msg: any) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      senderName: msg.senderId === user?.id ? "Bạn" : name,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Tìm index của tin nhắn theo id
  const findMsgIndexById = (id: string) =>
    chatMessages.findIndex((m) => m.id === id);

  // Khi nhấn vào đoạn trích reply, cuộn tới tin nhắn gốc và highlight
  const handleReplySnippetPress = (replyMsgId: string) => {
    const idx = findMsgIndexById(replyMsgId);
    if (idx !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true });
      setHighlightedMsgId(replyMsgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  const renderReplySnippet = (msg: any) => {
    if (!msg.replyToMessage) return null;
    const reply = msg.replyToMessage;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleReplySnippetPress(reply.id)}
        style={{ marginBottom: 4 }}
      >
        <View
          style={{
            backgroundColor: "#23272b",
            borderLeftWidth: 4,
            borderLeftColor: "#FF4444",
            borderRadius: 6,
            padding: 6,
          }}
        >
          <Text style={{ color: "#FF4444", fontSize: 12, fontWeight: "bold" }}>
            {reply.senderId === user?.id ? "Bạn" : name}
          </Text>
          <Text style={{ color: "#fff", fontSize: 12 }} numberOfLines={1}>
            {reply.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (flatListRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <SafeAreaView style={styles.container}>
        {/* Thanh trên cùng */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image source={{ uri: avatar }} style={styles.headerAvatar} />
            <Text style={styles.headerTitle}>{name}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("VideoCallScreen", {
                friendId,
                name,
                avatar,
                isCallerFlag: true,
              })
            }
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Danh sách tin nhắn */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(msg, index) => msg.id || String(index)}
          renderItem={({ item: msg, index }) => {
            const isMe = Number(msg.senderId) === Number(user?.id);
            // console.log("msg.avatar:", msg.avatar);
            let avatarUrl = isMe
              ? user && (user as any).avatar
                ? (user as any).avatar
                : null
              : msg.avatar
              ? msg.avatar.startsWith("http")
                ? msg.avatar
                : `${BASE_URL}/${msg.avatar.replace(/\\/g, "/")}`
              : avatar || null;
            // console.log("avatarUrl used:", avatarUrl);
            return (
              <View
                style={{
                  flexDirection: isMe ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  marginVertical: 2,
                }}
              >
                {/* Avatar */}
                <Image
                  source={
                    avatarUrl
                      ? { uri: avatarUrl }
                      : require("../assets/default-avatar.png")
                  }
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    marginHorizontal: 6,
                    backgroundColor: "#444",
                  }}
                />
                <TouchableOpacity
                  onLongPress={() => handleReply(msg)}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.sentBubble : styles.receivedBubble,
                      highlightedMsgId === msg.id && {
                        borderWidth: 2,
                        borderColor: "#FFD700",
                        backgroundColor: "#333",
                      },
                      { alignSelf: isMe ? "flex-end" : "flex-start" },
                    ]}
                  >
                    {/* Hiển thị đoạn trích reply nếu có */}
                    {msg.replyToMessage && renderReplySnippet(msg)}
                    {msg.imageUrl && (
                      <Image
                        source={{ uri: msg.imageUrl }}
                        style={styles.messageImage}
                      />
                    )}
                    <Text style={styles.messageText}>{msg.content}</Text>
                    {/* Hiển thị thông tin phim, suất chiếu, phòng chiếu nếu là invite */}
                    {(msg.type === "invite" ||
                      msg.movie_title ||
                      msg.movie_poster) && (
                      <View style={{ marginTop: 8, alignItems: "flex-start" }}>
                        {msg.movie_poster && (
                          <Image
                            source={{
                              uri: msg.movie_poster.startsWith("http")
                                ? msg.movie_poster
                                : `${BASE_URL}${msg.movie_poster}`,
                            }}
                            style={{
                              width: 80,
                              height: 120,
                              borderRadius: 8,
                              marginBottom: 4,
                            }}
                          />
                        )}
                        {msg.movie_title && (
                          <Text
                            style={{ color: "#FFD700", fontWeight: "bold" }}
                          >
                            {msg.movie_title}
                          </Text>
                        )}
                        {msg.theater_name && (
                          <Text style={{ color: "#fff" }}>
                            Rạp: {msg.theater_name}
                          </Text>
                        )}
                        {msg.screening_time && (
                          <Text style={{ color: "#fff" }}>
                            Suất chiếu:{" "}
                            {new Date(msg.screening_time).toLocaleString(
                              "vi-VN"
                            )}
                          </Text>
                        )}
                        {msg.room_name && (
                          <Text style={{ color: "#fff" }}>
                            Phòng chiếu: {msg.room_name}
                          </Text>
                        )}
                      </View>
                    )}
                    <Text style={styles.messageTime}>{msg.createdAt}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: 15 }}
          initialNumToRender={20}
          onScrollToIndexFailed={() => {}}
        />

        {/* Ô nhập tin nhắn */}
        <View style={styles.inputContainer}>
          {/* Nếu đang reply thì hiển thị đoạn trích phía trên input */}
          {replyTo && (
            <View
              style={{
                backgroundColor: "#333",
                borderRadius: 6,
                padding: 6,
                marginBottom: 4,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#FF4444", fontWeight: "bold", marginRight: 6 }}
              >
                Trả lời {replyTo.senderName}:
              </Text>
              <Text style={{ color: "#fff", flex: 1 }} numberOfLines={1}>
                {replyTo.content}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyTo(null)}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Type message..."
              placeholderTextColor="#888"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  messageContainer: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: "70%",
  },
  sentBubble: {
    backgroundColor: "#FF4444",
    alignSelf: "flex-end",
    borderTopRightRadius: 0,
  },
  receivedBubble: {
    backgroundColor: "#2C3539",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
  messageImage: {
    width: 200,
    height: 100,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageText: {
    color: "#fff",
    fontSize: 14,
  },
  messageTime: {
    color: "#888",
    fontSize: 12,
    textAlign: "right",
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: "column",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#2C3539",
    backgroundColor: "#1C2526",
  },
  input: {
    flex: 1,
    backgroundColor: "#2C3539",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#fff",
    marginRight: 8,
    marginBottom: 0,
  },
  sendButton: {
    backgroundColor: "#FF4444",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
});

export default MessageDetailScreen;
