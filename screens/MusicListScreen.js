// screens/MusicListScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
} from "react-native";
import SongItem from "../components/SongItem";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function MusicListScreen() {
    const [search, setSearch] = useState("");
    const [songsData, setSongsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const { history } = useContext(MusicPlayerContext); // lấy history để gợi ý

    const fetchSongs = async () => {
    try {
        setLoading(true);
        const response = await fetch("https://api.deezer.com/chart/2/tracks?limit=50");
        const result = await response.json();

        const formattedSongs = result.data.map((track) => ({
            id: track.id.toString(),
            title: track.title,
            artist: track.artist.name,
            cover: track.album.cover_medium || track.album.cover_small,
            duration: track.duration,
            preview: track.preview,
        }));

        setSongsData(formattedSongs);
    } catch (error) {
        console.log("Error fetching songs from Deezer:", error);
        setSongsData([
            {
                id: "1",
                title: "Hello",
                artist: "Adele",
                cover: "https://cdns-images.dzcdn.net/images/cover/2e018122cb56986277102d2041a592c8/250x250-000000-80-0-0.jpg",
                preview: "",
            },
        ]);
    } finally {
        setLoading(false);
    }
};


    const searchSongs = async (query) => {
        if (!query.trim()) {
            fetchSongs();
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(
                `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`
            );
            const result = await response.json();

            const formattedSongs = result.data.map((track) => ({
                id: track.id.toString(),
                title: track.title,
                artist: track.artist.name,
                cover: track.album.cover_medium || track.album.cover_small,
                duration: track.duration,
                preview: track.preview,
            }));

            setSongsData(formattedSongs);
        } catch (error) {
            console.log("Error searching songs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSongs();
    }, []);

    // debounce 500ms
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (search) searchSongs(search);
            else fetchSongs();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const suggestedSongs = history?.slice(0, 5) || [];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={true} />

            <View style={styles.container}>
                <Text style={styles.header}>My Music</Text>

                {suggestedSongs.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={styles.subHeader}>Gợi ý cho bạn</Text>
                        <FlatList
                            data={suggestedSongs}
                            horizontal
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => (
                                <SongItem song={item} playlist={suggestedSongs} songIndex={index} />
                            )}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 16 }}  // cách mép phải
                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />} // khoảng cách giữa các item
                        />

                    </View>
                )}

                <TextInput
                    style={styles.searchBar}
                    placeholder="Tìm bài hát hoặc ca sĩ..."
                    placeholderTextColor="#555"
                    value={search}
                    onChangeText={setSearch}
                />

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Đang tải nhạc...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={songsData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <SongItem song={item} playlist={songsData} songIndex={index} />
                        )}
                        showsVerticalScrollIndicator={false}
                        onRefresh={fetchSongs}
                        refreshing={loading}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#121212",
    },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginTop: 20,
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 12,
    },
    subHeader: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1DB954",
        marginBottom: 8,
    },
    searchBar: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 10,
        marginBottom: 16,
        color: "#000",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: "#fff",
        marginTop: 10,
        fontSize: 16,
    },
});
