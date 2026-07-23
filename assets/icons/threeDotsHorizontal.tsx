import { HugeiconsIcon } from '@hugeicons/react-native';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';

const ThreeDotsHorizontal = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={MoreHorizontalIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default ThreeDotsHorizontal;
