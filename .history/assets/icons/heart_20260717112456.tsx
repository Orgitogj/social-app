import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { HeartIcon } from '@hugeicons/core-free-icons';
import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';

const HeartFilled = ({ size = 24, color = 'red' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

const Heart = ({ size = 24, color = 'currentColor', strokeWidth = 1.5, fill }: any) => {
  const isFilled = fill && fill !== 'transparent';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {isFilled ? (
        <HeartFilled size={size} color={fill} />
      ) : (
        <HugeiconsIcon
          icon={HeartIcon}
          size={size}
          color={color}
          strokeWidth={strokeWidth}
        />
      )}
    </View>
  );
};

export default Heart;