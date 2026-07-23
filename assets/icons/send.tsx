import { HugeiconsIcon } from '@hugeicons/react-native';
import { SentIcon } from '@hugeicons/core-free-icons';

const Send = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={SentIcon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Send;
