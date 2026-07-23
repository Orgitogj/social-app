import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { HeartIcon } from '@hugeicons/core-free-icons';
import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';

const HeartFilled = ({ size = 24, color = 'red' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 4.595c-1.845-4.6-8-4.221-8 1.5C4 9.31 6.5 12 12 17c5.5-5 8-7.69 8-10.905 0-5.72-6.155-6.1-8-1.5z" />
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