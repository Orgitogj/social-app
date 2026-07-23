import { HugeiconsIcon } from '@hugeicons/react-native';
import { Delete02Icon } from '@hugeicons/core-free-icons';

const Delete = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Delete02Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Delete;
