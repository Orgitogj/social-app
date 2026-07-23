import { HugeiconsIcon } from '@hugeicons/react-native';
import { LockIcon } from '@hugeicons/core-free-icons';

const Lock = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={LockIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Lock;
