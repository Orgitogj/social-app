import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { hp, wp } from '@/helpers/common'
import { theme } from '@/constants/theme'
import Header from '@/components/Header'
import { Image } from 'expo-image'
import { useAuth } from '@/contexts/AuthContexts'
import { getUserImageSrc } from '@/services/imageService'
import Icon from '@/assets/icons'
import Input from '@/components/Input'
import Button from '@/components/Button'
import { updateUser } from '@/services/userService'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'

// Replace with your real user type from AuthContexts/userService if one exists.
interface UserProfileForm {
  name: string
  phoneNumber: string
  image: ImagePicker.ImagePickerAsset | string | null
  bio: string
  address: string
}

const EditProfile = () => {
  const router = useRouter()
  const { user: currentUser, setUserData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<UserProfileForm>({
    name: '',
    phoneNumber: '',
    image: null,
    bio: '',
    address: '',
  })

  useEffect(() => {
    if (currentUser) {
      setUser({
        name: currentUser.name || '',
        phoneNumber: currentUser.phoneNumber || '',
        image: currentUser.image || null,
        address: currentUser.address || '',
        bio: currentUser.bio || '',
      })
    }
  }, [currentUser])

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // current API; MediaTypeOptions.Images is deprecated
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled) {
      setUser(prev => ({ ...prev, image: result.assets[0] }))
    }
  }

  const onSubmit = async () => {
    const { name, phoneNumber, address, bio,image } = user

    if (!name || !phoneNumber || !address || !bio || !image ) {
      Alert.alert('Profile', 'Please fill all the fields')
      return
    }

    setLoading(true)
if(type)

    try {
      const res = await updateUser(currentUser?.id, user)
      if (res.success) {
        setUserData({ ...currentUser, ...user })
        router.back()
      } else {
        Alert.alert('Profile', res.msg || 'Failed to update profile. Please try again.')
      }
    } catch (error) {
      Alert.alert('Profile', 'Something went wrong while updating your profile.')
    } finally {
      setLoading(false)
    }
  }

  const imageSource =
    user.image && typeof user.image === 'object' ? user.image.uri : getUserImageSrc(user.image)

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: hp(25) }}
          >
            <Header title="Edit Profile" />

            <View style={styles.form}>
              <View style={styles.avatarContainer}>
                <Image source={imageSource} style={styles.avatar} />

                <Pressable style={styles.cameraIcon} onPress={onPickImage}>
                  <Icon name="camera" size={20} strokeWidth={2.5} />
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: hp(1.4),
                  color: theme.colors.text,
                }}
              >
                Please fill your profile details
              </Text>

              <Input
                icon={<Icon name="user" />}
                placeholder="Enter your name"
                value={user.name}
                onChangeText={value => setUser(prev => ({ ...prev, name: value }))}
              />

              <Input
                icon={<Icon name="call" />}
                placeholder="Enter your phone number"
                value={user.phoneNumber}
                keyboardType="phone-pad"
                onChangeText={value => setUser(prev => ({ ...prev, phoneNumber: value }))}
              />

              <Input
                icon={<Icon name="location" />}
                placeholder="Enter your address"
                value={user.address}
                onChangeText={value => setUser(prev => ({ ...prev, address: value }))}
              />

              <Input
                placeholder="Enter your bio"
                value={user.bio}
                multiline={true}
                containerStyle={styles.bio}
                onChangeText={value => setUser(prev => ({ ...prev, bio: value }))}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Button
        title="Update"
        loading={loading}
        onPress={onSubmit}
        buttonStyle={{
          width: '90%',
          alignSelf: 'center',
          marginBottom: hp(3),
        }}
      />
    </ScreenWrapper>
  )
}

export default EditProfile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  avatarContainer: {
    height: hp(14),
    width: hp(14),
    alignSelf: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.xxl * 1.8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.darkLight,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: theme.colors.textLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
  },
  form: {
    gap: 18,
    marginTop: 20,
  },
  input: {
    flexDirection: 'row',
    borderWidth: 0.4,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.xxl,
    borderCurve: 'continuous',
    padding: 17,
    paddingHorizontal: 20,
    gap: 15,
  },
  bio: {
    flexDirection: 'row',
    height: hp(15),
    alignItems: 'flex-start',
    paddingVertical: 15,
  },
})