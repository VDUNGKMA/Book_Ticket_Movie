import React from "react";
import { Modal, View, Text, Image, TouchableOpacity } from "react-native";
import { useChatContext } from "../context/ChatContext";
import { useUserContext } from "../context/UserContext";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MessageStackParamList } from "../navigation/types";

const IncomingCallModal: React.FC = () => {
  const {
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    socket,
    setIncomingCall,
    isInCall,
    setIsInCall,
  } = useChatContext();
  const { user } = useUserContext();
  const navigation = useNavigation<any>();
  const routes = useNavigationState((state) => (state ? state.routes : []));

  React.useEffect(() => {
    // Khi popup hiện, join room userId để đảm bảo nhận signaling
    if (incomingCall && socket && user) {
      socket.emit("join", { userId: user.id });
      // console.log("[WebRTC][POPUP] Emit join room for callee", user.id);
    }
    // console.log("[FRONTEND] incomingCall state:", incomingCall);
  }, [incomingCall, socket, user]);

  // Không hiển thị popup nếu không có cuộc gọi đến hoặc người dùng đang trong cuộc gọi
  if (!incomingCall || isInCall) return null;
  const handleAccept = async () => {
    console.log(
      "[WebRTC][INCOMING MODAL] Accept pressed, sẽ chuyển sang VideoCallScreen với isCallerFlag: false",
      incomingCall
    );
    if (setIsInCall) await setIsInCall(true);
    if (socket && user && incomingCall) {
      socket.emit("request_offer", {
        from: user.id,
        to: incomingCall.senderId,
      });
    }
    acceptIncomingCall && acceptIncomingCall();
    setIncomingCall && setIncomingCall(null);
    try {
      const isOnVideoCallScreen = routes.some(
        (r: any) => r.name === "VideoCallScreen"
      );
      if (!isOnVideoCallScreen) {
        navigation.navigate("Message", {
          screen: "VideoCallScreen",
          params: {
            friendId: incomingCall.senderId,
            name: incomingCall.senderName,
            avatar: incomingCall.senderAvatar || "",
            isCallerFlag: false,
          },
        });
      }
    } catch (e) {
      if (setIsInCall) await setIsInCall(false);
      console.log("[WebRTC][CALL] Navigation error, reset isInCall", e);
    }
  };
  const handleReject = async () => {
    if (setIsInCall) await setIsInCall(false);
    rejectIncomingCall && rejectIncomingCall();
    setIncomingCall && setIncomingCall(null);
  };
  return (
    <Modal visible transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            width: 300,
          }}
        >
          <Image
            source={
              incomingCall.senderAvatar
                ? { uri: incomingCall.senderAvatar }
                : require("../assets/default-avatar.png")
            }
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              marginBottom: 16,
            }}
          />
          <Text style={{ fontWeight: "bold", fontSize: 20, marginBottom: 8 }}>
            {incomingCall.senderName}
          </Text>
          <Text style={{ color: "#888", marginBottom: 16 }}>
            {incomingCall.type === "audio"
              ? "Cuộc gọi thoại đến..."
              : "Cuộc gọi video đến..."}
          </Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <TouchableOpacity
              onPress={handleAccept}
              style={{
                backgroundColor: "#0f0",
                borderRadius: 30,
                padding: 16,
                marginRight: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Chấp nhận
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReject}
              style={{ backgroundColor: "#f00", borderRadius: 30, padding: 16 }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default IncomingCallModal;
