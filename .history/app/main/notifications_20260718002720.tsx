import { View, Text } from 'react-native'
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

    if(res.success)
  }


  return (
    <View>
      <Text>Notifications</Text>
    </View>
  )
}

export default Notifications