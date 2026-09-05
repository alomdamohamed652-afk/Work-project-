import{Stack}from'expo-router';import{SafeAreaProvider}from'react-native-safe-area-context';import{View}from'react-native';
export default function RootLayout(){return <SafeAreaProvider><View style={{flex:1}}><Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:'#F7F7F7'}}}/></View></SafeAreaProvider>}
