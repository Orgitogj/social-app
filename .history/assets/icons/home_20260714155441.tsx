import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home01Icon } from '@hugeicons-pro/core-solid-sharp';

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