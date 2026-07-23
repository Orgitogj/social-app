import { HugeiconsIcon } from '@hugeicons/react-native';
import { Edit02Icon } from '@hugeicons/core-free-icons';

const Edit = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Edit02Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Edit;
