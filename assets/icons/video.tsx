import { HugeiconsIcon } from '@hugeicons/react-native';
import { Video01Icon } from '@hugeicons/core-free-icons';

const Video = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Video01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Video;
