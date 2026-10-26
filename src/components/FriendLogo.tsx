import React from 'react';

interface FriendLogoProps {
  className?: string;
  size?: number;
}

export const FriendLogo: React.FC<FriendLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={`text-[#9333ea] drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] ${className}`}
      style={size ? { width: size, height: size } : undefined}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NPSI Friend Logo"
    >
      {/* Head */}
      <circle cx="50" cy="18" r="14" />
      
      {/* Body Silhouette matching the uploaded friend.png */}
      <path
        d="M 44,34 
           C 36,34 32,38 31,44
           C 30,47 28,52 28,55
           C 28,56 29,57 30,56
           C 33,52 35,46 38,44
           C 38,47 37,51 36,54
           C 34,58 31,61 31,63
           C 31,64 32,64 33,63
           C 36,58 39,53 40,49
           C 39,55 39,64 39,72
           C 39,84 41,92 46,95
           C 47,96 47,94 47,91
           C 47,84 48,76 50,74
           C 52,76 53,84 53,91
           C 53,94 53,96 54,95
           C 59,92 61,84 61,72
           C 61,64 61,55 60,49
           C 61,53 64,58 67,63
           C 68,64 69,64 69,63
           C 69,61 66,58 64,54
           C 63,51 62,47 62,44
           C 65,46 67,52 70,56
           C 71,57 72,56 72,55
           C 72,52 70,47 69,44
           C 68,38 64,34 56,34
           Z"
      />
    </svg>
  );
};
