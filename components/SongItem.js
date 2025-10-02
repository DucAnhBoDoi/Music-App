// components/SongItem.js
import React, { useState, useContext } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function SongItem({ song, playlist, songIndex }) {
  const navigation = useNavigation();
  const { playSong } = useContext(MusicPlayerContext);
  const [imageError, setImageError] = useState(false);

  // Hàm format thời gian từ giây sang mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Hàm xử lý khi bấm play
  const handlePlay = () => {
    console.log('🎵 Playing song:', song.title);
    
    // Phát nhạc qua context (nhạc sẽ chạy ngay lập tức)
    playSong(song, {
      playlist: playlist || [song],
      index: songIndex || 0
    });

    // Navigate đến PlayerScreen
    navigation.navigate('Player', {
      song: song,
      playlist: playlist || [song],
      currentIndex: songIndex || 0
    });
  };

  // Fallback image khi lỗi
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePlay}>
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

      {/* Nút play */}
      <TouchableOpacity 
        style={styles.playButton} 
        onPress={handlePlay}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="play-circle-outline" size={32} color="#1DB954" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coverContainer: {
    marginRight: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  errorCover: {
    backgroundColor: "#333",
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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