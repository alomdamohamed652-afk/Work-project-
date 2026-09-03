import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DRIVER_LOCATION_TASK = "waselni-driver-location";
const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !API_URL) return;
  const locations = data.locations || [];
  const latest = locations[locations.length - 1];
  if (!latest?.coords) return;

  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) return;
    await fetch(API_URL + "/api/location/me", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracy: latest.coords.accuracy,
        heading: latest.coords.heading,
        speed: latest.coords.speed
      })
    });
  } catch {}
});

export async function startDriverLocation() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("لازم تسمح بالموقع للمندوب.");
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") throw new Error("لازم تسمح بالموقع في الخلفية أثناء التوصيل.");
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (!started) {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "وصّلني",
        notificationBody: "تتبع موقعك مفعل أثناء التوصيل.",
        notificationColor: "#111111"
      }
    });
  }
}

export async function stopDriverLocation() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}
