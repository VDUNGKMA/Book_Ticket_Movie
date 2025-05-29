import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Dữ liệu ngôn ngữ
const languages = [
  { id: "1", name: "English", flag: "https://flagcdn.com/w20/gb.png" },
  { id: "2", name: "Bahasa Indonesia", flag: "https://flagcdn.com/w20/id.png" },
  { id: "3", name: "Chinese", flag: "https://flagcdn.com/w20/cn.png" },
  { id: "4", name: "Deutsch", flag: "https://flagcdn.com/w20/de.png" },
];

const LanguageScreen: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Lọc ngôn ngữ dựa trên tìm kiếm
  const filteredLanguages = languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLanguageItem = ({ item }: { item: (typeof languages)[0] }) => {
    const isSelected = selectedLanguage === item.name;
    const languageItemStyle = [
      styles.languageItem,
      isSelected && { borderWidth: 2, borderColor: "#FF4444" }, // Thêm viền đỏ khi chọn
    ];

    return (
      <TouchableOpacity
        style={languageItemStyle}
        onPress={() => setSelectedLanguage(item.name)}
      >
        <Image source={{ uri: item.flag }} style={styles.flagIcon} />
        <Text style={styles.languageText}>{item.name}</Text>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark" size={16} color="#FF4444" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên cùng */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search something..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close"
              size={20}
              color="#888"
              style={styles.closeIcon}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách ngôn ngữ */}
      <FlatList
        data={filteredLanguages}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.languageList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2526", // Nền tối giống ảnh
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
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539", // Nền ô tìm kiếm
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  closeIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  languageList: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3539", // Nền ô ngôn ngữ
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  flagIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  languageText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default LanguageScreen;
