import { View, Text,StyleSheet } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

const Header = ({title,showBackButton=false,mb=10}) => {
  const router = useRouter();

  return (
    <View style={
      styles.container,{margi}
    }>
      <Text>Header</Text>
    </View>
  )
}

export default Header

const  styles =StyleSheet.create({})