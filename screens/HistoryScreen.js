import React, { useContext } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import SongItem from "../components/SongItem";
import MusicPlayerContext from "../context/MusicPlayerContext";

export default function HistoryScreen() {
  const { history } = useContext(MusicPlayerContext);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={true} />
      <View style={styles.container}>
        <Text style={styles.header}>My History</Text>

        {(!history || history.length === 0) ? (
          <Text style={{ color: "#aaa", marginTop: 20 }}>Bạn chưa nghe bài hát nào.</Text>
        ) : (
          <FlatList
            data={history.slice().reverse()}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => <SongItem song={item} playlist={history} songIndex={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1, padding: 16 },
  header: { marginTop: 20, fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 12 },
});
