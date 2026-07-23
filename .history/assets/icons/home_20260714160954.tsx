import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home03Icon } from '@hugeicons/core-free-icons';

const Home = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => {
  return (
    <HugeiconsIcon
      icon={Home03Icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default Home;