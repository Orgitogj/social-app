import { View, Text,StyleSheet } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import BackButton from './BackButton'

const Header = ({title,showBackButton=false,mb=10}) => {
  const router = useRouter();

  return (
    <View style={[styles.container,{marginBottom:mb}]}>
      {
        showBackButton &&(
          <View  style={styles.showBackButton}>
            <BackButton router={router}/>
          </View>
        )
      }
   <Text style={styles.title}>{title||""}</Text>
    </View>
  )
}

export default Header

const  styles =StyleSheet.create({
  container:{
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center',
    marginTop:5,
    gap:10
  }
})