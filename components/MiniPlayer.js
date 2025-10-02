// components/MiniPlayer.js
import React, { useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function MiniPlayer() {
  const navigation = useNavigation();
  const {
    currentSong,
    currentPlaylist,
    currentIndex,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    playNext,
    stopPlayback,
  } = useContext(MusicPlayerContext);

  if (!currentSong) return null;

  const handlePress = () => {
    // Navigate về PlayerScreen với current state
    navigation.navigate("Player", {
      song: currentSong,
      playlist: currentPlaylist,
      currentIndex: currentIndex,
    });
  };

  const handlePlayPause = (e) => {
    e.stopPropagation();
    togglePlayPause();
  };

  const handleNext = (e) => {
    e.stopPropagation();
    playNext();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    stopPlayback();
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${progressPercentage}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Album art + Info */}
        <View style={styles.leftSection}>
          <Image 
            source={{ uri: currentSong.cover }} 
            style={styles.albumArt}
          />
          <View style={styles.songInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handlePlayPause}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleNext}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="play-skip-forward" 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleClose}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color="#aaa" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60, // Đặt trên tab bar (60px)
    left: 0,
    right: 0,
    backgroundColor: "#282828",
    borderTopWidth: 1,
    borderTopColor: "#333",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  progressBar: {
    height: 2,
    backgroundColor: "#404040",
    width: "100%",
  },
  progress: {
    height: "100%",
    backgroundColor: "#1DB954",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  songInfo: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  artist: {
    color: "#aaa",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlButton: {
    padding: 4,
  },
});