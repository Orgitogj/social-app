import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp, wp } from '@/helpers/common'
import Avatar from '@/components/Avatar'
import moment from 'moment'

type NotificationProps = {
  item: any;
  router: any;
};

const Notification = ({ item, router }: NotificationProps) => {

  const handleClick = () => {
    let { postId, comentId } = JSON.parse(item?.data);
    router.push({ pathname: '/main/postDetails', params: { postId, comentId } })
  }

  const createdAt = moment(item?.created_at).format('MMM D');

  return (
    <TouchableOpacity style={styles.container} onPress={handleClick}>
      <Avatar
        uri={item?.sender?.image}
        size={hp(5)} />

      <View style={styles.nameTitle}>
        <Text style={[styles.text, { color: theme.colors.textDark }]}>
          {item?.sender?.name}
        </Text>

        <Text style={styles.text}>
          {item?.title}
        </Text>
      </View>

      <Text style={[styles.text, { color: theme.colors.textLight }]}>
        {createdAt}
      </Text>
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