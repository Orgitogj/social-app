import { StyleSheet, StyleProp, ImageStyle } from 'react-native';
import React from 'react';
import { theme } from '@/constants/theme';
import { hp } from '@/helpers/common';
import { Image } from 'expo-image';
import {getUserImageSrc} from '../services/imageService'
type AvatarProps = {
  uri?: string;
  size?: number;
  rounded?: number;
  style?: StyleProp<ImageStyle>;
};

const Avatar = ({
  uri,
  size = hp(10),
  rounded = theme.radius.md,
  style = {},
}: AvatarProps) => {
  return (
    <Image
      source={getUserImageSrc(uri)}
      transition={100}
      style={[
        styles.avatar,
        {
          height: size,
          width: size,
          borderRadius: rounded,
        },
        style,
      ]}
    />
  );
};

export default Avatar;

const styles = StyleSheet.create({
  avatar: {
    borderCurve: 'continuous',
    borderColor: theme.colors.darkLight,
    borderWidth: 1,
  },
});