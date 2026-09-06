import{Stack}from'expo-router';
import{KeyboardAvoidingView,Platform}from'react-native';
import{SafeAreaProvider}from'react-native-safe-area-context';

export default function RootLayout(){
  return <SafeAreaProvider>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
      <Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:'#F7F7F7'}}}/>
    </KeyboardAvoidingView>
  </SafeAreaProvider>;
}