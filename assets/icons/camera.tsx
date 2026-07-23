import { HugeiconsIcon } from '@hugeicons/react-native';
import { Camera01Icon } from '@hugeicons/core-free-icons';

const Camera = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Camera01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Camera;
