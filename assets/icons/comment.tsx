import { HugeiconsIcon } from '@hugeicons/react-native';
import { Comment01Icon } from '@hugeicons/core-free-icons';

const Comment = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Comment01Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Comment;
