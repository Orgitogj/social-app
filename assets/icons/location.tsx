import { HugeiconsIcon } from '@hugeicons/react-native';
import { Location01Icon } from '@hugeicons/core-free-icons';

const Location = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Location01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Location;
