import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'

const Notifications = () => {


  const [notifications,setNotifications]=useState([]);

  useEffect(()=>{
      getNotifications()
  },[])
  return (
    <View>
      <Text>Notifications</Text>
    </View>
  )
}

export default Notifications