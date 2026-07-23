import { HugeiconsIcon } from '@hugeicons/react-native';
import { PlusSignIcon } from '@hugeicons/core-free-icons';

const Plus = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={PlusSignIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Plus;
