import React from 'react';

interface CalligraphyTitleProps {
  visible: boolean;
  subtitle: string;
}

/**
 * Calligraphic "Merry Christmas" animated left-to-right reveal with subtle golden glow
 * matching 00:07 - 00:08 of the reference video.
 */
export const CalligraphyTitle: React.FC<CalligraphyTitleProps> = ({ visible, subtitle }) => {
  return (
    <div className={`calligraphy-header ${visible ? 'is-visible' : ''}`}>
      <div className="calligraphy-mask">
        <h1 className="calligraphy-text">Merry Christmas</h1>
      </div>
      <div className="calligraphy-subtitle">✦ {subtitle} ✦</div>
    </div>
  );
};
