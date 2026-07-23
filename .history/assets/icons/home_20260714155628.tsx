import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';


const Home = ({ size = 24, color = '#000' }) => {
  return (
    <HugeiconsIcon
      icon={Home01Icon}
      size={size}
      color={color}
      strokeWidth={1.5}
    />
  );
};

export default Home;