// screens/PlayerScreen.js - WITH LYRICS BOTTOM LAYOUT
import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
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
  Animated,
  ScrollView,
  ActivityIndicator,
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

    toggleFavorite,
    isFavorite,
    playlists,
    createPlaylist,
    addToPlaylist,
    getPlaylistNames,
  } = useContext(MusicPlayerContext);

  // ========== ANIMATIONS ==========
  const imageOpacity = useRef(new Animated.Value(1)).current;

  // ========== LOCAL STATE ==========
  const [localVolume, setLocalVolume] = useState(1);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // ========== LYRICS STATE ==========
  const [lyrics, setLyrics] = useState(null); // { text, synced, syncedLyrics: [{time, text}] }
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState(null);

  // Track previous song for transition detection
  const prevSongId = useRef(currentSong?.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(currentSong?.cover);

  // Scroll ref for lyrics auto-scroll
  const lyricsScrollRef = useRef(null);

  // Estimated single-line height for smooth scrolling
  const LINE_ESTIMATED_HEIGHT = 60;

  // ========== MEMOIZED VALUES ==========
  const playlistNames = useMemo(() => getPlaylistNames(), [playlists]);

  const formattedPosition = useMemo(() => formatTime(position), [position]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  const sliderValue = useMemo(() => {
    return duration ? position / duration : 0;
  }, [position, duration]);

  // ========== IMAGE PRELOADING ==========
  useEffect(() => {
    if (currentSong?.cover && currentSong.cover !== currentImageUri) {
      setImageLoaded(false);

      // Preload image
      Image.prefetch(currentSong.cover)
        .then(() => {
          setCurrentImageUri(currentSong.cover);
          setImageLoaded(true);
        })
        .catch(() => {
          setCurrentImageUri(currentSong.cover);
          setImageLoaded(true);
        });
    }
  }, [currentSong?.cover]);

  // ========== SMOOTH TRANSITION EFFECT ==========
  useEffect(() => {
    if (currentSong && prevSongId.current !== currentSong.id) {
      prevSongId.current = currentSong.id;

      // Smooth cross-fade when image changes
      if (currentSong.cover !== currentImageUri) {
        setImageLoaded(false);
      }

      // Auto-fetch lyrics when song changes
      setLyrics(null);
      setLyricsError(null);
      fetchLyrics(currentSong);
    }
  }, [currentSong?.id]);

  // Animate when image loads
  useEffect(() => {
    if (imageLoaded) {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoaded]);

  // ========== INIT ==========
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      playSong(song, {
        playlist: playlist,
        index: paramIndex,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== LYRICS FETCHING ==========
  // ========== LYRICS FETCHING OPTIMIZED ==========
  const fetchLyrics = async (songToFetch) => {
    if (!songToFetch) return;

    setLoadingLyrics(true);
    setLyricsError(null);

    const artist = encodeURIComponent(songToFetch.artist || "");
    const title = encodeURIComponent(songToFetch.title || "");

    const lyricsAPIs = [
      // lyrics.ovh
      async () => {
        const res = await fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`);
        if (res.ok) {
          const data = await res.json();
          if (data.lyrics) {
            return { text: data.lyrics, synced: false };
          }
        }
        throw new Error("No lyrics from lyrics.ovh");
      },
      // lrclib.net
      async () => {
        const res = await fetch(
          `https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            return {
              text: data.plainLyrics || data.syncedLyrics,
              synced: true,
              syncedLyrics: parseLRC(data.syncedLyrics),
            };
          } else if (data.plainLyrics) {
            return { text: data.plainLyrics, synced: false };
          }
        }
        throw new Error("No lyrics from lrclib.net");
      },
    ];

    try {
      // Chạy song song, lấy kết quả đầu tiên thành công
      const result = await Promise.any(lyricsAPIs.map(fn => fn()));
      setLyrics(result);
    } catch (error) {
      console.log("Lyrics fetch error:", error);
      setLyricsError("Không tìm thấy lời bài hát");
    } finally {
      setLoadingLyrics(false);
    }
  };


  // Parse LRC format for synced lyrics
  const parseLRC = (lrcText) => {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const parsed = [];

    lines.forEach(line => {
      // Support multiple time tags per line [mm:ss.xx][mm:ss.xx]text
      const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
      let match;
      const text = line.replace(timeTagRegex, '').trim();
      const times = [];
      while ((match = timeTagRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msPart = match[3] ? match[3].padEnd(3, '0') : '000';
        const milliseconds = parseInt(msPart, 10);
        const timeMs = (minutes * 60 + seconds) * 1000 + milliseconds;
        times.push(timeMs);
      }
      times.forEach(t => {
        if (text) {
          parsed.push({ time: t, text });
        }
      });
    });

    return parsed.sort((a, b) => a.time - b.time);
  };

  // Get current lyrics line index
  const getCurrentLyricsIndex = useCallback(() => {
    if (!lyrics?.synced || !lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) return -1;

    // Find the last line that should be playing now
    let currentIdx = -1;
    for (let i = lyrics.syncedLyrics.length - 1; i >= 0; i--) {
      if (position >= lyrics.syncedLyrics[i].time) {
        currentIdx = i;
        break;
      }
    }
    return currentIdx;
  }, [lyrics, position]);

  // Auto-scroll effect: when position changes and lyrics are synced
  useEffect(() => {
    if (!lyrics?.synced || !lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) return;

    const idx = getCurrentLyricsIndex();
    if (idx < 0) return;

    // Smooth scroll to center the active line
    if (lyricsScrollRef.current) {
      // Use scrollTo for ScrollView
      const yOffset = Math.max(0, (idx * LINE_ESTIMATED_HEIGHT) - 100);

      // Small delay to ensure smooth scrolling
      setTimeout(() => {
        if (lyricsScrollRef.current?.scrollTo) {
          lyricsScrollRef.current.scrollTo({
            y: yOffset,
            animated: true
          });
        }
      }, 100);
    }
  }, [position, lyrics]);

  // Seek to a normalized value (seekTo expects fraction 0..1 in your context)
  const handleSeek = useCallback(async (value) => {
    if (!duration) return;
    try {
      await seekTo(value); // value is 0..1 as used elsewhere in your code
    } catch (e) {
      console.log("seek error", e);
    }
  }, [seekTo, duration]);

  // Seek to a time in ms (from lyrics). Convert to fraction.
  const handleSeekToMillis = useCallback(async (ms) => {
    if (!duration || !seekTo) return;
    const fraction = Math.max(0, Math.min(1, ms / duration));
    try {
      await seekTo(fraction);
    } catch (e) {
      console.log("seekToMillis error", e);
    }
  }, [seekTo, duration]);

  const handleVolumeChange = useCallback((vol) => {
    setLocalVolume(vol);
    setVolume(vol);
  }, [setVolume]);

  const toggleRepeatMode = useCallback(() => {
    if (repeat === "none") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("none");
  }, [repeat, setRepeat]);

  const toggleShuffleMode = useCallback(() => setShuffle(!shuffle), [shuffle, setShuffle]);

  const handleToggleFavorite = useCallback(() => {
    if (!currentSong) return;
    toggleFavorite(currentSong);
  }, [currentSong, toggleFavorite]);

  // Quick navigation without affecting album art
  const handlePlayNext = useCallback(() => {
    playNext();
  }, [playNext]);

  const handlePlayPrevious = useCallback(() => {
    playPrevious();
  }, [playPrevious]);

  // ========== SHARE FUNCTION ==========
  const handleShare = useCallback(async () => {
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
        setShowBottomSheet(false);
        Alert.alert('✅ Thành công', 'Đã chia sẻ bài hát!');
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ bài hát');
    }
  }, [currentSong]);

  // ========== DOWNLOAD FUNCTION ==========
  const handleDownload = useCallback(async () => {
    if (!currentSong || !currentSong.preview) {
      Alert.alert('❌ Lỗi', 'Không có link tải về');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện để tải nhạc');
        return;
      }

      setIsDownloading(true);
      setShowBottomSheet(false);

      const fileName = `${currentSong.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      const fileUri = FileSystem.documentDirectory + fileName;

      Alert.alert('⏳ Đang tải...', 'Vui lòng đợi');

      const downloadResumable = FileSystem.createDownloadResumable(
        currentSong.preview,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / (downloadProgress.totalBytesExpectedToWrite || 1);
          console.log(`Download progress: ${(progress * 100).toFixed(0)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
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
  }, [currentSong]);

  // ========== PLAYLIST FUNCTIONS ==========
  const handleAddToPlaylist = useCallback((playlistName) => {
    if (!currentSong) return;

    const success = addToPlaylist(playlistName, currentSong);
    setShowPlaylistModal(false);

    if (success) {
      Alert.alert("✅ Thành công", `Đã thêm "${currentSong.title}" vào playlist "${playlistName}"`);
    } else {
      Alert.alert("⚠️ Thông báo", "Bài hát đã có trong playlist này rồi!");
    }
  }, [currentSong, addToPlaylist]);

  const handleCreateNewPlaylist = useCallback(() => {
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
  }, [newPlaylistName, currentSong, createPlaylist, addToPlaylist]);

  // ========== RENDER HELPERS ==========
  const renderPlaylistItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="musical-notes" size={20} color="#1DB954" />
      <Text style={styles.playlistItemText}>{item}</Text>
      <Text style={styles.playlistItemCount}>
        {playlists[item]?.length || 0} bài
      </Text>
    </TouchableOpacity>
  ), [playlists, handleAddToPlaylist]);

  // Render synced lyrics - optimized for bottom section
  const renderSyncedLyrics = () => {
    if (!lyrics?.synced || !lyrics.syncedLyrics) return null;

    const currentIndex = getCurrentLyricsIndex();

    return (
      <ScrollView
        ref={lyricsScrollRef}
        style={styles.lyricsScroll}
        contentContainerStyle={styles.lyricsContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {lyrics.syncedLyrics.map((line, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;

          return (
            <TouchableOpacity
              key={`${line.time}-${index}`}
              onPress={() => handleSeekToMillis(line.time)}
              activeOpacity={0.7}
            >
              <Animated.Text
                style={[
                  styles.lyricsLine,
                  isActive && styles.lyricsLineActive,
                  isPast && styles.lyricsLinePast,
                ]}
              >
                {line.text}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
        {/* Add bottom padding for better scroll experience */}
        <View style={{ height: 150 }} />
      </ScrollView>
    );
  };

  // Render plain lyrics - optimized for bottom section
  const renderPlainLyrics = () => {
    if (!lyrics?.text) return null;

    return (
      <ScrollView
        style={styles.lyricsScroll}
        contentContainerStyle={styles.lyricsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lyricsText}>{lyrics.text}</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    );
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

  return (
    <View style={styles.container}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <Text style={styles.headerSubtitle}>
            {currentIndex + 1} of {currentPlaylist.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowBottomSheet(true)} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Album Art with smooth transition */}
        <View style={styles.albumContainer}>
          <Animated.View
            style={[
              styles.albumArt,
              {
                opacity: imageLoaded ? imageOpacity : 0.6,
              }
            ]}
          >
            {/* Show previous image or placeholder while loading */}
            {!imageLoaded && currentImageUri && (
              <Image
                source={{ uri: currentImageUri }}
                style={[styles.albumArt, { position: 'absolute' }]}
              />
            )}

            {/* New image */}
            <Image
              source={{ uri: currentSong.cover }}
              style={styles.albumArt}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </Animated.View>
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
            value={sliderValue}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#404040"
            thumbTintColor="#1DB954"
            disabled={!duration}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formattedPosition}</Text>
            <Text style={styles.timeText}>{formattedDuration}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            onPress={toggleShuffleMode}
            style={styles.smallControl}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle" size={24} color={shuffle ? "#1DB954" : "#aaa"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayPrevious}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-back" size={35} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.playButton}
            activeOpacity={0.8}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={35} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayNext}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Ionicons name="play-skip-forward" size={35} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleRepeatMode}
            style={styles.smallControl}
            activeOpacity={0.7}
          >
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

        {/* Lyrics Section - Scrollable */}
        <View style={styles.lyricsSection}>
          {/* Synced Indicator */}
          {lyrics?.synced && (
            <View style={styles.syncedIndicator}>
              <Ionicons name="musical-notes" size={14} color="#1DB954" />
              <Text style={styles.syncedText}>Lời bài hát đồng bộ</Text>
            </View>
          )}

          {loadingLyrics ? (
            <View style={styles.lyricsLoading}>
              <ActivityIndicator size="small" color="#1DB954" />
              <Text style={styles.lyricsLoadingText}>Đang tải lời bài hát...</Text>
            </View>
          ) : lyricsError ? (
            <View style={styles.lyricsError}>
              <Ionicons name="musical-note-outline" size={32} color="#666" />
              <Text style={styles.lyricsErrorText}>{lyricsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchLyrics(currentSong)}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : lyrics?.synced ? (
            renderSyncedLyrics()
          ) : lyrics?.text ? (
            renderPlainLyrics()
          ) : (
            <View style={styles.lyricsEmpty}>
              <Ionicons name="musical-note-outline" size={32} color="#666" />
              <Text style={styles.lyricsEmptyText}>Không có lời bài hát</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sheet Menu */}
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

            <View style={styles.divider} />

            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  handleToggleFavorite();
                  setShowBottomSheet(false);
                }}
                activeOpacity={0.7}
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

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowBottomSheet(false);
                  setTimeout(() => setShowPlaylistModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="list" size={24} color="#fff" />
                <Text style={styles.menuText}>Thêm vào playlist</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text style={styles.menuText}>Chia sẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDownload}
                disabled={isDownloading}
                activeOpacity={0.7}
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

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBottomSheet(false)}
              activeOpacity={0.7}
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
                  activeOpacity={0.7}
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
                  renderItem={renderPlaylistItem}
                  style={{ maxHeight: 300 }}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                />
                <TouchableOpacity
                  style={[styles.newPlaylistBtn, { marginTop: 10 }]}
                  onPress={() => {
                    setShowPlaylistModal(false);
                    setShowNewPlaylistModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={20} color="#1DB954" />
                  <Text style={{ color: "#1DB954", marginLeft: 8 }}>Tạo playlist mới</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { marginTop: 12, backgroundColor: "#444" }]}
              onPress={() => setShowPlaylistModal(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#fff" }}>Đóng</Text>
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
                activeOpacity={0.7}
              >
                <Text style={{ color: "#fff" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#1DB954", flex: 1 }]}
                onPress={handleCreateNewPlaylist}
                activeOpacity={0.7}
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

// Helper function
function formatTime(ms) {
  if (!ms && ms !== 0) return "0:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
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
    backgroundColor: "#222",
  },
  songInfo: { alignItems: "center", marginBottom: 20 },
  songTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  artistName: { color: "#aaa", fontSize: 16, marginTop: 4 },

  // Lyrics Styles - Bottom Section
  lyricsSection: {
    minHeight: 400,
    marginTop: 15,
    marginBottom: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
  },
  syncedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(29, 185, 84, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "#1DB954",
  },
  syncedText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  lyricsScroll: {
    maxHeight: 350,
  },
  lyricsContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  lyricsText: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 24,
    textAlign: "center",
  },
  lyricsLine: {
    color: "#666",
    fontSize: 16,
    lineHeight: 32,
    textAlign: "center",
    marginVertical: 14,
    paddingHorizontal: 10,
    transition: "all 0.3s ease",
  },
  lyricsLineActive: {
    color: "#1DB954",
    fontSize: 22,
    fontWeight: "700",
    transform: [{ scale: 1.08 }],
  },
  lyricsLinePast: {
    color: "#444",
    fontSize: 15,
  },
  lyricsLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  lyricsLoadingText: {
    color: "#aaa",
    marginTop: 10,
    fontSize: 13,
  },
  lyricsError: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  lyricsErrorText: {
    color: "#aaa",
    marginTop: 10,
    fontSize: 13,
  },
  lyricsEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  lyricsEmptyText: {
    color: "#666",
    marginTop: 10,
    fontSize: 13,
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#1DB954",
    borderRadius: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },

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
  playlistItemText: {
    color: "#fff",
    marginLeft: 12,
    flex: 1,
  },
  playlistItemCount: {
    color: "#666",
    fontSize: 12,
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