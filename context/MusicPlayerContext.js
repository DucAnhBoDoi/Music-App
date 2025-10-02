// context/MusicPlayerContext.js
import React, { createContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const MusicPlayerContext = createContext(null);

const FAVORITES_KEY = "@music_favorites";
const PLAYLISTS_KEY = "@music_playlists";

export const MusicPlayerProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  // ========== GLOBAL PLAYBACK STATE ==========
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState("none");
  const [shuffle, setShuffle] = useState(false);

  // Global sound ref - QUAN TRỌNG: Giữ sound sống khi PlayerScreen unmount
  const globalSoundRef = useRef(null);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const currentIndexRef = useRef(currentIndex);
  const currentPlaylistRef = useRef(currentPlaylist);

  // Sync refs
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { currentPlaylistRef.current = currentPlaylist; }, [currentPlaylist]);

  // ========== AUDIO SETUP ==========
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
      if (globalSoundRef.current) {
        globalSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favData, playlistData] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(PLAYLISTS_KEY),
      ]);

      if (favData) setFavorites(JSON.parse(favData));
      if (playlistData) setPlaylists(JSON.parse(playlistData));
      setIsLoaded(true);
    } catch (error) {
      console.log("❌ Lỗi load dữ liệu:", error);
      setIsLoaded(true);
    }
  };

  const saveFavorites = async (data) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
    } catch (error) {
      console.log("❌ Lỗi lưu favorites:", error);
    }
  };

  const savePlaylists = async (data) => {
    try {
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data));
    } catch (error) {
      console.log("❌ Lỗi lưu playlists:", error);
    }
  };

  // ========== PLAYBACK STATUS CALLBACK ==========
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        handleSongEnd();
      }
    } else {
      setIsPlaying(false);
    }
  };

  // ========== HANDLE SONG END ==========
  const handleSongEnd = () => {
    if (repeatRef.current === "one") {
      if (globalSoundRef.current) {
        globalSoundRef.current.replayAsync().catch(console.log);
      }
      return;
    }

    const playlist = currentPlaylistRef.current || [];
    const len = playlist.length;
    const cur = currentIndexRef.current;

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

    setCurrentIndex(nextIndex);
    loadAndPlaySong(playlist[nextIndex]);
  };

  // ========== LOAD AND PLAY SONG ==========
  const loadAndPlaySong = async (song) => {
    if (!song || !song.preview) {
      console.log("❌ Không có preview URL");
      return;
    }

    try {
      // Unload sound cũ nếu có
      if (globalSoundRef.current) {
        await globalSoundRef.current.unloadAsync().catch(() => {});
      }

      // Load sound mới
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.preview },
        { shouldPlay: true, isLooping: false, volume: 1 }
      );

      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      globalSoundRef.current = newSound;
      setCurrentSong(song);
    } catch (error) {
      console.log("❌ Lỗi load nhạc:", error);
    }
  };

  // ========== PLAY/PAUSE ==========
  const togglePlayPause = async () => {
    if (!globalSoundRef.current) return;
    
    try {
      const status = await globalSoundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await globalSoundRef.current.pauseAsync();
        } else {
          await globalSoundRef.current.playAsync();
        }
      }
    } catch (error) {
      console.log("❌ Lỗi play/pause:", error);
    }
  };

  // ========== PLAY NEXT ==========
  const playNext = () => {
    const playlist = currentPlaylistRef.current || [];
    if (!playlist.length) return;

    let nextIndex = currentIndexRef.current;
    
    if (shuffleRef.current) {
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentIndexRef.current && playlist.length > 1);
    } else {
      if (currentIndexRef.current === playlist.length - 1) {
        if (repeatRef.current === "all") nextIndex = 0;
        else return;
      } else {
        nextIndex = currentIndexRef.current + 1;
      }
    }

    setCurrentIndex(nextIndex);
    loadAndPlaySong(playlist[nextIndex]);
  };

  // ========== PLAY PREVIOUS ==========
  const playPrevious = () => {
    const playlist = currentPlaylistRef.current || [];
    if (!playlist.length) return;

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
          if (globalSoundRef.current) {
            globalSoundRef.current.setPositionAsync(0).catch(() => {});
          }
          return;
        }
      } else {
        prevIndex = currentIndexRef.current - 1;
      }
    }

    setCurrentIndex(prevIndex);
    loadAndPlaySong(playlist[prevIndex]);
  };

  // ========== SEEK ==========
  const seekTo = async (value) => {
    if (globalSoundRef.current && duration > 0) {
      const pos = Math.floor(value * duration);
      try {
        await globalSoundRef.current.setPositionAsync(pos);
      } catch (error) {
        console.log("❌ Lỗi seek:", error);
      }
    }
  };

  // ========== SET VOLUME ==========
  const setVolume = async (vol) => {
    if (globalSoundRef.current) {
      try {
        await globalSoundRef.current.setVolumeAsync(vol);
      } catch (error) {
        console.log("❌ Lỗi set volume:", error);
      }
    }
  };

  // ========== PLAY SONG (được gọi từ SongItem/PlayerScreen) ==========
  const playSong = (song, opts = {}) => {
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
  };

  // ========== STOP PLAYBACK ==========
  const stopPlayback = async () => {
    if (globalSoundRef.current) {
      try {
        await globalSoundRef.current.stopAsync();
        await globalSoundRef.current.unloadAsync();
        globalSoundRef.current = null;
        setCurrentSong(null);
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
      } catch (error) {
        console.log("❌ Lỗi stop:", error);
      }
    }
  };

  // ========== GET SOUND REF (cho PlayerScreen control) ==========
  const getSoundRef = () => globalSoundRef.current;

  // ========== FAVORITES ==========
  const toggleFavorite = (song) => {
    if (!song) return;
    setFavorites((prev) => {
      const exists = prev.find((s) => s.id === song.id);
      let updated;
      if (exists) {
        updated = prev.filter((s) => s.id !== song.id);
      } else {
        updated = [...prev, song];
      }
      saveFavorites(updated);
      return updated;
    });
  };

  const isFavorite = (songId) => {
    return favorites.some((s) => s.id === songId);
  };

  // ========== PLAYLISTS ==========
  const createPlaylist = (name) => {
    if (!name || !name.trim()) return false;
    const trimmedName = name.trim();
    
    setPlaylists((prev) => {
      if (prev[trimmedName]) return prev;
      const updated = { ...prev, [trimmedName]: [] };
      savePlaylists(updated);
      return updated;
    });
    return true;
  };

  const deletePlaylist = (name) => {
    if (!name) return;
    setPlaylists((prev) => {
      const updated = { ...prev };
      delete updated[name];
      savePlaylists(updated);
      return updated;
    });
  };

  const renamePlaylist = (oldName, newName) => {
    if (!oldName || !newName || !newName.trim()) return false;
    const trimmedNewName = newName.trim();
    
    setPlaylists((prev) => {
      if (!prev[oldName] || prev[trimmedNewName]) return prev;
      const updated = { ...prev };
      updated[trimmedNewName] = prev[oldName];
      delete updated[oldName];
      savePlaylists(updated);
      return updated;
    });
    return true;
  };

  const addToPlaylist = (playlistName, song) => {
    if (!playlistName || !song) return false;
    
    setPlaylists((prev) => {
      const arr = prev[playlistName] ? [...prev[playlistName]] : [];
      
      if (arr.find((s) => s.id === song.id)) {
        return prev;
      }
      
      arr.push(song);
      const updated = { ...prev, [playlistName]: arr };
      savePlaylists(updated);
      return updated;
    });
    return true;
  };

  const removeFromPlaylist = (playlistName, songId) => {
    if (!playlistName || !songId) return;
    
    setPlaylists((prev) => {
      const arr = prev[playlistName] 
        ? prev[playlistName].filter((s) => s.id !== songId) 
        : [];
      const updated = { ...prev, [playlistName]: arr };
      savePlaylists(updated);
      return updated;
    });
  };

  const getPlaylistSongs = (playlistName) => {
    return playlists[playlistName] || [];
  };

  const getPlaylistNames = () => {
    return Object.keys(playlists);
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([FAVORITES_KEY, PLAYLISTS_KEY]);
      setFavorites([]);
      setPlaylists({});
    } catch (error) {
      console.log("❌ Lỗi xóa dữ liệu:", error);
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        // State
        favorites,
        playlists,
        isLoaded,
        
        // Playback state
        currentSong,
        currentPlaylist,
        currentIndex,
        isPlaying,
        position,
        duration,
        repeat,
        shuffle,
        
        // Playback controls
        playSong,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        setVolume,
        stopPlayback,
        getSoundRef,
        setRepeat,
        setShuffle,
        
        // Favorites
        toggleFavorite,
        isFavorite,
        
        // Playlists
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        getPlaylistSongs,
        getPlaylistNames,
        
        // Utils
        clearAllData,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;