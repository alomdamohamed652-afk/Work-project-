import {router,Stack} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView,Platform,StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

export default function RootLayout(){
  return <SafeAreaProvider>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
      <Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:theme.background}}}/>
    </KeyboardAvoidingView>
  </SafeAreaProvider>;
}

const s=StyleSheet.create({
  shade:{flex:1,backgroundColor:theme.overlay,alignItems:'center',justifyContent:'center',padding:24},
  card:{width:'100%',maxWidth:420,backgroundColor:theme.surface,borderRadius:24,padding:22,alignItems:'center'},
  icon:{fontSize:32},title:{color:theme.text,fontSize:22,fontWeight:'900',marginTop:8},
  text:{color:theme.muted,fontSize:12,lineHeight:20,textAlign:'center',marginTop:7},
  button:{width:'100%',height:50,borderRadius:15,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:18},
  buttonText:{color:'#fff',fontWeight:'900'}
});