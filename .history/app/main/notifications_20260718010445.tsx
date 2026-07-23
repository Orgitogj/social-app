import { View, Text, StyleSheet, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { fetchNotifications } from '@/services/notificationsService';
import { useAuth } from '@/contexts/AuthContexts';
import { hp, wp } from '@/helpers/common';
import { theme } from '@/constants/theme';
import Notification from '@/components/Notification';
import Header from '@/components/Header';
import ScreenWrapper from '@/components/screenWrapper';

const Notifications = () => {

  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const getNotifications = async () => {
      let res = await fetchNotifications(user?.id);
      if (res.success) setNotifications(res.data || []);
    }

    getNotifications();
  }, [user?.id]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Header title="Notifications" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listStyle}>

          {
            notifications.map(item => {
              return (
                <Notification
                  item={item}
                  key={item?.id}
                  router={router}
                />
              )
            })
          }

          {
            notifications.length === 0 && (
              <Text style={styles.noData}>No notifications yet</Text>
            )
          }
        </ScrollView>
      </View>
    </ScreenWrapper>
  )
}

export default Notifications

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listStyle: {
    paddingVertical: 20,
    gap: 10,
  },
  noData: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.text,
    textAlign: 'center',
  },
});