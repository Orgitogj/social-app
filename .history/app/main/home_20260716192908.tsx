import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  FlatList 
} from 'react-native';

import React, { useEffect, useState } from 'react';

import ScreenWrapper from '../../components/screenWrapper';
import { useAuth } from '@/contexts/AuthContexts';
import { theme } from '@/constants/theme';
import { hp, wp } from '@/helpers/common';
import Icon from '@/assets/icons';
import { useRouter } from 'expo-router';
import Avatar from '@/components/Avatar';
import { fetchPosts } from '@/services/postService';
import PostCard from '@/components/PostCard';


const Home = () => {

  const { user } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<any[]>([]);
  const [limit, setLimit] = useState(10);


  useEffect(() => {
    getPosts();
  }, [limit]);


  const getPosts = async () => {

    const res = await fetchPosts(limit);

    if(res.success){
      setPosts(res.data || []);
    }

  };


  const loadMore = () => {
    setLimit(prev => prev + 10);
  };


  return (

    <ScreenWrapper bg="white">

      <View style={styles.container}>


        {/* HEADER */}
        <View style={styles.header}>

          <Text style={styles.title}>
            LinkUp
          </Text>


          <View style={styles.icons}>


            <Pressable 
              onPress={() => router.push('/main/notifications')}
            >
              <Icon 
                name="heart" 
                size={hp(3.2)} 
                strokeWidth={2} 
                color={theme.colors.text}
              />
            </Pressable>



            <Pressable 
              onPress={() => router.push('/main/newPost')}
            >
              <Icon 
                name="plus" 
                size={hp(3.2)} 
                strokeWidth={2} 
                color={theme.colors.text}
              />
            </Pressable>



            <Pressable 
              onPress={() => router.push('/main/profile')}
            >

              <Avatar
                uri={user?.image}
                size={hp(5)}
                rounded={theme.radius.sm}
                style={{
                  borderWidth:2,
                  borderColor:theme.colors.gray
                }}
              />

            </Pressable>


          </View>

        </View>



        {/* POSTS */}

        <FlatList

          data={posts}

          showsVerticalScrollIndicator={false}

          contentContainerStyle={styles.listStyle}


          keyExtractor={(item) => item.id.toString()}


          renderItem={({item}) => (

            <PostCard

              item={item}

              currentUser={user}

              router={router}

            />

          )}


          onEndReached={loadMore}

          onEndReachedThreshold={0.5}


          ListEmptyComponent={() => (

            <Text style={styles.noPosts}>
              No posts yet
            </Text>

          )}

        />


      </View>


    </ScreenWrapper>

  );

};


export default Home;



const styles = StyleSheet.create({

  container: {
    flex:1,
  },


  header:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    marginBottom:10,
    marginHorizontal:wp(4),
  },


  title:{
    color:theme.colors.text,
    fontSize:hp(3.2),
    fontWeight:theme.fonts.bold as any,
  },


  icons:{
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center',
    gap:18,
  },


  listStyle:{
    paddingTop:20,
    paddingHorizontal:wp(4),
  },


  noPosts:{
    fontSize:hp(2),
    textAlign:'center',
    color:theme.colors.text,
    marginTop:50,
  },


});