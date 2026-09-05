import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function RootLayout() {
  useEffect(() => {
    // Remote push notifications are not supported by Expo Go on Android.
    // Keep the app fully usable in Expo Go and register push tokens only
    // in a native/development build where expo-notifications is available.
    if (Platform.OS === "web" || Platform.OS === "android" || !API) return;

    let mounted = true;
    let done = false;

    const register = async () => {
      try {
        if (done) return;

        const Notifications = await import("expo-notifications");
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) return;

        const current = await Notifications.getPermissionsAsync();
        let status = current.status;

        if (status !== "granted") {
          if (status === "denied") return;
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }

        if (!mounted || status !== "granted") return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId;
        if (!projectId) return;

        const push = (
          await Notifications.getExpoPushTokenAsync({ projectId })
        ).data;
        if (!push) return;

        const previous = await AsyncStorage.getItem("registered_push_token");
        if (previous === push) {
          done = true;
          return;
        }

        const response = await fetch(API + "/api/notifications/push-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token: push, platform: Platform.OS }),
        });

        if (response.ok) {
          await AsyncStorage.setItem("registered_push_token", push);
          done = true;
        }
      } catch {
        // Notifications are optional; never let them prevent app startup.
      }
    };

    register();
    const id = setInterval(register, 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
