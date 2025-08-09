// src/wholesale/components/MobileStickyBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface MobileStickyBarProps {
  leftTopText?: string;
  leftBottomText: string;
  buttonLabel: string;
  buttonTo?: string;
  onButtonClick?: () => void;
  disabled?: boolean;
  // Optional secondary action (e.g., Shop More on the cart page)
  secondaryLabel?: string;
  secondaryTo?: string;
  onSecondaryClick?: () => void;
}

const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  leftTopText,
  leftBottomText,
  buttonLabel,
  buttonTo,
  onButtonClick,
  disabled,
  secondaryLabel,
  secondaryTo,
  onSecondaryClick,
}) => {
  const PrimaryButton = buttonTo
    ? (props: React.PropsWithChildren<{}>) => (
        <Link to={buttonTo} className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'}`}>{props.children}</Link>
      )
    : (props: React.PropsWithChildren<{}>) => (
        <button onClick={onButtonClick} disabled={disabled} className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'}`}>{props.children}</button>
      );

  const SecondaryButton = secondaryLabel
    ? secondaryTo
      ? (props: React.PropsWithChildren<{}>) => (
          <Link to={secondaryTo} className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors">{props.children}</Link>
        )
      : (props: React.PropsWithChildren<{}>) => (
          <button onClick={onSecondaryClick} className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors">{props.children}</button>
        )
    : null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 bg-white/95 border shadow-lg rounded-lg sm:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {leftTopText && <div className="text-xs text-gray-600">{leftTopText}</div>}
          <div className="text-sm font-semibold text-gray-900 truncate">{leftBottomText}</div>
        </div>
        <div className="flex items-center gap-2">
          {SecondaryButton && <SecondaryButton>{secondaryLabel}</SecondaryButton>}
          <PrimaryButton>{buttonLabel}</PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default MobileStickyBar;

