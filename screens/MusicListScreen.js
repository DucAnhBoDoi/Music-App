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
  TouchableOpacity,
  Image,
} from "react-native";
import SongItem from "../components/SongItem";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function MusicListScreen() {
  const [search, setSearch] = useState("");
  const [songsData, setSongsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);
  const { history } = useContext(MusicPlayerContext);

  // 🟢 Lấy danh sách nhạc phổ biến
  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api.deezer.com/chart/2/tracks?limit=50");
      const result = await response.json();
      const formattedSongs = (result.data || []).map((track) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name || "Unknown Artist",
        cover: track.album?.cover_medium || track.album?.cover_small || "",
        duration: track.duration,
        preview: track.preview,
      }));
      setSongsData(formattedSongs);
    } catch (error) {
      console.log("Error fetching songs:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Tìm kiếm nhạc
  const searchSongs = async (query) => {
    if (!query.trim()) {
      fetchSongs();
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`
      );
      const result = await response.json();
      const formattedSongs = (result.data || []).map((track) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name || "Unknown Artist",
        cover: track.album?.cover_medium || track.album?.cover_small || "",
        duration: track.duration,
        preview: track.preview,
      }));
      setSongsData(formattedSongs);
    } catch (error) {
      console.log("Error searching songs:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Lấy danh sách Album, Nghệ sĩ, Thể loại
  const fetchFilters = async () => {
    try {
      const chartRes = await fetch("https://api.deezer.com/chart/0");
      const chartData = await chartRes.json();
      setAlbums(chartData.albums?.data || []);
      setArtists(chartData.artists?.data || []);

      const genreRes = await fetch("https://api.deezer.com/genre");
      const genreData = await genreRes.json();
      setGenres(genreData.data.slice(1, 6)); // Lấy 5 thể loại
    } catch (error) {
      console.log("Error fetching filters:", error);
    }
  };

  // 🟢 Lấy nhạc theo album / nghệ sĩ / thể loại
  const fetchFilteredSongs = async (type, id) => {
    try {
      setLoading(true);
      let url = "";

      if (type === "album") {
        url = `https://api.deezer.com/album/${id}`;
        const response = await fetch(url);
        const result = await response.json();

        // 🟠 Khi API trả về album có trường "tracks"
        if (result.tracks && result.tracks.data) {
          const formattedSongs = result.tracks.data.map((track) => ({
            id: track.id.toString(),
            title: track.title,
            artist: track.artist?.name || result.artist?.name || "Unknown Artist",
            cover:
              result.cover_medium ||
              result.cover_big ||
              track.album?.cover_medium ||
              "",
            duration: track.duration,
            preview: track.preview,
          }));
          setSongsData(formattedSongs);
          return;
        }
      }

      // 🟢 Nếu là nghệ sĩ
      if (type === "artist") {
        url = `https://api.deezer.com/artist/${id}/top?limit=50`;
      }

      // 🟢 Nếu là thể loại
      if (type === "genre") {
        const res = await fetch(`https://api.deezer.com/genre/${id}/artists`);
        const data = await res.json();
        let tracks = [];
        for (let artist of data.data.slice(0, 5)) {
          const resTop = await fetch(
            `https://api.deezer.com/artist/${artist.id}/top?limit=5`
          );
          const topTracks = await resTop.json();
          tracks.push(
            ...(topTracks.data || []).map((track) => ({
              id: track.id.toString(),
              title: track.title,
              artist: track.artist?.name || "Unknown Artist",
              cover: track.album?.cover_medium || track.album?.cover_small || "",
              duration: track.duration,
              preview: track.preview,
            }))
          );
        }
        setSongsData(tracks);
        return;
      }

      if (url) {
        const response = await fetch(url);
        const result = await response.json();
        const formattedSongs = (result.data || []).map((track) => ({
          id: track.id.toString(),
          title: track.title,
          artist: track.artist?.name || "Unknown Artist",
          cover: track.album?.cover_medium || track.album?.cover_small || "",
          duration: track.duration,
          preview: track.preview,
        }));
        setSongsData(formattedSongs);
      }
    } catch (error) {
      console.log("Error fetching filtered songs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
    fetchFilters();
  }, []);

  // 🕒 debounce tìm kiếm
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search) searchSongs(search);
      else fetchSongs();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const suggestedSongs = history?.slice(0, 5) || [];

  // 🟢 Render từng section
  const renderSection = ({ item }) => {
    switch (item.type) {
      case "suggested":
        return (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.subHeader}>Gợi ý cho bạn</Text>
            <FlatList
              data={suggestedSongs}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <SongItem song={item} playlist={suggestedSongs} songIndex={index} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>
        );
      case "genres":
        return (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.subHeader}>Thể loại</Text>
            <FlatList
              data={genres}
              horizontal
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => fetchFilteredSongs("genre", item.id)}
                  style={styles.genreButton}
                >
                  <Text style={{ color: "#fff" }}>{item.name}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        );
      case "songs":
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Đang tải nhạc...</Text>
            </View>
          );
        }
        return (
          <FlatList
            data={songsData}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <SongItem song={item} playlist={songsData} songIndex={index} />
            )}
            scrollEnabled={false}
          />
        );
      case "albums":
        return (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.subHeader}>Album</Text>
            <FlatList
              data={albums}
              horizontal
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => fetchFilteredSongs("album", item.id)}
                  style={{ marginRight: 12 }}
                >
                  <Image
                    source={{ uri: item.cover_medium }}
                    style={styles.albumCover}
                  />
                  <Text style={styles.filterText} numberOfLines={1}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        );
      case "artists":
        return (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.subHeader}>Ca sĩ</Text>
            <FlatList
              data={artists}
              horizontal
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => fetchFilteredSongs("artist", item.id)}
                  style={{ marginRight: 12 }}
                >
                  <Image
                    source={{ uri: item.picture_medium }}
                    style={styles.artistCover}
                  />
                  <Text style={styles.filterText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        );
      default:
        return null;
    }
  };

  const flatListData = [
    suggestedSongs.length > 0 ? { type: "suggested" } : null,
    genres.length > 0 ? { type: "genres" } : null,
    { type: "songs" },
    albums.length > 0 ? { type: "albums" } : null,
    artists.length > 0 ? { type: "artists" } : null,
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={true} />
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Music</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Tìm bài hát hoặc ca sĩ..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={flatListData}
        keyExtractor={(item, index) => item.type + index}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#121212" },
  headerContainer: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#121212" },
  header: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 12, marginTop: 20 },
  subHeader: { fontSize: 20, fontWeight: "bold", color: "#1DB954", marginBottom: 8 },
  searchBar: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    color: "#000",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginVertical: 20 },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 16 },
  albumCover: { width: 100, height: 100, borderRadius: 8 },
  artistCover: { width: 80, height: 80, borderRadius: 40 },
  filterText: { color: "#fff", marginTop: 4, width: 100, textAlign: "center" },
  genreButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
});
