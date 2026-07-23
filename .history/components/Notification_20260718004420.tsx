import { StyleSheet, Text, View,TouchableOpacity} from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '@/helpers/common'
import Avatar from './Avatar'

const Notification = ({
  item,
  router
}) => {

  const handleClick=()=>{

  }
  return (
    <TouchableOpacity style={styles.container} onPress={handleClick}>
      <Avatar
      uri={item?.sender?.image}
      size={hp()}
    </TouchableOpacity>
  )
}

export default Notification

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: theme.colors.darkLight,
    padding: 15,
    // paddingVertical: 12,
    borderRadius: theme.radius.xxl,
    borderCurve: 'continuous',
  },
  nameTitle: {
    flex: 1,
    gap: 2,
  },
  text: {
    fontSize: hp(1.6),
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.text,
  },
});