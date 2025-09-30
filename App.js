// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { MusicPlayerProvider } from "./context/MusicPlayerContext";

// Import screens
import MusicListScreen from "./screens/MusicListScreen";
import PlaylistScreen from "./screens/PlaylistScreen";
import PlaylistDetailScreen from "./screens/PlaylistDetailScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import PlayerScreen from "./screens/PlayerScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1c1c1c",
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 2,
        },
        tabBarActiveTintColor: "#1DB954",
        tabBarInactiveTintColor: "#aaa",
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === "Music") {
            iconName = focused ? "musical-notes" : "musical-notes-outline";
          } else if (route.name === "Playlist") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Favorites") {
            iconName = focused ? "heart" : "heart-outline";
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Music"
        component={MusicListScreen}
        options={{ tabBarLabel: "My Music" }}
      />
      <Tab.Screen
        name="Playlist"
        component={PlaylistStack}
        options={{ tabBarLabel: "Playlist" }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ tabBarLabel: "Favorites" }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator cho Playlist để điều hướng vào chi tiết
function PlaylistStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlaylistHome" component={PlaylistScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MusicPlayerProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeTabs" component={BottomTabs} />
            <Stack.Screen name="Player" component={PlayerScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </MusicPlayerProvider>
    </SafeAreaProvider>
  );
}