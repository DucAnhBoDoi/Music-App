// context/MusicPlayerContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MusicPlayerContext = createContext(null);

const FAVORITES_KEY = "@music_favorites";
const PLAYLISTS_KEY = "@music_playlists";

export const MusicPlayerProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState({}); // { "playlistName": [song1, song2...] }
  const [currentSong, setCurrentSongState] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // ========== LOAD DỮ LIỆU TỪ ASYNCSTORAGE ==========
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favData, playlistData] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(PLAYLISTS_KEY),
      ]);

      if (favData) {
        setFavorites(JSON.parse(favData));
      }
      if (playlistData) {
        setPlaylists(JSON.parse(playlistData));
      }
      setIsLoaded(true);
    } catch (error) {
      console.log("❌ Lỗi load dữ liệu:", error);
      setIsLoaded(true);
    }
  };

  // ========== LƯU FAVORITES ==========
  const saveFavorites = async (data) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
    } catch (error) {
      console.log("❌ Lỗi lưu favorites:", error);
    }
  };

  // ========== LƯU PLAYLISTS ==========
  const savePlaylists = async (data) => {
    try {
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data));
    } catch (error) {
      console.log("❌ Lỗi lưu playlists:", error);
    }
  };

  // ========== QUẢN LÝ BÀI HÁT HIỆN TẠI ==========
  const setCurrentSong = (song, opts = {}) => {
    setCurrentSongState(song);
    if (opts.playlist) setCurrentPlaylist(opts.playlist);
    if (typeof opts.index === "number") setCurrentIndex(opts.index);
  };

  // ========== QUẢN LÝ YÊU THÍCH ==========
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

  // ========== QUẢN LÝ PLAYLIST ==========
  const createPlaylist = (name) => {
    if (!name || !name.trim()) return false;
    const trimmedName = name.trim();
    
    setPlaylists((prev) => {
      if (prev[trimmedName]) return prev; // Đã tồn tại
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
      
      // Kiểm tra trùng lặp
      if (arr.find((s) => s.id === song.id)) {
        return prev; // Đã tồn tại
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

  // ========== XÓA TẤT CẢ DỮ LIỆU (cho debug) ==========
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
        currentSong,
        currentPlaylist,
        currentIndex,
        isLoaded,
        
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
        
        // Current song
        setCurrentSong,
        
        // Utils
        clearAllData,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;