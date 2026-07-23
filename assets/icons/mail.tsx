import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail01Icon } from '@hugeicons/core-free-icons';

const Mail = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Mail01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Mail;
