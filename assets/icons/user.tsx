import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserIcon } from '@hugeicons/core-free-icons';

const User = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={UserIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default User;
