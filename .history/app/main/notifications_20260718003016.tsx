import { View, Text,StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { fetchNotifications } from '@/services/notificationsService';
import { useAuth } from '@/contexts/AuthContexts';
import { hp, wp } from '@/helpers/common';
import { theme } from '@/constants/theme';

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
    <ScrennWrapper>
      <Text>Notifications</Text>
    </ScrennWrapper>
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
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.text,
    textAlign: 'center',
  },
});