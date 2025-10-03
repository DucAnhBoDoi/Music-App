// screens/PlayerScreen.js
import React, { useState, useEffect, useContext } from "react";
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
  Share,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import MusicPlayerContext from "../context/MusicPlayerContext";

const { width, height } = Dimensions.get("window");

export default function PlayerScreen({ route, navigation }) {
  const { song, playlist = [song], currentIndex: paramIndex = 0 } = route.params || {};

  // ========== CONTEXT ==========
  const {
    currentSong,
    currentPlaylist,
    currentIndex,
    isPlaying,
    position,
    duration,
    repeat,
    shuffle,
    
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    setRepeat,
    setShuffle,
    getSoundRef,
    
    toggleFavorite,
    isFavorite,
    playlists,
    createPlaylist,
    addToPlaylist,
    getPlaylistNames,
  } = useContext(MusicPlayerContext);

  // Local state
  const [localVolume, setLocalVolume] = useState(1);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // ========== INIT ==========
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      playSong(song, {
        playlist: playlist,
        index: paramIndex,
      });
    }
  }, []);

  // ========== SHARE FUNCTION ==========
  const handleShare = async () => {
    if (!currentSong) return;

    try {
      const message = `🎵 ${currentSong.title}\n👤 ${currentSong.artist}\n\n🎧 Nghe ngay: ${currentSong.link || 'https://www.deezer.com'}`;
      
      const result = await Share.share({
        message: message,
        title: `Chia sẻ: ${currentSong.title}`,
      }, {
        dialogTitle: 'Chia sẻ bài hát',
        subject: `${currentSong.title} - ${currentSong.artist}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Đã chia sẻ qua:', result.activityType);
        } else {
          console.log('Đã chia sẻ');
        }
        setShowBottomSheet(false);
        Alert.alert('✅ Thành công', 'Đã chia sẻ bài hát!');
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ bài hát');
    }
  };

  // ========== DOWNLOAD FUNCTION ==========
  const handleDownload = async () => {
    if (!currentSong || !currentSong.preview) {
      Alert.alert('❌ Lỗi', 'Không có link tải về');
      return;
    }

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện để tải nhạc');
        return;
      }

      setIsDownloading(true);
      setShowBottomSheet(false);

      // Create file name
      const fileName = `${currentSong.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Download
      Alert.alert('⏳ Đang tải...', 'Vui lòng đợi');

      const downloadResumable = FileSystem.createDownloadResumable(
        currentSong.preview,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${(progress * 100).toFixed(0)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      // Save to media library
      await MediaLibrary.createAssetAsync(uri);

      setIsDownloading(false);
      Alert.alert(
        '✅ Tải xuống thành công!',
        `Bài hát "${currentSong.title}" đã được lưu vào thư viện của bạn`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setIsDownloading(false);
      console.log('Download error:', error);
      Alert.alert('❌ Lỗi', 'Không thể tải bài hát. Đây là bản preview 30s nên có thể không hỗ trợ tải về.');
    }
  };

  // ========== PLAYLIST FUNCTIONS ==========
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
      addToPlaylist(newPlaylistName.trim(), currentSong);
      setShowNewPlaylistModal(false);
      setNewPlaylistName("");
      Alert.alert("✅ Thành công", `Đã tạo playlist "${newPlaylistName}" và thêm bài hát vào!`);
    } else {
      Alert.alert("⚠️ Lỗi", "Playlist này đã tồn tại!");
    }
  };

  const handleSeek = async (value) => {
    await seekTo(value);
  };

  const handleVolumeChange = (vol) => {
    setLocalVolume(vol);
    setVolume(vol);
  };

  const toggleRepeatMode = () => {
    if (repeat === "none") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("none");
  };

  const toggleShuffleMode = () => setShuffle(!shuffle);

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
            {currentIndex + 1} of {currentPlaylist.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowBottomSheet(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
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
          disabled={!duration}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={toggleShuffleMode} style={styles.smallControl}>
          <Ionicons name="shuffle" size={24} color={shuffle ? "#1DB954" : "#aaa"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={35} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayPause}
          style={styles.playButton}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={35} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={playNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={35} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeatMode} style={styles.smallControl}>
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
          value={localVolume}
          onValueChange={handleVolumeChange}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#404040"
          thumbTintColor="#1DB954"
        />
        <Ionicons name="volume-high" size={20} color="#aaa" />
      </View>

      {/* Bottom Sheet Menu (Spotify Style) */}
      <Modal
        visible={showBottomSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBottomSheet(false)}
      >
        <TouchableOpacity 
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowBottomSheet(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.bottomSheetContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Song Header */}
            <View style={styles.bottomSheetHeader}>
              <Image source={{ uri: currentSong.cover }} style={styles.bottomSheetImage} />
              <View style={styles.bottomSheetInfo}>
                <Text style={styles.bottomSheetTitle} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text style={styles.bottomSheetArtist} numberOfLines={1}>
                  {currentSong.artist}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              {/* Favorite */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  handleToggleFavorite();
                  setShowBottomSheet(false);
                }}
              >
                <Ionicons 
                  name={isFavorite(currentSong.id) ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorite(currentSong.id) ? "#1DB954" : "#fff"} 
                />
                <Text style={styles.menuText}>
                  {isFavorite(currentSong.id) ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
                </Text>
              </TouchableOpacity>

              {/* Add to Playlist */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowBottomSheet(false);
                  setTimeout(() => setShowPlaylistModal(true), 300);
                }}
              >
                <Ionicons name="list" size={24} color="#fff" />
                <Text style={styles.menuText}>Thêm vào playlist</Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleShare}
              >
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text style={styles.menuText}>Chia sẻ</Text>
              </TouchableOpacity>

              {/* Download */}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <Ionicons 
                  name={isDownloading ? "hourglass" : "download"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.menuText}>
                  {isDownloading ? "Đang tải..." : "Tải xuống"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBottomSheet(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#282828",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  bottomSheetImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  bottomSheetInfo: {
    flex: 1,
    marginLeft: 15,
  },
  bottomSheetTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSheetArtist: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#404040",
    marginHorizontal: 20,
  },
  menuContainer: {
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 20,
  },
  closeButton: {
    marginTop: 10,
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#1c1c1c",
    borderRadius: 25,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: { 
    backgroundColor: "#222", 
    padding: 20, 
    borderRadius: 12, 
    width: "80%", 
    maxHeight: "70%" 
  },
  modalTitle: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600", 
    marginBottom: 12 
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalClose: { 
    marginTop: 15, 
    alignItems: "center", 
    padding: 10 
  },
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