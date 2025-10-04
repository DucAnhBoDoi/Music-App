import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function SongItem({ song, playlist, songIndex }) {
  const navigation = useNavigation();
  const { playSong } = useContext(MusicPlayerContext);

  const [imageError, setImageError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current; // hiệu ứng nhấn nhanh

  // Format thời gian từ giây sang mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // ✅ Xử lý play cực nhanh
  const handlePlay = async () => {
    if (isPressed) return; // tránh double click
    setIsPressed(true);

    // Hiệu ứng phản hồi tức thì
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    console.log("🎵 Playing song:", song.title);

    // ⚡ Phát nhạc ngay (song song với điều hướng)
    playSong(song, {
      playlist: playlist || [song],
      index: songIndex || 0,
      instant: true, // cờ cho phép phát tức thì (nếu context có preload)
    });

    // ⚡ Chuyển màn song song, không đợi play hoàn thành
    navigation.navigate("Player", {
      song,
      playlist: playlist || [song],
      currentIndex: songIndex || 0,
    });

    // reset click
    setTimeout(() => setIsPressed(false), 350);
  };

  const handleImageError = () => setImageError(true);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={0.8}
        onPress={handlePlay}
      >
        {/* Ảnh bìa */}
        <View style={styles.coverContainer}>
          {imageError ? (
            <View style={[styles.cover, styles.errorCover]}>
              <Ionicons name="musical-notes" size={24} color="#666" />
            </View>
          ) : (
            <Image
              source={{ uri: song.cover }}
              style={styles.cover}
              onError={handleImageError}
            />
          )}
        </View>

        {/* Thông tin bài hát */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <View style={styles.artistContainer}>
            <Text style={styles.artist} numberOfLines={1}>
              {song.artist}
            </Text>
            {song.duration && (
              <Text style={styles.duration}>
                • {formatDuration(song.duration)}
              </Text>
            )}
          </View>
        </View>

        {/* Nút Play */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlay}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="play-circle-outline" size={32} color="#1DB954" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  touchArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  coverContainer: {
    marginRight: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  errorCover: {
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  artistContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  artist: {
    color: "#aaa",
    fontSize: 14,
    flex: 1,
  },
  duration: {
    color: "#666",
    fontSize: 12,
    marginLeft: 8,
  },
  playButton: {
    padding: 4,
  },
});
