import { HugeiconsIcon } from '@hugeicons/react-native';
import { Logout01Icon } from '@hugeicons/core-free-icons';

const Logout = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Logout01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Logout;
