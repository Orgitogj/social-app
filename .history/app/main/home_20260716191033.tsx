import { View, Text, StyleSheet,Button,Alert, Pressable } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/screenWrapper'
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContexts';
import { theme } from '@/constants/theme';
import { hp, wp } from '@/helpers/common';
import Icon from '@/assets/icons';
import { useRouter } from 'expo-router';
import Avatar from '@/components/Avatar';

const Home = () => {
  const {user,setAuth}=useAuth();
  const router=useRouter();
  const [post,setPosts]=useState([]);

  useEffect(()=>){
    
  }
  const getPosts=async()=>{


  }


  
 
  return (
    
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>LinkUp</Text>
          <View style={styles.icons}>
            <Pressable onPress={()=>router.push('/main/notifications')}>
              <Icon name="heart" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
             <Pressable onPress={()=>router.push('/main/newPost')}>
              <Icon name="plus" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
             <Pressable onPress={()=>router.push('/main/profile')}>
             <Avatar
             uri={user?.image}
             size={hp(5)}
             rounded={theme.radius.sm}
             style={{borderWidth:2}}
             />
            </Pressable>
          </View>
        </View>
      </View>

    </ScreenWrapper>
  )
}

export default Home


const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingHorizontal: wp(4)
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: wp(4),
  },

  title: {
    color: theme.colors.text,
    fontSize: hp(3.2),
    fontWeight: theme.fonts.bold as any,
  },

  avatarImage: {
    height: hp(4.3),
    width: hp(4.3),
    borderRadius: theme.radius.sm,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray,
    borderWidth: 3,
  },

  icons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:'center',
    gap:18
  },

  listStyle: {
    paddingTop: 20,
    paddingHorizontal: wp(4),
  },

  noPosts: {
    fontSize: hp(2),
    textAlign: 'center',
    color: theme.colors.text,
  },

  pill: {
    position: 'absolute',
    right: -10,
    top: -4,
    height: hp(2.2),
    width: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.roseLight,
  },

  pillText: {
    color: 'white',
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold as any,
  },
});