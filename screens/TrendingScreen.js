import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import SongItem from "../components/SongItem";

export default function TrendingScreen() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api.deezer.com/chart/0/tracks?limit=20");
      const result = await response.json();

      const formatted = result.data.map((track) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        cover: track.album.cover_medium || track.album.cover_small,
        duration: track.duration,
        preview: track.preview,
      }));

      setSongs(formatted);
    } catch (error) {
      console.log("Error fetching trending:", error);
      // fallback dữ liệu giả nếu API lỗi
      setSongs([
        {
          id: "1",
          title: "Blinding Lights",
          artist: "The Weeknd",
          cover:
            "https://cdns-images.dzcdn.net/images/cover/ec3c8ed67427064c70f67e5815b74cef/250x250-000000-80-0-0.jpg",
          preview: "",
        },
        {
          id: "2",
          title: "Shape of You",
          artist: "Ed Sheeran",
          cover:
            "https://cdns-images.dzcdn.net/images/cover/56d51ebcfaa73fa6fa9b151adc5c57ba/250x250-000000-80-0-0.jpg",
          preview: "",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={true} />
      <View style={styles.container}>
        <Text style={styles.header}>🔥 Trending Music</Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Đang tải nhạc xu hướng...</Text>
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <SongItem song={item} playlist={songs} songIndex={index} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            onRefresh={fetchTrending}
            refreshing={loading}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1, padding: 16 },
  header: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#fff", fontSize: 16 },
});
