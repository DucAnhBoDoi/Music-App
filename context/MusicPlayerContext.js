import React, { createContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const MusicPlayerContext = createContext(null);

const FAVORITES_KEY = "@music_favorites";
const PLAYLISTS_KEY = "@music_playlists";
const HISTORY_KEY = "@music_history";

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

  // Sync refs
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { currentPlaylistRef.current = currentPlaylist; }, [currentPlaylist]);

  // Audio setup
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
      if (globalSoundRef.current) globalSoundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  // Load data
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [favData, playlistData, historyData] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(PLAYLISTS_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);

      if (favData) setFavorites(JSON.parse(favData));
      if (playlistData) setPlaylists(JSON.parse(playlistData));
      if (historyData) setHistory(JSON.parse(historyData));
    } catch (error) {
      console.log("❌ Lỗi load dữ liệu:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFavorites = async (data) => { try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(data)); } catch {} };
  const savePlaylists = async (data) => { try { await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data)); } catch {} };
  const saveHistory = async (data) => { try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(data)); } catch {} };

  // Playback status update
  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      setIsPlaying(false);
      return;
    }
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) handleSongEnd();
  };

  const handleSongEnd = () => {
    if (repeatRef.current === "one") {
      globalSoundRef.current?.replayAsync().catch(console.log);
      return;
    }

    const playlist = currentPlaylistRef.current || [];
    if (!playlist.length) return;

    let nextIndex = currentIndexRef.current;
    if (shuffleRef.current) {
      do { nextIndex = Math.floor(Math.random() * playlist.length); } while (nextIndex === currentIndexRef.current && playlist.length > 1);
    } else {
      if (currentIndexRef.current === playlist.length - 1) {
        if (repeatRef.current === "all") nextIndex = 0;
        else return;
      } else nextIndex = currentIndexRef.current + 1;
    }

    setCurrentIndex(nextIndex);
    loadAndPlaySong(playlist[nextIndex]);
  };

  const loadAndPlaySong = async (song) => {
    if (!song || !song.preview) return;

    try {
      if (globalSoundRef.current) await globalSoundRef.current.unloadAsync().catch(() => {});

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.preview },
        { shouldPlay: true, isLooping: false, volume: 1 }
      );

      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      globalSoundRef.current = newSound;
      setCurrentSong(song);
      setIsPlaying(true);

      // Save to history
      setHistory(prev => {
        const exists = prev.find(s => s.id === song.id);
        let updated = exists ? [song, ...prev.filter(s => s.id !== song.id)] : [song, ...prev];
        updated = updated.slice(0, 50);
        saveHistory(updated);
        return updated;
      });

    } catch (error) { console.log("❌ Lỗi load nhạc:", error); }
  };

  const togglePlayPause = async () => {
    if (!globalSoundRef.current) return;
    try {
      const status = await globalSoundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) await globalSoundRef.current.pauseAsync();
      else await globalSoundRef.current.playAsync();
    } catch (error) { console.log(error); }
  };

  const stopPlayback = async () => {
    if (globalSoundRef.current) {
      try {
        await globalSoundRef.current.stopAsync();
        await globalSoundRef.current.unloadAsync();
      } catch (error) { console.log(error); } 
      finally {
        globalSoundRef.current = null;
        setCurrentSong(null);
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
      }
    }
  };

  const playSong = (song, opts = {}) => {
    if (!song) return;
    setCurrentSong(song);
    if (opts.playlist) { setCurrentPlaylist(opts.playlist); currentPlaylistRef.current = opts.playlist; }
    if (typeof opts.index === "number") { setCurrentIndex(opts.index); currentIndexRef.current = opts.index; }
    loadAndPlaySong(song);
  };

  const getSoundRef = () => globalSoundRef.current;

  // Expose context values
  return (
    <MusicPlayerContext.Provider
      value={{
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
        getSoundRef,
        setRepeat,
        setShuffle,
        playNext: handleSongEnd,
        playPrevious: () => {
          const playlist = currentPlaylistRef.current || [];
          if (!playlist.length) return;

          let prevIndex = currentIndexRef.current;
          if (shuffleRef.current) {
            do { prevIndex = Math.floor(Math.random() * playlist.length); } while (prevIndex === currentIndexRef.current && playlist.length > 1);
          } else {
            if (currentIndexRef.current === 0) {
              if (repeatRef.current === "all") prevIndex = playlist.length - 1;
              else { globalSoundRef.current?.setPositionAsync(0).catch(() => {}); return; }
            } else prevIndex = currentIndexRef.current - 1;
          }
          setCurrentIndex(prevIndex);
          loadAndPlaySong(playlist[prevIndex]);
        },
        seekTo: async (value) => {
          if (globalSoundRef.current && duration > 0) {
            try { await globalSoundRef.current.setPositionAsync(Math.floor(value * duration)); } catch {}
          }
        },
        setVolume: async (vol) => {
          if (globalSoundRef.current) {
            try { await globalSoundRef.current.setVolumeAsync(vol); } catch {}
          }
        },
        toggleFavorite: (song) => {
          if (!song) return;
          setFavorites(prev => {
            const exists = prev.find(s => s.id === song.id);
            const updated = exists ? prev.filter(s => s.id !== song.id) : [...prev, song];
            saveFavorites(updated);
            return updated;
          });
        },
        isFavorite: (id) => favorites.some(s => s.id === id),
        createPlaylist: (name) => {
          if (!name?.trim()) return false;
          const trimmed = name.trim();
          setPlaylists(prev => {
            if (prev[trimmed]) return prev;
            const updated = { ...prev, [trimmed]: [] };
            savePlaylists(updated);
            return updated;
          });
          return true;
        },
        deletePlaylist: (name) => {
          setPlaylists(prev => {
            const updated = { ...prev };
            delete updated[name];
            savePlaylists(updated);
            return updated;
          });
        },
        renamePlaylist: (oldName, newName) => {
          if (!oldName || !newName?.trim()) return false;
          const trimmed = newName.trim();
          setPlaylists(prev => {
            if (!prev[oldName] || prev[trimmed]) return prev;
            const updated = { ...prev, [trimmed]: prev[oldName] };
            delete updated[oldName];
            savePlaylists(updated);
            return updated;
          });
          return true;
        },
        addToPlaylist: (playlistName, song) => {
          if (!playlistName || !song) return false;
          setPlaylists(prev => {
            const arr = prev[playlistName] ? [...prev[playlistName]] : [];
            if (!arr.find(s => s.id === song.id)) arr.push(song);
            const updated = { ...prev, [playlistName]: arr };
            savePlaylists(updated);
            return updated;
          });
          return true;
        },
        removeFromPlaylist: (playlistName, songId) => {
          if (!playlistName || !songId) return;
          setPlaylists(prev => {
            const arr = prev[playlistName]?.filter(s => s.id !== songId) || [];
            const updated = { ...prev, [playlistName]: arr };
            savePlaylists(updated);
            return updated;
          });
        },
        getPlaylistSongs: (name) => playlists[name] || [],
        getPlaylistNames: () => Object.keys(playlists),
        clearAllData: async () => {
          try {
            await AsyncStorage.multiRemove([FAVORITES_KEY, PLAYLISTS_KEY, HISTORY_KEY]);
            setFavorites([]); setPlaylists({}); setHistory([]);
          } catch {}
        }
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;
