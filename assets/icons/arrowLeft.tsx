import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

const ArrowLeft = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={ArrowLeft01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default ArrowLeft;
