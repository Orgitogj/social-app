import { HugeiconsIcon } from '@hugeicons/react-native';
import { MoreHorizontalCircle01Icon } from '@hugeicons/core-free-icons';

const ThreeDotsCircle = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={MoreHorizontalCircle01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default ThreeDotsCircle;
