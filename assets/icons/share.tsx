import { HugeiconsIcon } from '@hugeicons/react-native';
import { Share08Icon } from '@hugeicons/core-free-icons';

const Share = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Share08Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Share;
