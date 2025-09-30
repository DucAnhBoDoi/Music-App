// screens/MusicListScreen.js
import React, { useState, useEffect } from "react";
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

export default function MusicListScreen() {
    const [search, setSearch] = useState("");
    const [songsData, setSongsData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSongs = async () => {
        try {
            setLoading(true);
            const response = await fetch("https://api.deezer.com/chart/0/tracks?limit=20");
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
                    title: "Blinding Lights",
                    artist: "The Weeknd",
                    cover: "https://cdns-images.dzcdn.net/images/cover/ec3c8ed67427064c70f67e5815b74cef/250x250-000000-80-0-0.jpg",
                },
                {
                    id: "2",
                    title: "Shape of You",
                    artist: "Ed Sheeran",
                    cover: "https://cdns-images.dzcdn.net/images/cover/56d51ebcfaa73fa6fa9b151adc5c57ba/250x250-000000-80-0-0.jpg",
                },
                {
                    id: "3",
                    title: "Someone Like You",
                    artist: "Adele",
                    cover: "https://cdns-images.dzcdn.net/images/cover/2e018122cb56986277102d2041a592c8/250x250-000000-80-0-0.jpg",
                },
                {
                    id: "4",
                    title: "Bohemian Rhapsody",
                    artist: "Queen",
                    cover: "https://cdns-images.dzcdn.net/images/cover/e2b36a9fda865cb2e9ed4e15f6578da9/250x250-000000-80-0-0.jpg",
                },
                {
                    id: "5",
                    title: "Bad Guy",
                    artist: "Billie Eilish",
                    cover: "https://cdns-images.dzcdn.net/images/cover/ec0679956a4e6c0fc79aa4b7b5b2b846/250x250-000000-80-0-0.jpg",
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

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (search) {
                searchSongs(search);
            } else {
                fetchSongs();
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [search]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* ✅ StatusBar trên */}
            <StatusBar
                barStyle="light-content"
                backgroundColor="#121212"
                translucent={true}
            />

            <View style={styles.container}>
                <Text style={styles.header}>My Music</Text>

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
        backgroundColor: "#121212", // phủ cả trên + dưới
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
