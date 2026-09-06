import { Stack } from 'expo-router';
import { View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';

export default function AdminLayout(){
  return <View style={{flex:1}}>
    <View style={{flex:1, minHeight:0}}>
      <Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}/>
    </View>
    <BottomNav role="admin"/>
  </View>;
}