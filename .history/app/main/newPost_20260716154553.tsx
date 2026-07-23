import { View, Text,StyleSheet,ScrollView } from 'react-native'
import React, { useRef } from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import Header from '@/components/Header'
import { theme } from '@/constants/theme'
import { hp, wp } from '@/helpers/common'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContexts'
import RichTextEditor from '@/components/RichTextEditor'

const NewPost = () => {
  const bodyRef=useRef("");
  
  const{user}=useAuth();
  return (
    <ScreenWrapper bg="white">
     

      <View style={styles.container}>
        <Header title="Create post"/>
        <ScrollView contentContainerStyle={{gap:20}}>
            <View style={styles.header}>
              <Avatar 
              uri={user?.image}
              size={hp(6.5)}/>
              rounded={theme.radius.xl}
              <View style={{gap:2}}>
                <Text style={styles.username}>{
                  user && user.name
                  
                  }
                </Text>
                <Text style={styles.publicText}>
                  Public
                </Text>
              </View>
            </View>
          

          <View style={styles.textEditor}>
            <RichTextEditor/>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  )
}

export default NewPost


const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'red',
    marginBottom: 30,
    paddingHorizontal: wp(4),
    gap: 15,
  },
  title: {
    // marginBottom: 10,
    fontSize: hp(2.5),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
    marginLeft:15
  },
  avatar: {
    height: hp(6.5),
    width: hp(6.5),
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  publicText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.textLight,
    marginLeft:15
  },
  textEditor: {
    // marginTop: 10,
  },
  media: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  addImageText: {
    fontSize: hp(1.9),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
  },
  imageIcon: {
    borderRadius: theme.radius.md,
    // backgroundColor: theme.colors.gray,
    // padding: 6,
  },
  file: {
    height: hp(30),
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderCurve: 'continuous'
  },
  video: {

  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    // shadowColor: theme.colors.textLight,
    // shadowOffset: {width: 0, height: 3},
    // shadowOpacity: 0.6,
    // shadowRadius: 8
  }
})