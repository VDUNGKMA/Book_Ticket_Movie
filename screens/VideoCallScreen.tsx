import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useChatContext } from "../context/ChatContext";
import { useUserContext } from "../context/UserContext";
import {
  mediaDevices,
  RTCView,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from "react-native-webrtc";
import { RootStackParamList } from "../navigation/types";

interface VideoCallParams {
  friendId: number;
  name: string;
  avatar: string;
  isCaller?: boolean;
  isCallerFlag: boolean;
}

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCallScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  // console.log("[WebRTC][ROUTE PARAMS]", route.params);
  const { friendId, name, avatar, isCaller, isCallerFlag } =
    route.params as VideoCallParams;
  const isCallerValue = isCaller !== undefined ? isCaller : isCallerFlag;
  const isCallerRef = React.useRef<boolean>(!!isCallerValue);
  const { user } = useUserContext();
  // console.log("[WebRTC][USER]", user);
  const {
    sendCallRequest,
    sendCallAccept,
    sendCallReject,
    sendSignal,
    socket,
    isInCall,
    setIsInCall,
  } = useChatContext();
  const [callStatus, setCallStatus] = React.useState<
    "calling" | "accepted" | "rejected" | "ended"
  >("calling");
  const [localStream, setLocalStream] = React.useState<any>(null);
  const [remoteStream, setRemoteStream] = React.useState<any>(null);
  const peerRef = React.useRef<any>(null);
  const [isMicOn, setIsMicOn] = React.useState(true);
  const [isCameraOn, setIsCameraOn] = React.useState(true);

  // Thêm state để theo dõi trạng thái kết nối
  const [connectionState, setConnectionState] = React.useState<string>("new");
  const [iceConnectionState, setIceConnectionState] =
    React.useState<string>("new");

  // Queue để lưu ICE candidates trước khi remote description được set
  const iceCandidatesQueue = React.useRef<any[]>([]);
  const hasRemoteDescription = React.useRef<boolean>(false);

  React.useEffect(() => {
    (async () => {
      if (setIsInCall) await setIsInCall(true);
    })();
    return () => {
      (async () => {
        if (setIsInCall) await setIsInCall(false);
      })();
    };
  }, []);

  React.useEffect(() => {
    // Khi vào màn hình và là người gọi, gửi request gọi
    if (sendCallRequest && friendId && isCallerRef.current) {
      // console.log("[WebRTC] Sending call request as caller");
      sendCallRequest(friendId);
    }
    // Lắng nghe accept/reject
    if (!socket) return;
    const onAccept = (data: any) => {
      if (data.senderId === friendId) {
        console.log("[WebRTC] Call accepted by", friendId);
        setCallStatus("accepted");
      }
    };
    const onReject = (data: any) => {
      if (data.senderId === friendId) {
        // console.log("[WebRTC] Call rejected by", friendId);
        setCallStatus("rejected");
        setTimeout(() => navigation.goBack(), 1500);
      }
    };
    socket.on && socket.on("call_accept", onAccept);
    socket.on && socket.on("call_reject", onReject);
    return () => {
      socket.off && socket.off("call_accept", onAccept);
      socket.off && socket.off("call_reject", onReject);
    };
  }, [socket, friendId]);

  // Lấy local stream với cấu hình tối ưu
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // console.log("[WebRTC] Requesting user media...");
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            frameRate: { min: 15, ideal: 24, max: 30 },
            facingMode: "user",
          },
        } as any);

        // console.log(
        //   "[WebRTC] Got local stream with tracks:",
        //   stream
        //     .getTracks()
        //     .map((t) => ({ kind: t.kind, id: t.id, enabled: t.enabled }))
        // );

        // Đảm bảo tất cả tracks được bật
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          // console.log(
          //   `[WebRTC] ${track.kind} track enabled:`,
          //   track.enabled,
          //   track.id
          // );
        });

        if (isMounted) {
          setLocalStream(stream);
        }
      } catch (e) {
        console.error("[WebRTC] Error getting user media:", e);
      }
    })();

    return () => {
      isMounted = false;
      if (localStream) {
        // console.log("[WebRTC] Stopping local tracks...");
        // localStream.getTracks().forEach((track: any) => {
        //   track.stop();
        //   console.log("[WebRTC] Stopped track:", track.kind, track.id);
        // });
      }
    };
  }, []);

  // Setup peer connection với xử lý cải thiện
  React.useEffect(() => {
    if (!localStream || !socket || !user) return;

    // Cleanup peer cũ nếu còn
    if (peerRef.current) {
      console.log(
        "[WebRTC][PEER] Đã có peer cũ, sẽ cleanup trước khi tạo peer mới"
      );
      try {
        peerRef.current.close();
      } catch (e) {}
      peerRef.current = null;
    }
    console.log(
      "[WebRTC][PEER] Tạo peer mới, signalingState:",
      localStream.signalingState,
      "ice:",
      localStream.iceConnectionState
    );
    const peer = new RTCPeerConnection(configuration);
    peerRef.current = peer;

    // Thêm tất cả local tracks vào peer connection
    localStream.getTracks().forEach((track: any) => {
      try {
        const sender = peer.addTrack(track, localStream);
        console.log("[WebRTC][PEER] Track added:", track.kind, track.id);
      } catch (error) {
        console.error(
          `[WebRTC][PEER] Error adding ${track.kind} track:`,
          error
        );
      }
    });

    (peer as any).ontrack = (event: any) => {
      console.log("[WebRTC][PEER] ontrack event:", event);
      if (event.streams && event.streams[0]) {
        const remoteStreamReceived = event.streams[0];
        console.log("[WebRTC] Remote stream received:", {
          id: remoteStreamReceived.id,
          tracks: remoteStreamReceived
            .getTracks()
            .map((t: any) => ({ kind: t.kind, id: t.id, enabled: t.enabled })),
        });
        remoteStreamReceived.getTracks().forEach((track: any) => {
          track.enabled = true;
        });
        setRemoteStream(remoteStreamReceived);
      } else if (event.track) {
        const newStream = new MediaStream([event.track]);
        event.track.enabled = true;
        setRemoteStream(newStream);
      }
    };

    (peer as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log("[WebRTC][PEER] onicecandidate:", event.candidate);
        if (sendSignal) {
          sendSignal(friendId, {
            type: "candidate",
            candidate: event.candidate,
          });
        }
      } else {
        console.log("[WebRTC][PEER] ICE gathering completed");
      }
    };

    (peer as any).onconnectionstatechange = () => {
      console.log("[WebRTC][PEER] Connection state:", peer.connectionState);
      setConnectionState(peer.connectionState);
      if (peer.connectionState === "connected") {
        setCallStatus("accepted");
      } else if (peer.connectionState === "failed") {
        peer.restartIce();
      }
    };

    (peer as any).oniceconnectionstatechange = () => {
      console.log(
        "[WebRTC][PEER] ICE connection state:",
        peer.iceConnectionState
      );
      setIceConnectionState(peer.iceConnectionState);
      if (
        peer.iceConnectionState === "connected" ||
        peer.iceConnectionState === "completed"
      ) {
        setCallStatus("accepted");
      }
    };

    (peer as any).onsignalingstatechange = () => {
      console.log("[WebRTC][PEER] Signaling state:", peer.signalingState);
    };

    if (isCallerRef.current) {
      setTimeout(() => {
        createAndSendOffer(peer);
      }, 1000);
    }

    const handleSignal = async (data: any) => {
      console.log("[WebRTC] handleSignal:", {
        type: data.signal?.type,
        isCallerRef: isCallerRef.current,
        routeParams: route.params,
      });
      if (data.from !== friendId && data.senderId !== friendId) return;
      const signal = data.signal || data;
      const { type, offer, answer, candidate } = signal;
      try {
        if (type === "offer" && !isCallerRef.current) {
          console.log("[WebRTC] Nhận offer từ caller, chuẩn bị tạo answer...");
          console.log(
            "[WebRTC][PEER] Trước setRemoteDescription, signalingState:",
            peer.signalingState
          );
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          hasRemoteDescription.current = true;
          console.log(
            "[WebRTC] Đã setRemoteDescription với offer, signalingState:",
            peer.signalingState
          );
          while (iceCandidatesQueue.current.length > 0) {
            const queuedCandidate = iceCandidatesQueue.current.shift();
            try {
              await peer.addIceCandidate(new RTCIceCandidate(queuedCandidate));
              console.log("[WebRTC] Đã add queued ICE candidate");
            } catch (err) {
              console.error("[WebRTC] Lỗi add queued ICE candidate:", err);
            }
          }
          const answerObj = await peer.createAnswer();
          await peer.setLocalDescription(new RTCSessionDescription(answerObj));
          console.log(
            "[WebRTC] Đã tạo và setLocalDescription answer, gửi answer về caller..."
          );
          if (sendSignal) {
            sendSignal(friendId, {
              type: "answer",
              answer: answerObj,
            });
            console.log("[WebRTC] Đã gửi answer về caller");
          }
        } else if (type === "answer" && isCallerRef.current) {
          console.log(
            "[WebRTC][PEER] Nhận answer, signalingState:",
            peer.signalingState
          );
          if (peer.signalingState === "have-local-offer") {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            hasRemoteDescription.current = true;
            while (iceCandidatesQueue.current.length > 0) {
              const queuedCandidate = iceCandidatesQueue.current.shift();
              try {
                await peer.addIceCandidate(
                  new RTCIceCandidate(queuedCandidate)
                );
                console.log("[WebRTC] Added queued ICE candidate");
              } catch (err) {
                console.error(
                  "[WebRTC] Error adding queued ICE candidate:",
                  err
                );
              }
            }
          } else {
            console.log(
              "[WebRTC][PEER] Unexpected signaling state for answer:",
              peer.signalingState
            );
          }
        } else if (type === "candidate" && candidate) {
          console.log("[WebRTC][PEER] Nhận candidate:", candidate);
          if (!hasRemoteDescription.current) {
            console.log(
              "[WebRTC][PEER] Queue ICE candidate (no remote description yet)"
            );
            iceCandidatesQueue.current.push(candidate);
          } else {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("[WebRTC][PEER] Added ICE candidate successfully");
            } catch (err) {
              console.error("[WebRTC][PEER] Error adding ICE candidate:", err);
            }
          }
        }
      } catch (error) {
        console.error("[WebRTC][PEER] Error processing signaling:", error);
      }
    };

    socket.on("signaling", handleSignal);
    return () => {
      socket.off("signaling", handleSignal);
    };
  }, [localStream, socket, friendId, user]);

  // Hàm tạo và gửi offer với xử lý cải thiện
  const createAndSendOffer = async (peer: RTCPeerConnection) => {
    try {
      // console.log("[WebRTC] Creating offer...");

      // FIX: Đảm bảo peer connection ở trạng thái đúng
      if (peer.signalingState !== "stable") {
        // console.log(
        //   "[WebRTC] Warning: Peer not in stable state when creating offer:",
        //   peer.signalingState
        // );
      }

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peer.setLocalDescription(new RTCSessionDescription(offer));

      // console.log("[WebRTC] Sending offer with local description set");
      if (sendSignal && user) {
        sendSignal(friendId, {
          type: "offer",
          offer: offer,
          callerName: user.name,
          callerAvatar: user.image,
          isAudio: false,
          callerId: user.id,
        });
      }
    } catch (error) {
      // console.error("[WebRTC] Error creating/sending offer:", error);
    }
  };

  // Xử lý request_offer
  React.useEffect(() => {
    if (!socket || !isCallerRef.current) return;

    const handleRequestOffer = (data: any) => {
      if (data.from === friendId && user && peerRef.current) {
        // console.log("[WebRTC] Received request_offer, resending offer...");
        createAndSendOffer(peerRef.current);
      }
    };

    socket.on("request_offer", handleRequestOffer);
    return () => {
      socket.off("request_offer", handleRequestOffer);
    };
  }, [socket, friendId, user]);

  // Hàm cleanup peer và stream triệt để
  const cleanupCall = React.useCallback(() => {
    console.log(
      "[WebRTC][CLEANUP] Đang cleanup peer, localStream, remoteStream..."
    );
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (e) {
        console.log("[WebRTC][CLEANUP] Lỗi khi close peer:", e);
      }
      peerRef.current = null;
    }
    if (localStream) {
      try {
        localStream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {
        console.log("[WebRTC][CLEANUP] Lỗi khi stop localStream:", e);
      }
      setLocalStream(null);
    }
    if (remoteStream) {
      try {
        remoteStream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {
        console.log("[WebRTC][CLEANUP] Lỗi khi stop remoteStream:", e);
      }
      setRemoteStream(null);
    }
    setCallStatus("ended");
  }, [localStream, remoteStream]);

  // Cleanup khi nhận call_end
  React.useEffect(() => {
    if (!socket || !friendId) return;
    const onCallEnd = (data: any) => {
      if (data.from === friendId || data.senderId === friendId) {
        console.log("[WebRTC] Nhận signal call_end, sẽ đóng giao diện gọi");
        cleanupCall();
        setTimeout(() => {
          if (navigation.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.reset &&
              navigation.reset({
                index: 0,
                routes: [{ name: "Message" } as any],
              });
          }
        }, 1000);
      }
    };
    socket.on("call_end", onCallEnd);
    return () => {
      socket.off("call_end", onCallEnd);
    };
  }, [socket, friendId, cleanupCall, navigation]);

  // Cleanup khi bấm kết thúc
  const handleEndCall = () => {
    if (socket && friendId && user) {
      socket.emit("call_end", { to: friendId, from: user.id });
    }
    cleanupCall();
    setTimeout(() => {
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset &&
          navigation.reset({
            index: 0,
            routes: [{ name: "Message" } as any],
          });
      }
    }, 1000);
  };

  // Toggle mic
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track: any) => {
        track.enabled = !track.enabled;
        // console.log("[WebRTC] Audio track toggled:", track.enabled);
      });
      setIsMicOn((prev) => !prev);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track: any) => {
        track.enabled = !track.enabled;
        // console.log("[WebRTC] Video track toggled:", track.enabled);
      });
      setIsCameraOn((prev) => !prev);
    }
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        if (typeof track._switchCamera === "function") {
          track._switchCamera();
        }
      });
    }
  };

  const callStatusText =
    callStatus === "calling"
      ? "Đang kết nối..."
      : callStatus === "accepted"
      ? `Đang gọi video... (${connectionState}/${iceConnectionState})`
      : callStatus === "rejected"
      ? "Đối phương đã từ chối"
      : callStatus === "ended"
      ? "Đã kết thúc cuộc gọi"
      : "";

  // Cleanup khi unmount component
  React.useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // Join lại room userId khi vào màn hình để đảm bảo nhận signaling
  React.useEffect(() => {
    if (socket && user) {
      socket.emit("join", { userId: user.id });
      console.log("[WebRTC] Đã join lại room userId:", user.id);
    }
  }, [socket, user]);

  return (
    <SafeAreaView style={stylesZalo.container}>
      {/* Remote video full screen */}
      {remoteStream ? (
        <RTCView
          key={`remote-${remoteStream.id}`}
          streamURL={remoteStream.toURL()}
          style={[stylesZalo.remoteVideo, { backgroundColor: "#000" }]}
          objectFit="cover"
          zOrder={0}
          mirror={false}
        />
      ) : (
        <View
          style={[
            stylesZalo.remoteVideo,
            {
              backgroundColor: "#000",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
            Đang chờ kết nối video...
          </Text>
          <Text
            style={{
              color: "#aaa",
              textAlign: "center",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Connection: {connectionState} | ICE: {iceConnectionState}
          </Text>
          {/* FIX: Thêm thông tin debug */}
          <Text
            style={{
              color: "#aaa",
              textAlign: "center",
              fontSize: 10,
              marginTop: 4,
            }}
          >
            Remote tracks: {remoteStream ? remoteStream.getTracks().length : 0}
          </Text>
        </View>
      )}

      {/* Local video nhỏ góc phải dưới */}
      {localStream && (
        <RTCView
          key={`local-${localStream.id}`}
          streamURL={localStream.toURL()}
          style={[stylesZalo.localVideo, { backgroundColor: "#000" }]}
          objectFit="cover"
          zOrder={1}
          mirror={true}
        />
      )}

      {/* Top bar: tên, trạng thái */}
      <View style={stylesZalo.topBar}>
        <Text style={stylesZalo.callerName}>{name}</Text>
        <Text style={stylesZalo.callStatus}>{callStatusText}</Text>
      </View>

      {/* Bottom bar: các nút chức năng */}
      <View style={stylesZalo.bottomBar}>
        <TouchableOpacity
          onPress={toggleMic}
          style={[
            stylesZalo.controlButton,
            !isMicOn && stylesZalo.disabledButton,
          ]}
        >
          <Ionicons name={isMicOn ? "mic" : "mic-off"} size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleEndCall}
          style={[stylesZalo.controlButton, stylesZalo.endCallButton]}
        >
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleCamera}
          style={[
            stylesZalo.controlButton,
            !isCameraOn && stylesZalo.disabledButton,
          ]}
        >
          <Ionicons
            name={isCameraOn ? "videocam" : "videocam-off"}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={switchCamera}
          style={stylesZalo.controlButton}
        >
          <Ionicons name="camera-reverse" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const stylesZalo = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  remoteVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  localVideo: {
    position: "absolute",
    width: 120,
    height: 160,
    bottom: 120,
    right: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  topBar: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 10,
  },
  callerName: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  callStatus: { color: "#fff", fontSize: 14, marginTop: 4 },
  bottomBar: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "rgba(255,0,0,0.5)",
  },
  endCallButton: {
    backgroundColor: "#ff3333",
  },
});

export default VideoCallScreen;
