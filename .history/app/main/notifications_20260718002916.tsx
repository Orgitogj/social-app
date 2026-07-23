import { View, Text,Sty } from 'react-native'
import React, { useEffect, useState } from 'react'
import { fetchNotifications } from '@/services/notificationsService';
import { useAuth } from '@/contexts/AuthContexts';

const Notifications = () => {


  const [notifications,setNotifications]=useState([]);
  const {user}=useAuth();
  useEffect(()=>{
      getNotifications();
  },[]);

  const getNotifications=async ()=>{
    let  res=await fetchNotifications();

    if(res.success) setNotifications(res.data);
  }


  return (
    <View>
      <Text>Notifications</Text>
    </View>
  )
}

export default Notifications


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listStyle: {
    paddingVertical: 20,
    gap: 10,
  },
  noData: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
});