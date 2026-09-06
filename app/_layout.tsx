import {Stack} from 'expo-router';
import {KeyboardAvoidingView,Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

export default function RootLayout(){
 return <SafeAreaProvider>
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
   <Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:theme.background}}}/>
  </KeyboardAvoidingView>
 </SafeAreaProvider>;
}