// screens/FavoritesScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import SongItem from "../components/SongItem";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function FavoritesScreen() {
  const { favorites, isLoaded } = useContext(MusicPlayerContext);
  
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  // Cập nhật filtered khi favorites thay đổi
  useEffect(() => {
    setFiltered(favorites);
  }, [favorites, refreshKey]);

  // Xử lý tìm kiếm
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(favorites);
    } else {
      const results = favorites.filter(
        (song) =>
          song.title.toLowerCase().includes(search.toLowerCase()) ||
          song.artist.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(results);
    }
  }, [search, favorites]);

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121212"
        translucent={true}
      />

      <View style={styles.container}>
        <Text style={styles.header}>My Favorites</Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Tìm trong danh sách yêu thích..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Empty state */}
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#444" />
            <Text style={styles.emptyText}>Chưa có bài hát yêu thích</Text>
            <Text style={styles.emptySubtext}>
              Nhấn vào icon trái tim khi nghe nhạc để thêm vào đây!
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={80} color="#444" />
            <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
            <Text style={styles.emptySubtext}>
              Thử tìm kiếm với từ khóa khác
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>
              {filtered.length} bài hát {search && `(từ ${favorites.length} bài)`}
            </Text>
            <FlatList
              key={refreshKey}
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <SongItem song={item} playlist={filtered} songIndex={index} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  header: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    padding: 10,
    color: "#fff",
    fontSize: 14,
  },
  countText: {
    color: "#888",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#aaa",
    fontSize: 18,
    marginTop: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    color: "#666",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
});