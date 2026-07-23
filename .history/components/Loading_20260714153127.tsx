import React from 'react';
import {
  View,
  ActivityIndicator,
  ActivityIndicatorProps,
} from 'react-native';
import { theme } from '@/constants/theme';

interface LoadingProps {
  size?: ActivityIndicatorProps['size'];
  color?: string;
}

const Loading = ({
  size = 'large',
  color = theme.colors.primary,
}: LoadingProps) => {
  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

export default Loading;