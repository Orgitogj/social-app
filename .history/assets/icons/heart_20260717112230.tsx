import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { HeartIcon } from '@hugeicons/core-free-icons';
import Svg, { Path } from 'react-native-svg';

const HeartFilled = ({ size = 24, color = 'red' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 21s-6.716-4.35-9.428-8.03C.24 9.99 1.03 6.11 4.24 4.61 6.53 3.55 9.06 4.32 12 7.3c2.94-2.98 5.47-3.75 7.76-2.69 3.21 1.5 4 5.38 1.67 8.36C18.716 16.65 12 21 12 21z" />
  </Svg>
);

const Heart = ({ size = 24, color = 'currentColor', strokeWidth = 1.5, fill }: any) => {
  const isFilled = fill && fill !== 'transparent';

  if (isFilled) {
    return <HeartFilled size={size} color={fill} />;
  }

  return (
    <HugeiconsIcon
      icon={HeartIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Heart;