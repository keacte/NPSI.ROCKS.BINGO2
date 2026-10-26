import React, { useState } from 'react';
import { FriendLogo } from './FriendLogo';

interface LogoProps {
  className?: string;
  imgClassName?: string;
}

export const BrandLogo: React.FC<LogoProps> = ({
  className = 'w-10 h-10 sm:w-12 sm:h-12',
  imgClassName = 'rounded-md transition-transform group-hover:scale-105',
}) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return <FriendLogo className={className} />;
  }

  return (
    <img
      src="/logo.png"
      alt="NPSI.ROCKS.BINGO"
      className={`${className} ${imgClassName} object-contain`}
      draggable={false}
      onError={() => setImgError(true)}
    />
  );
};
