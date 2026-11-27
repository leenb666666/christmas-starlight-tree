import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { GiftConfig } from '../../types/gift';

interface QuizModalProps {
  open: boolean;
  config: GiftConfig;
  selectedIndex: number | null;
  onClose: () => void;
  onSubmitWish: (index: number, blessing: string) => void;
}

/**
 * Festive Crimson & Gold Interactive Quiz / Wishing Modal (00:13 - 00:17).
 * Selecting an option & lighting the wish launches a celebratory firework & golden
 * blessing ribbon onto the particle tree!
 */
export const QuizModal: React.FC<QuizModalProps> = ({
  open,
  config,
  selectedIndex,
  onClose,
  onSubmitWish,
}) => {
  const [picked, setPicked] = useState<number>(selectedIndex ?? 0);

  if (!open) return null;

  const handleConfirm = () => {
    const opt = config.quizOptions[picked] ?? config.quizOptions[0];
    onSubmitWish(picked, opt.blessing);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quiz-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="关闭">
          <X size={16} />
        </button>

        {/* Illustrated warm Christmas hearth & pine header banner (matching 00:13 - 00:16) */}
        <div className="quiz-banner">
          <svg viewBox="0 0 420 140" className="quiz-banner-svg">
            <defs>
              <linearGradient id="qb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6b151e" />
                <stop offset="50%" stopColor="#420e16" />
                <stop offset="100%" stopColor="#26080d" />
              </linearGradient>
              <radialGradient id="qb-glow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#ffdc85" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ffdc85" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="420" height="140" fill="url(#qb-bg)" />
            <circle cx="210" cy="70" r="95" fill="url(#qb-glow)" />
            {/* Hanging golden garlands */}
            <path d="M0,18 Q105,62 210,22 Q315,62 420,18" fill="none" stroke="#f0c86d" strokeWidth="2" opacity="0.7" />
            <circle cx="62" cy="40" r="7" fill="#d93845" stroke="#f3d07c" strokeWidth="1.5" />
            <circle cx="358" cy="40" r="7" fill="#d93845" stroke="#f3d07c" strokeWidth="1.5" />
            <circle cx="132" cy="38" r="5" fill="#ffe69e" />
            <circle cx="288" cy="38" r="5" fill="#ffe69e" />
            {/* Center golden star & mini pine wreath */}
            <circle cx="210" cy="72" r="36" fill="none" stroke="#265f44" strokeWidth="8" strokeDasharray="7 3" />
            <circle cx="210" cy="72" r="36" fill="none" stroke="#e9c46a" strokeWidth="1.3" />
            <path d="M210,48 Q213,68 232,72 Q213,76 210,96 Q207,76 188,72 Q207,68 210,48 Z" fill="#ffe79e" />
            <rect x="10" y="10" width="400" height="120" rx="8" fill="none" stroke="#e8c36c" strokeOpacity="0.45" strokeWidth="1" />
          </svg>
        </div>

        <div className="quiz-body">
          <div className="quiz-title">{config.quizTitle}</div>
          <p className="quiz-question">{config.quizQuestion}</p>

          <div className="quiz-options">
            {config.quizOptions.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className={`quiz-opt-btn ${picked === idx ? 'selected' : ''}`}
                onClick={() => setPicked(idx)}
              >
                <span className="quiz-radio" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <button type="button" className="quiz-submit-btn" onClick={handleConfirm}>
            <Sparkles size={15} />
            <span>点亮星愿 · 挂上圣诞树</span>
          </button>
        </div>
      </div>
    </div>
  );
};
