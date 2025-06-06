import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useUserContext } from "../context/UserContext";
import { BASE_URL } from "../config/config";
import * as SecureStore from "expo-secure-store";

interface Comment {
  id: number;
  movie_id: number;
  user_id: number;
  content: string;
  parent_id: number | null;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
  parent?: Comment | null;
}

interface MovieCommentsProps {
  movieId: number;
}

const MovieComments: React.FC<MovieCommentsProps> = ({ movieId }) => {
  const { user } = useUserContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    fetchComments();
  }, [movieId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/movies/${movieId}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      Alert.alert("Bạn cần đăng nhập để bình luận");
      return;
    }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("Không tìm thấy token");
      const res = await fetch(`${BASE_URL}/movies/${movieId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Lỗi gửi bình luận");
      setNewComment("");
      fetchComments();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gửi bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (parentId: number) => {
    if (!user) {
      Alert.alert("Bạn cần đăng nhập để trả lời");
      return;
    }
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("Không tìm thấy token");
      const res = await fetch(`${BASE_URL}/movies/${movieId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyContent, parent_id: parentId }),
      });
      if (!res.ok) throw new Error("Lỗi gửi trả lời");
      setReplyContent("");
      setReplyTo(null);
      fetchComments();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gửi trả lời");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bình luận này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("access_token");
            if (!token) throw new Error("Không tìm thấy token");
            const res = await fetch(
              `${BASE_URL}/movies/comments/${commentId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!res.ok) throw new Error("Lỗi xóa bình luận");
            fetchComments();
          } catch (e) {
            Alert.alert("Lỗi", "Không thể xóa bình luận");
          }
        },
      },
    ]);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editContent.trim()) return;
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("Không tìm thấy token");
      const res = await fetch(`${BASE_URL}/movies/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
    //   console.log("Update comment response:", res.status, data);
      if (!res.ok) throw new Error("Lỗi cập nhật bình luận");
      setEditingId(null);
      setEditContent("");
      fetchComments();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const renderReplies = (replies: Comment[], level = 1) => {
    return replies.map((reply) => (
      <View
        key={reply.id}
        style={[styles.replyContainer, { marginLeft: level * 16 }]}
      >
        <Text style={styles.commentUser}>User {reply.user_id}</Text>
        {editingId === reply.id ? (
          <View style={styles.editInputContainer}>
            <TextInput
              style={styles.input}
              value={editContent}
              onChangeText={setEditContent}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleSaveEdit(reply.id)}
              disabled={submitting}
            >
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.commentContent}>{reply.content}</Text>
        )}
        <Text style={styles.commentTime}>
          {new Date(reply.createdAt).toLocaleString()}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setReplyTo(reply.id)}>
            <Text style={styles.replyButton}>Trả lời</Text>
          </TouchableOpacity>
          {user && user.id === reply.user_id && editingId !== reply.id && (
            <>
              <TouchableOpacity onPress={() => handleEditComment(reply)}>
                <Text style={styles.editButton}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteComment(reply.id)}>
                <Text style={styles.deleteButton}>Xóa</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {replyTo === reply.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập trả lời..."
              value={replyContent}
              onChangeText={setReplyContent}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSendReply(reply.id)}
              disabled={submitting}
            >
              <Text style={styles.sendButtonText}>Gửi</Text>
            </TouchableOpacity>
          </View>
        )}
        {reply.replies &&
          reply.replies.length > 0 &&
          renderReplies(reply.replies, level + 1)}
      </View>
    ));
  };

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <Text style={styles.commentUser}>User {item.user_id}</Text>
      {editingId === item.id ? (
        <View style={styles.editInputContainer}>
          <TextInput
            style={styles.input}
            value={editContent}
            onChangeText={setEditContent}
            editable={!submitting}
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => handleSaveEdit(item.id)}
            disabled={submitting}
          >
            <Text style={styles.saveButtonText}>Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.commentContent}>{item.content}</Text>
      )}
      <Text style={styles.commentTime}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => setReplyTo(item.id)}>
          <Text style={styles.replyButton}>Trả lời</Text>
        </TouchableOpacity>
        {user && user.id === item.user_id && editingId !== item.id && (
          <>
            <TouchableOpacity onPress={() => handleEditComment(item)}>
              <Text style={styles.editButton}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
              <Text style={styles.deleteButton}>Xóa</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {replyTo === item.id && (
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập trả lời..."
            value={replyContent}
            onChangeText={setReplyContent}
            editable={!submitting}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendReply(item.id)}
            disabled={submitting}
          >
            <Text style={styles.sendButtonText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.replies && item.replies.length > 0 && renderReplies(item.replies)}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bình luận</Text>
      {loading ? (
        <Text>Đang tải bình luận...</Text>
      ) : comments.length === 0 ? (
        <Text>Chưa có bình luận nào.</Text>
      ) : (
        comments.map((item) => (
          <View key={item.id}>{renderCommentItem({ item })}</View>
        ))
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nhập bình luận..."
          value={newComment}
          onChangeText={setNewComment}
          editable={!submitting}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendComment}
          disabled={submitting}
        >
          <Text style={styles.sendButtonText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  commentContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  commentUser: {
    fontWeight: "bold",
    color: "#333",
  },
  commentContent: {
    marginTop: 4,
    marginBottom: 4,
    color: "#222",
  },
  commentTime: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  replyButton: {
    color: "#007bff",
    fontSize: 14,
    marginTop: 2,
  },
  replyContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#e9ecef",
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#FF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  replyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  editInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  saveButton: {
    marginLeft: 8,
    backgroundColor: "#007bff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    marginLeft: 8,
    backgroundColor: "#aaa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  editButton: {
    color: "#007bff",
    fontSize: 14,
    marginLeft: 12,
  },
  deleteButton: {
    color: "#FF4444",
    fontSize: 14,
    marginLeft: 8,
  },
});

export default MovieComments;
