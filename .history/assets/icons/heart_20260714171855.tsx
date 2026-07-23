import { HugeiconsIcon } from '@hugeicons/react-native';
import { HeartIcon } from '@hugeicons/core-free-icons';

const Heart = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
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
