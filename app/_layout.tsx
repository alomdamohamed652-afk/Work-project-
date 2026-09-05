import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });

const API=(process.env.EXPO_PUBLIC_API_URL||"").replace(/\/$/,"");

export default function RootLayout(){
  useEffect(()=>{let mounted=true;(async()=>{try{if(Platform.OS==="web"||!API)return;const token=await AsyncStorage.getItem("auth_token");if(!token)return;const current=await Notifications.getPermissionsAsync();let status=current.status;if(status!=="granted"){const requested=await Notifications.requestPermissionsAsync();status=requested.status}if(!mounted||status!=="granted")return;if(Platform.OS==="android")await Notifications.setNotificationChannelAsync("orders",{name:"الطلبات",importance:Notifications.AndroidImportance.MAX,vibrationPattern:[0,250,250,250]});const push=(await Notifications.getExpoPushTokenAsync()).data;if(push)await fetch(API+"/api/customer/push-token",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({token:push,platform:Platform.OS})})}catch{}})();return()=>{mounted=false}},[]);
  return <SafeAreaProvider><Stack screenOptions={{headerShown:false}} /></SafeAreaProvider>;
}
