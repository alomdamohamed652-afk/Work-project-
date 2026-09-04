import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DRIVER_LOCATION_TASK = "waselni-driver-location";
const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
let foregroundSubscription: Location.LocationSubscription | null = null;

async function sendLocation(location: Location.LocationObject) {
  if (!API_URL) return;
  const token = await AsyncStorage.getItem("auth_token");
  if (!token) return;
  await fetch(API_URL + "/api/location/me", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      heading: location.coords.heading,
      speed: location.coords.speed
    })
  });
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !API_URL) return;
  const locations = (data as any).locations || [];
  const latest = locations[locations.length - 1];
  if (!latest?.coords) return;
  try { await sendLocation(latest); } catch {}
});

export async function startDriverLocation() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("لازم تسمح بالموقع للمندوب.");

  // Expo Go on Android cannot run background location tasks. Keep live foreground GPS
  // available for testing; production/development builds use the background task below.
  if (Constants.default.appOwnership === "expo") {
    if (!foregroundSubscription) {
      foregroundSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        location => { sendLocation(location).catch(() => {}); }
      );
    }
    return;
  }

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
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}
