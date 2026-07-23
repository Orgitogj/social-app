import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { hp } from '@/helpers/common'
const EditProfile = () => {
  return (
    <ScreenWrapper>
      <Text>EditProfile</Text>
    </ScreenWrapper>
  )
}

export default EditProfile


export const styles =StyleSheet.create({







  bio:{
    flexDirection:'row',
    height:hp(15),
    alignItems
  }
})