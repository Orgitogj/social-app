import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '@/helpers/common'
import Avatar from './Avatar'
import moment from 'moment'
const CommentItem = ({
  item
}) => 
  
  {

    const createdAt=moment(item?.created_at).format('MMM d');
  return (
    <View style={styles.container}>
      <Avatar 
      uri={item?.user?.image}/>

      <View style={styles.content}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <View style={styles.nameContainer}>
            <Text style={styles.text}>
              {
                item?.user?.name
              }
            </Text>
            <Text>●</Text>
            <Text style={[styles.text,{color:theme.colors.textLight}]}>
              {
                createdAt
              }
            </Text>
          </View>
                <TouchableOpacity>
                  
                </TouchableOpacity>

        </View>
      </View>
    </View>
  )
}

export default CommentItem

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 7,
  },

  content: {
    flex: 1,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderCurve: 'continuous',
  },

  highlight: {
    borderWidth: 0.2,
    backgroundColor: 'white',
    borderColor: theme.colors.dark,
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  text: {
    fontSize: hp(1.6),
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.textDark,
  },
});