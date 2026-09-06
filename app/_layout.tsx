import AsyncStorage from '@react-native-async-storage/async-storage';
import {router,Stack} from 'expo-router';
import {useEffect,useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

export default function RootLayout(){
  const [sessionExpired,setSessionExpired]=useState(false);
  const originalFetch=useRef<typeof fetch|null>(null);

  useEffect(()=>{
    if(originalFetch.current)return;
    originalFetch.current=global.fetch;
    const baseFetch=originalFetch.current;
    global.fetch=(async(input:any,init?:any)=>{
      const response=await baseFetch(input,init);
      const url=typeof input==='string'?input:input?.url||'';
      if(response.status===401&&!String(url).includes('/api/auth/')){
        const token=await AsyncStorage.getItem('auth_token');
        if(token){
          await AsyncStorage.multiRemove(['auth_token','auth_user']);
          setSessionExpired(true);
        }
      }
      return response;
    }) as typeof fetch;
    return()=>{if(originalFetch.current)global.fetch=originalFetch.current;originalFetch.current=null};
  },[]);

  const goToAuth=()=>{setSessionExpired(false);router.replace('/auth')};

  return <SafeAreaProvider>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
      <Stack screenOptions={{headerShown:false,animation:'slide_from_right',contentStyle:{backgroundColor:theme.background}}}/>
      <Modal visible={sessionExpired} transparent animationType="fade" onRequestClose={goToAuth}>
        <View style={s.shade}>
          <View style={s.card}>
            <Text style={s.icon}>🔒</Text>
            <Text style={s.title}>انتهت الجلسة</Text>
            <Text style={s.text}>انتهت صلاحية تسجيل الدخول. سجّل دخولك مرة أخرى للمتابعة.</Text>
            <Pressable onPress={goToAuth} style={s.button}><Text style={s.buttonText}>تسجيل الدخول</Text></Pressable>
          </View>
        </View>
      </Modal>
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