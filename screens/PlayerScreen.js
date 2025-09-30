// screens/PlayerScreen.js
import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import MusicPlayerContext from "../context/MusicPlayerContext";

const { width } = Dimensions.get("window");

export default function PlayerScreen({ route, navigation }) {
  const { song, playlist = [song], currentIndex = 0 } = route.params || {};

  // ========== CONTEXT ==========
  const {
    favorites,
    toggleFavorite,
    isFavorite,
    playlists,
    createPlaylist,
    addToPlaylist,
    getPlaylistNames,
  } = useContext(MusicPlayerContext);

  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(currentIndex);
  const [currentSong, setCurrentSong] = useState(playlist[currentIndex] || song);

  const [repeat, setRepeat] = useState("none");
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(1);

  // Modal quản lý playlist
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const soundRef = useRef();
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const volumeRef = useRef(volume);
  const currentSongIndexRef = useRef(currentSongIndex);
  const playlistRef = useRef(playlist);

  // --- SYNC refs ---
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    volumeRef.current = volume;
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(volume).catch(() => {});
    }
  }, [volume]);
  useEffect(() => {
    currentSongIndexRef.current = currentSongIndex;
  }, [currentSongIndex]);
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // --- Audio setup ---
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ========== XỬ LÝ THÊM VÀO PLAYLIST ==========
  const handleAddToPlaylist = (playlistName) => {
    if (!currentSong) return;
    
    const success = addToPlaylist(playlistName, currentSong);
    setShowPlaylistModal(false);
    
    if (success) {
      Alert.alert("✅ Thành công", `Đã thêm "${currentSong.title}" vào playlist "${playlistName}"`);
    } else {
      Alert.alert("⚠️ Thông báo", "Bài hát đã có trong playlist này rồi!");
    }
  };

  const handleCreateNewPlaylist = () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("⚠️ Lỗi", "Tên playlist không được để trống");
      return;
    }

    const success = createPlaylist(newPlaylistName.trim());
    
    if (success) {
      // Thêm bài hát hiện tại vào playlist mới
      addToPlaylist(newPlaylistName.trim(), currentSong);
      setShowNewPlaylistModal(false);
      setNewPlaylistName("");
      Alert.alert("✅ Thành công", `Đã tạo playlist "${newPlaylistName}" và thêm bài hát vào!`);
    } else {
      Alert.alert("⚠️ Lỗi", "Playlist này đã tồn tại!");
    }
  };

  // --- Playback status ---
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        if (repeatRef.current === "one") {
          if (soundRef.current) {
            soundRef.current.replayAsync().catch(console.log);
          }
          return;
        }
        const pl = playlistRef.current || [];
        const len = pl.length;
        const cur = currentSongIndexRef.current;
        if (len === 0) return;

        let nextIndex = cur;
        if (shuffleRef.current) {
          if (len === 2) nextIndex = cur === 0 ? 1 : 0;
          else {
            do {
              nextIndex = Math.floor(Math.random() * len);
            } while (nextIndex === cur && len > 1);
          }
        } else {
          if (cur === len - 1) {
            if (repeatRef.current === "all") nextIndex = 0;
            else return;
          } else nextIndex = cur + 1;
        }
        setCurrentSongIndex(nextIndex);
        setCurrentSong(pl[nextIndex]);
      }
    } else {
      setIsPlaying(false);
    }
  };

  // --- Load & play ---
  const loadAndPlaySong = async (songToPlay) => {
    try {
      setIsLoading(true);
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
      }
      if (!songToPlay || !songToPlay.preview) {
        Alert.alert("Không có preview", "Bài này không có link phát thử.");
        setIsLoading(false);
        return;
      }
      const initialVolume = volumeRef.current ?? 1;
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: songToPlay.preview },
        { shouldPlay: true, isLooping: false, volume: initialVolume }
      );
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      soundRef.current = newSound;
      setSound(newSound);
    } catch (e) {
      console.log("❌ Error load:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSong) {
      loadAndPlaySong(currentSong);
    }
  }, [currentSong]);

  // --- Controls ---
  const handlePlayPause = async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) await soundRef.current.pauseAsync();
        else await soundRef.current.playAsync();
      }
    } catch (e) {
      console.log("Play/Pause error:", e);
    }
  };

  const handleNext = () => {
    const pl = playlistRef.current || [];
    if (!pl.length) return;
    let nextIndex = currentSongIndexRef.current;
    if (shuffleRef.current) {
      do {
        nextIndex = Math.floor(Math.random() * pl.length);
      } while (nextIndex === currentSongIndexRef.current);
    } else {
      if (currentSongIndexRef.current === pl.length - 1) {
        if (repeatRef.current === "all") nextIndex = 0;
        else return;
      } else nextIndex = currentSongIndexRef.current + 1;
    }
    setCurrentSongIndex(nextIndex);
    setCurrentSong(pl[nextIndex]);
  };

  const handlePrevious = () => {
    const pl = playlistRef.current || [];
    if (!pl.length) return;
    let prevIndex = currentSongIndexRef.current;
    if (shuffleRef.current) {
      do {
        prevIndex = Math.floor(Math.random() * pl.length);
      } while (prevIndex === currentSongIndexRef.current);
    } else {
      if (currentSongIndexRef.current === 0) {
        if (repeatRef.current === "all") prevIndex = pl.length - 1;
        else {
          if (soundRef.current) soundRef.current.setPositionAsync(0).catch(() => {});
          return;
        }
      } else prevIndex = currentSongIndexRef.current - 1;
    }
    setCurrentSongIndex(prevIndex);
    setCurrentSong(pl[prevIndex]);
  };

  const handleSeek = async (value) => {
    if (soundRef.current && duration > 0) {
      const pos = Math.floor(value * duration);
      try {
        await soundRef.current.setPositionAsync(pos);
      } catch {}
    }
  };

  const toggleRepeat = () => {
    if (repeat === "none") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("none");
  };

  const toggleShuffle = () => setShuffle((prev) => !prev);

  const handleToggleFavorite = () => {
    if (!currentSong) return;
    toggleFavorite(currentSong);
  };

  const formatTime = (ms) => {
    if (!ms) return "0:00";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Không có bài hát</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const playlistNames = getPlaylistNames();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <Text style={styles.headerSubtitle}>
            {currentSongIndex + 1} of {playlist.length}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowPlaylistModal(true)} style={{ marginRight: 15 }}>
            <Ionicons name="add-circle-outline" size={26} color="#1DB954" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorite(currentSong.id) ? "heart" : "heart-outline"}
              size={26}
              color="red"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Album Art */}
      <View style={styles.albumContainer}>
        <Image
          source={{ uri: currentSong.cover }}
          style={styles.albumArt}
          defaultSource={{
            uri: "https://via.placeholder.com/300x300/333/666?text=Music",
          }}
        />
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {currentSong.title}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {currentSong.artist}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={duration ? position / duration : 0}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#404040"
          disabled={!duration || isLoading}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.smallControl}>
          <Ionicons name="shuffle" size={24} color={shuffle ? "#1DB954" : "#aaa"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={35} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.playButton, isLoading && { opacity: 0.5 }]}
          disabled={isLoading}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={35} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={35} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} style={styles.smallControl}>
          <View style={styles.repeatContainer}>
            <Ionicons name="repeat" size={24} color={repeat === "none" ? "#aaa" : "#1DB954"} />
            {repeat === "one" && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Volume */}
      <View style={styles.volumeContainer}>
        <Ionicons name="volume-low" size={20} color="#aaa" />
        <Slider
          style={{ flex: 1, marginHorizontal: 10 }}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#404040"
          thumbTintColor="#1DB954"
        />
        <Ionicons name="volume-high" size={20} color="#aaa" />
      </View>

      {/* Modal chọn playlist */}
      <Modal visible={showPlaylistModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Thêm vào Playlist</Text>
            
            {playlistNames.length === 0 ? (
              <View style={{ alignItems: "center", marginVertical: 20 }}>
                <Text style={{ color: "#aaa", marginBottom: 10 }}>
                  Chưa có playlist nào.
                </Text>
                <TouchableOpacity
                  style={styles.newPlaylistBtn}
                  onPress={() => {
                    setShowPlaylistModal(false);
                    setShowNewPlaylistModal(true);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#1DB954" />
                  <Text style={{ color: "#1DB954", marginLeft: 8 }}>Tạo playlist mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  data={playlistNames}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.playlistItem}
                      onPress={() => handleAddToPlaylist(item)}
                    >
                      <Ionicons name="musical-notes" size={20} color="#1DB954" />
                      <Text style={{ color: "#fff", marginLeft: 12, flex: 1 }}>{item}</Text>
                      <Text style={{ color: "#666", fontSize: 12 }}>
                        {playlists[item]?.length || 0} bài
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 300 }}
                />
                <TouchableOpacity
                  style={[styles.newPlaylistBtn, { marginTop: 10 }]}
                  onPress={() => {
                    setShowPlaylistModal(false);
                    setShowNewPlaylistModal(true);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#1DB954" />
                  <Text style={{ color: "#1DB954", marginLeft: 8 }}>Tạo playlist mới</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPlaylistModal(false)}
            >
              <Text style={{ color: "#aaa" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal tạo playlist mới */}
      <Modal visible={showNewPlaylistModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tạo playlist mới</Text>
            <TextInput
              placeholder="Nhập tên playlist"
              placeholderTextColor="#888"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              style={styles.input}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#444", flex: 1 }]}
                onPress={() => {
                  setShowNewPlaylistModal(false);
                  setNewPlaylistName("");
                }}
              >
                <Text style={{ color: "#fff" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#1DB954", flex: 1 }]}
                onPress={handleCreateNewPlaylist}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 50,
    marginBottom: 20,
  },
  headerCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  headerSubtitle: { color: "#666", fontSize: 12 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  albumContainer: { alignItems: "center", marginVertical: 30 },
  albumArt: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  songInfo: { alignItems: "center", marginBottom: 30 },
  songTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  artistName: { color: "#aaa", fontSize: 16, marginTop: 4 },
  progressContainer: { marginHorizontal: 10 },
  slider: { width: "100%", height: 40 },
  timeContainer: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { color: "#aaa", fontSize: 12 },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: 20,
  },
  smallControl: { padding: 10 },
  controlButton: { padding: 10 },
  playButton: {
    backgroundColor: "#1DB954",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  repeatContainer: {
    position: "relative",
    width: 24,
    height: 24,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#1DB954",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
  },
  volumeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 10,
  },
  errorText: { color: "#fff", textAlign: "center", marginTop: 20 },
  backButton: { color: "#1DB954", textAlign: "center", marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: { backgroundColor: "#222", padding: 20, borderRadius: 12, width: "80%", maxHeight: "70%" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalClose: { marginTop: 15, alignItems: "center", padding: 10 },
  newPlaylistBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
  },
  modalBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});