import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';

export default function DriverLayout(){
  const path=usePathname();
  const home=path==='/driver'||path==='/driver/';
  return <View style={{flex:1}}>
    <View style={{flex:1,minHeight:0}}>
      <Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}/>
    </View>
    {!home?<BottomNav role="driver"/>:null}
  </View>;
}