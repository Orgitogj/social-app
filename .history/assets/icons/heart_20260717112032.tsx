import { HugeiconsIcon } from '@hugeicons/react-native';
import { HeartIcon } from '@hugeicons/core-free-icons';

const Heart = ({ size = 24, color = 'currentColor', strokeWidth = 1.5, fill }) => {
  const isFilled = fill && fill !== 'transparent';

  return (
    <HugeiconsIcon
      icon={HeartIcon}
      size={size}
      color={isFilled ? fill : color}
      strokeWidth={strokeWidth}
      variant={isFilled ? 'solid' : 'stroke'}
    />
  );
};

export default Heart;