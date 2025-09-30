// screens/PlaylistDetailScreen.js
import React, { useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import MusicPlayerContext from "../context/MusicPlayerContext";
import SongItem from "../components/SongItem";

export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlistName } = route.params;
  const { playlists, removeFromPlaylist, deletePlaylist, getPlaylistSongs } = useContext(MusicPlayerContext);
  
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  const songs = getPlaylistSongs(playlistName);

  const handleDeleteSong = (songId, songTitle) => {
    Alert.alert(
      "Xóa bài hát",
      `Bạn có chắc muốn xóa "${songTitle}" khỏi playlist này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            removeFromPlaylist(playlistName, songId);
            setRefreshKey((prev) => prev + 1);
          },
        },
      ]
    );
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      "Xóa playlist",
      `Bạn có chắc muốn xóa playlist "${playlistName}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            deletePlaylist(playlistName);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.songItemContainer}>
      <View style={{ flex: 1 }}>
        <SongItem song={item} playlist={songs} songIndex={index} />
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteSong(item.id, item.title)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {playlistName}
        </Text>
        <TouchableOpacity onPress={handleDeletePlaylist}>
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="musical-notes" size={40} color="#1DB954" />
        </View>
        <Text style={styles.playlistTitle}>{playlistName}</Text>
        <Text style={styles.songCount}>{songs.length} bài hát</Text>
      </View>

      {/* Song list */}
      {songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-note-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>Chưa có bài hát nào</Text>
          <Text style={styles.emptySubtext}>
            Thêm bài hát từ màn hình phát nhạc!
          </Text>
        </View>
      ) : (
        <FlatList
          key={refreshKey}
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 50,
    marginBottom: 20,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 12,
    textAlign: "center",
  },
  infoContainer: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    marginHorizontal: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  playlistTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  songCount: {
    color: "#888",
    fontSize: 14,
  },
  songItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
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
});