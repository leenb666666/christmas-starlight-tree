import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { GiftConfig } from '../../types/gift';

interface TypewriterLetterModalProps {
  open: boolean;
  config: GiftConfig;
  onClose: () => void;
}

/**
 * Wax-Sealed Alabaster Parchment Letter with Emotional Character-by-Character
 * Typewriter Reveal (matching 00:23 - 00:32 of the reference video).
 */
export const TypewriterLetterModal: React.FC<TypewriterLetterModalProps> = ({
  open,
  config,
  onClose,
}) => {
  const fullText = `${config.letterGreeting}\n\n${config.letterBody}`;
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setCharIndex(0);
      return;
    }

    if (charIndex >= fullText.length) return;

    const currentChar = fullText[charIndex];
    const delay =
      currentChar === '\n'
        ? 240
        : /[，。！？、,.!?]/.test(currentChar)
          ? 145
          : 44;

    const id = window.setTimeout(() => {
      setCharIndex((c) => c + 1);
    }, delay);

    return () => window.clearTimeout(id);
  }, [open, charIndex, fullText]);

  if (!open) return null;

  const isDone = charIndex >= fullText.length;
  const visibleText = fullText.slice(0, charIndex);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="letter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Glossy Crimson Wax Seal Crown at Top Center (matching 00:23 - 00:32!) */}
        <div className="letter-wax-crown">
          <svg viewBox="0 0 80 80" width="54" height="54">
            <defs>
              <radialGradient id="lw-wax" cx="35%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#e55a4e" />
                <stop offset="55%" stopColor="#b22325" />
                <stop offset="100%" stopColor="#690e12" />
              </radialGradient>
            </defs>
            <path
              d="M39,6 C51,5 63,11 69,22 C75,33 74,49 66,60 C57,70 42,74 28,70 C14,66 6,53 7,38 C8,22 18,10 31,7 Z"
              fill="url(#lw-wax)"
            />
            <circle cx="40" cy="40" r="22" fill="none" stroke="#f08378" strokeOpacity="0.45" strokeWidth="2" />
            <path d="M40,26 Q42,38 54,40 Q42,42 40,54 Q38,42 26,40 Q38,38 40,26 Z" fill="#f7d588" />
          </svg>
        </div>

        <button
          type="button"
          className="letter-close-icon"
          onClick={onClose}
          aria-label="关闭信件"
        >
          <X size={16} />
        </button>

        <div className="letter-scroll-body">
          <div className="letter-typewriter-text">
            {visibleText}
            {!isDone && <span className="typewriter-caret" />}
          </div>

          <div className={`letter-signature ${isDone ? 'visible' : ''}`}>
            — {config.sender}
          </div>
        </div>

        <div className="letter-footer">
          {!isDone ? (
            <button
              type="button"
              className="letter-skip-btn"
              onClick={() => setCharIndex(fullText.length)}
            >
              展开全文
            </button>
          ) : (
            <button type="button" className="letter-accept-btn" onClick={onClose}>
              <Check size={15} />
              <span>收下这份圣诞祝福</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
