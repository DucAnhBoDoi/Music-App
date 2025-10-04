import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { Image } from "react-native";

const MusicPlayerContext = createContext(null);

const FAVORITES_KEY = "@music_favorites";
const PLAYLISTS_KEY = "@music_playlists";
const HISTORY_KEY = "@music_history";

// 🚀 PRELOAD CACHE - Tăng tốc chuyển bài
const audioCache = new Map();
const imageCache = new Set(); // Track preloaded images
const CACHE_SIZE = 3; // Cache 3 bài (previous, current, next)

export const MusicPlayerProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState({});
  const [history, setHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState("none");
  const [shuffle, setShuffle] = useState(false);

  const globalSoundRef = useRef(null);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const currentIndexRef = useRef(currentIndex);
  const currentPlaylistRef = useRef(currentPlaylist);
  const isTransitioningRef = useRef(false); // Prevent double transitions
  const preloadTimerRef = useRef(null);

  // 🧠 Đồng bộ các ref
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { currentPlaylistRef.current = currentPlaylist; }, [currentPlaylist]);

  // ⚙️ Cấu hình Audio
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
      clearPreloadTimer();
      clearAudioCache();
      if (globalSoundRef.current) {
        globalSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // 🧹 Clear cache helper
  const clearAudioCache = () => {
    audioCache.forEach((sound) => {
      if (sound) sound.unloadAsync().catch(() => {});
    });
    audioCache.clear();
    imageCache.clear();
  };

  const clearPreloadTimer = () => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }
  };

  // 🧩 Hàm refresh preview Deezer (optimized)
  const refreshPreview = useCallback(async (song) => {
    try {
      const res = await fetch(`https://api.deezer.com/track/${song.id}`);
      const data = await res.json();
      return {
        ...song,
        preview: data.preview,
        cover: data.album?.cover_medium || song.cover,
        artist: data.artist?.name || song.artist,
      };
    } catch (err) {
      console.log("⚠️ Không thể refresh preview:", err);
      return song;
    }
  }, []);

  // 🧩 Làm mới preview toàn bộ
  const refreshStoredData = async (arr) => {
    const refreshed = await Promise.all(arr.map(refreshPreview));
    return refreshed;
  };

  // 🧱 Load dữ liệu (Favorites, Playlists, History)
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [favData, playlistData, historyData] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(PLAYLISTS_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);

      if (favData) {
        const parsed = JSON.parse(favData);
        setFavorites(await refreshStoredData(parsed));
      }
      if (playlistData) {
        const parsed = JSON.parse(playlistData);
        const refreshedPlaylists = {};
        for (let name in parsed) {
          refreshedPlaylists[name] = await refreshStoredData(parsed[name]);
        }
        setPlaylists(refreshedPlaylists);
      }
      if (historyData) {
        const parsed = JSON.parse(historyData);
        setHistory(await refreshStoredData(parsed));
      }
    } catch (error) {
      console.log("❌ Lỗi load dữ liệu:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFavorites = async (data) => {
    try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(data)); } catch {}
  };
  const savePlaylists = async (data) => {
    try { await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data)); } catch {}
  };
  const saveHistory = async (data) => {
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(data)); } catch {}
  };

  // 📦 Cập nhật trạng thái phát nhạc (optimized)
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) {
      setIsPlaying(false);
      return;
    }
    
    // Batch updates để giảm re-render
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    
    if (status.didJustFinish && !isTransitioningRef.current) {
      handleSongEnd();
    }
  }, []);

  // 🚀 PRELOAD NEXT/PREV SONGS + IMAGES
  const preloadAdjacentSongs = useCallback(async (index, playlist) => {
    if (!playlist || playlist.length === 0) return;

    clearPreloadTimer();
    
    // Delay preload để không ảnh hưởng bài hiện tại
    preloadTimerRef.current = setTimeout(async () => {
      try {
        const songsToPreload = [];
        
        // Next song
        const nextIndex = (index + 1) % playlist.length;
        if (playlist[nextIndex]) songsToPreload.push(playlist[nextIndex]);
        
        // Previous song
        const prevIndex = index === 0 ? playlist.length - 1 : index - 1;
        if (playlist[prevIndex] && prevIndex !== nextIndex) {
          songsToPreload.push(playlist[prevIndex]);
        }

        // Preload audio + images in parallel
        await Promise.all(songsToPreload.map(async (song) => {
          // Preload image first (faster)
          if (song.cover && !imageCache.has(song.cover)) {
            Image.prefetch(song.cover)
              .then(() => {
                imageCache.add(song.cover);
                console.log(`🖼️ Preloaded image: ${song.title}`);
              })
              .catch(() => {});
          }

          // Preload audio
          if (!audioCache.has(song.id) && song.preview) {
            try {
              const { sound } = await Audio.Sound.createAsync(
                { uri: song.preview },
                { shouldPlay: false, volume: 0 }
              );
              
              // Maintain cache size
              if (audioCache.size >= CACHE_SIZE) {
                const firstKey = audioCache.keys().next().value;
                const oldSound = audioCache.get(firstKey);
                if (oldSound) oldSound.unloadAsync().catch(() => {});
                audioCache.delete(firstKey);
              }
              
              audioCache.set(song.id, sound);
              console.log(`🎵 Preloaded audio: ${song.title}`);
            } catch (err) {
              console.log(`⚠️ Failed to preload audio: ${song.title}`);
            }
          }
        }));
      } catch (error) {
        console.log("⚠️ Preload error:", error);
      }
    }, 1500); // Reduced to 1.5s for faster preload
  }, []);

  // 🔁 Xử lý hết bài (optimized)
  const handleSongEnd = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (repeatRef.current === "one") {
      globalSoundRef.current?.replayAsync().catch(console.log);
      isTransitioningRef.current = false;
      return;
    }

    const playlist = currentPlaylistRef.current || [];
    if (!playlist.length) {
      isTransitioningRef.current = false;
      return;
    }

    let nextIndex = currentIndexRef.current;
    if (shuffleRef.current) {
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentIndexRef.current && playlist.length > 1);
    } else {
      if (currentIndexRef.current === playlist.length - 1) {
        if (repeatRef.current === "all") nextIndex = 0;
        else {
          isTransitioningRef.current = false;
          return;
        }
      } else nextIndex = currentIndexRef.current + 1;
    }

    setCurrentIndex(nextIndex);
    loadAndPlaySong(playlist[nextIndex]);
  }, []);

  // 🎧 Hàm phát nhạc chính (ULTRA OPTIMIZED với cache)
  const loadAndPlaySong = useCallback(async (song) => {
    if (!song) {
      isTransitioningRef.current = false;
      return;
    }

    try {
      // 🖼️ Preload current song image immediately for instant display
      if (song.cover && !imageCache.has(song.cover)) {
        Image.prefetch(song.cover)
          .then(() => imageCache.add(song.cover))
          .catch(() => {});
      }

      // Check if song is preloaded
      let cachedSound = audioCache.get(song.id);
      
      // Validate preview URL
      const checkPreviewValid = async (url) => {
        try {
          const res = await fetch(url, { method: "HEAD" });
          return res.ok;
        } catch {
          return false;
        }
      };

      let songToPlay = song;
      if (!song.preview || !(await checkPreviewValid(song.preview))) {
        console.log("⚠️ Preview hết hạn, đang làm mới...");
        songToPlay = await refreshPreview(song);
        cachedSound = null; // Invalidate cache
      }

      // Stop old sound
      const oldSound = globalSoundRef.current;
      if (oldSound) {
        try {
          const status = await oldSound.getStatusAsync();
          if (status.isLoaded) {
            await oldSound.stopAsync();
            await oldSound.unloadAsync();
          }
        } catch (e) {
          console.log("⚠️ Lỗi unload sound cũ:", e);
        }
      }

      let newSound;
      
      // Use cached sound if available
      if (cachedSound) {
        console.log(`🚀 Using cached sound: ${songToPlay.title}`);
        newSound = cachedSound;
        audioCache.delete(song.id); // Remove from cache as it's now active
        
        // Reset and play
        await newSound.setPositionAsync(0);
        await newSound.setVolumeAsync(1);
        await newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        await newSound.playAsync();
      } else {
        // Load new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: songToPlay.preview },
          { shouldPlay: true, isLooping: false, volume: 1 },
          onPlaybackStatusUpdate
        );
        newSound = sound;
      }

      globalSoundRef.current = newSound;
      setCurrentSong(songToPlay);
      setIsPlaying(true);

      // Preload adjacent songs
      const index = currentIndexRef.current;
      const playlist = currentPlaylistRef.current;
      preloadAdjacentSongs(index, playlist);

      // Save to history (debounced)
      setHistory((prev) => {
        const exists = prev.find((s) => s.id === songToPlay.id);
        let updated = exists
          ? [songToPlay, ...prev.filter((s) => s.id !== songToPlay.id)]
          : [songToPlay, ...prev];
        updated = updated.slice(0, 50);
        saveHistory(updated);
        return updated;
      });
      
      isTransitioningRef.current = false;
    } catch (error) {
      console.log("❌ Lỗi load nhạc:", error);
      isTransitioningRef.current = false;
    }
  }, [onPlaybackStatusUpdate, refreshPreview, preloadAdjacentSongs]);

  // 🎵 Play song (optimized)
  const playSong = useCallback((song, opts = {}) => {
    if (!song) return;
    
    setCurrentSong(song);
    if (opts.playlist) {
      setCurrentPlaylist(opts.playlist);
      currentPlaylistRef.current = opts.playlist;
    }
    if (typeof opts.index === "number") {
      setCurrentIndex(opts.index);
      currentIndexRef.current = opts.index;
    }
    loadAndPlaySong(song);
  }, [loadAndPlaySong]);

  // ⏯️ Toggle play/pause (optimized)
  const togglePlayPause = useCallback(async () => {
    if (!globalSoundRef.current) return;
    try {
      const status = await globalSoundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      
      if (status.isPlaying) {
        await globalSoundRef.current.pauseAsync();
      } else {
        await globalSoundRef.current.playAsync();
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  // ⏹️ Stop playback
  const stopPlayback = useCallback(async () => {
    if (globalSoundRef.current) {
      try {
        await globalSoundRef.current.stopAsync();
        await globalSoundRef.current.unloadAsync();
      } catch (error) {
        console.log(error);
      } finally {
        globalSoundRef.current = null;
        setCurrentSong(null);
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
      }
    }
  }, []);

  // ⏭️ Play next (optimized)
  const playNext = useCallback(() => {
    if (isTransitioningRef.current) return;
    handleSongEnd();
  }, [handleSongEnd]);

  // ⏮️ Play previous (optimized)
  const playPrevious = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const playlist = currentPlaylistRef.current || [];
    if (!playlist.length) {
      isTransitioningRef.current = false;
      return;
    }

    let prevIndex = currentIndexRef.current;
    if (shuffleRef.current) {
      do {
        prevIndex = Math.floor(Math.random() * playlist.length);
      } while (prevIndex === currentIndexRef.current && playlist.length > 1);
    } else {
      if (currentIndexRef.current === 0) {
        if (repeatRef.current === "all") {
          prevIndex = playlist.length - 1;
        } else {
          globalSoundRef.current?.setPositionAsync(0).catch(() => {});
          isTransitioningRef.current = false;
          return;
        }
      } else {
        prevIndex = currentIndexRef.current - 1;
      }
    }
    
    setCurrentIndex(prevIndex);
    loadAndPlaySong(playlist[prevIndex]);
  }, [loadAndPlaySong]);

  // 🎚️ Seek (optimized)
  const seekTo = useCallback(async (value) => {
    if (globalSoundRef.current && duration > 0) {
      try {
        await globalSoundRef.current.setPositionAsync(Math.floor(value * duration));
      } catch {}
    }
  }, [duration]);

  // 🔊 Volume (optimized)
  const setVolume = useCallback(async (vol) => {
    if (globalSoundRef.current) {
      try {
        await globalSoundRef.current.setVolumeAsync(vol);
      } catch {}
    }
  }, []);

  // ❤️ Toggle favorite (optimized)
  const toggleFavorite = useCallback((song) => {
    if (!song) return;
    setFavorites((prev) => {
      const exists = prev.find((s) => s.id === song.id);
      const updated = exists
        ? prev.filter((s) => s.id !== song.id)
        : [...prev, song];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  // Check favorite (memoized)
  const isFavorite = useCallback((id) => {
    return favorites.some((s) => s.id === id);
  }, [favorites]);

  // 📝 Playlist management (optimized)
  const createPlaylist = useCallback((name) => {
    if (!name?.trim()) return false;
    const trimmed = name.trim();
    
    let success = false;
    setPlaylists((prev) => {
      if (prev[trimmed]) return prev;
      success = true;
      const updated = { ...prev, [trimmed]: [] };
      savePlaylists(updated);
      return updated;
    });
    return success;
  }, []);

  const deletePlaylist = useCallback((name) => {
    setPlaylists((prev) => {
      const updated = { ...prev };
      delete updated[name];
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const renamePlaylist = useCallback((oldName, newName) => {
    if (!oldName || !newName?.trim()) return false;
    const trimmed = newName.trim();
    
    let success = false;
    setPlaylists((prev) => {
      if (!prev[oldName] || prev[trimmed]) return prev;
      success = true;
      const updated = { ...prev, [trimmed]: prev[oldName] };
      delete updated[oldName];
      savePlaylists(updated);
      return updated;
    });
    return success;
  }, []);

  const addToPlaylist = useCallback((playlistName, song) => {
    if (!playlistName || !song) return false;
    
    const songToSave = { 
      id: song.id, 
      title: song.title, 
      artist: song.artist, 
      cover: song.cover,
      preview: song.preview 
    };
    
    let success = false;
    setPlaylists((prev) => {
      const arr = prev[playlistName] ? [...prev[playlistName]] : [];
      if (arr.find((s) => s.id === song.id)) return prev;
      
      success = true;
      arr.push(songToSave);
      const updated = { ...prev, [playlistName]: arr };
      savePlaylists(updated);
      return updated;
    });
    return success;
  }, []);

  const removeFromPlaylist = useCallback((playlistName, songId) => {
    if (!playlistName || !songId) return;
    setPlaylists((prev) => {
      const arr = prev[playlistName]?.filter((s) => s.id !== songId) || [];
      const updated = { ...prev, [playlistName]: arr };
      savePlaylists(updated);
      return updated;
    });
  }, []);

  const getPlaylistSongs = useCallback((name) => playlists[name] || [], [playlists]);
  const getPlaylistNames = useCallback(() => Object.keys(playlists), [playlists]);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        FAVORITES_KEY,
        PLAYLISTS_KEY,
        HISTORY_KEY,
      ]);
      setFavorites([]);
      setPlaylists({});
      setHistory([]);
      clearAudioCache();
    } catch {}
  }, []);

  // 🎯 Memoized context value
  const contextValue = useMemo(() => ({
    favorites,
    playlists,
    history,
    isLoaded,
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
    stopPlayback,
    getSoundRef: () => globalSoundRef.current,
    setRepeat,
    setShuffle,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleFavorite,
    isFavorite,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    getPlaylistSongs,
    getPlaylistNames,
    clearAllData,
  }), [
    favorites,
    playlists,
    history,
    isLoaded,
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
    stopPlayback,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleFavorite,
    isFavorite,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    getPlaylistSongs,
    getPlaylistNames,
    clearAllData,
  ]);

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;