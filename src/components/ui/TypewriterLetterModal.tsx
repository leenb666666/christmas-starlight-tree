import React, { useEffect, useState } from 'react';
import { Check, Copy, PenLine, Play, X } from 'lucide-react';
import { GiftConfig } from '../../types/gift';
import { buildGiftShareUrl } from '../../utils/giftCodec';

interface TypewriterLetterModalProps {
  open: boolean;
  config: GiftConfig;
  isSharedGift: boolean;
  onUpdateLetter: (patch: Pick<GiftConfig, 'letterGreeting' | 'letterBody' | 'sender'>) => void;
  onClose: () => void;
}

/**
 * Wax-Sealed Alabaster Parchment Letter with:
 * 1. Signature character-by-character gradual typewriter reveal (preserved 100%!)
 * 2. Direct in-place parchment editing mode so you can write your own letter,
 *    immediately replay the gradual reveal preview, and copy the private share link!
 */
export const TypewriterLetterModal: React.FC<TypewriterLetterModalProps> = ({
  open,
  config,
  isSharedGift,
  onUpdateLetter,
  onClose,
}) => {
  const fullText = `${config.letterGreeting}\n\n${config.letterBody}`;
  const [charIndex, setCharIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftGreeting, setDraftGreeting] = useState(config.letterGreeting);
  const [draftBody, setDraftBody] = useState(config.letterBody);
  const [draftSender, setDraftSender] = useState(config.sender);
  const [copied, setCopied] = useState(false);

  // Sync draft when config updates externally
  useEffect(() => {
    setDraftGreeting(config.letterGreeting);
    setDraftBody(config.letterBody);
    setDraftSender(config.sender);
  }, [config.letterGreeting, config.letterBody, config.sender]);

  // Reset to smooth typewriter reading mode whenever modal opens
  useEffect(() => {
    if (!open) {
      setCharIndex(0);
      setIsEditing(false);
      return;
    }
    if (isEditing) return;
    if (charIndex >= fullText.length) return;

    const currentChar = fullText[charIndex];
    const delay =
      currentChar === '\n'
        ? 230
        : /[，。！？、,.!?]/.test(currentChar)
          ? 140
          : 42;

    const id = window.setTimeout(() => {
      setCharIndex((c) => c + 1);
    }, delay);

    return () => window.clearTimeout(id);
  }, [open, isEditing, charIndex, fullText]);

  if (!open) return null;

  const isDone = charIndex >= fullText.length;
  const visibleText = fullText.slice(0, charIndex);

  const handleSaveAndReplay = () => {
    onUpdateLetter({
      letterGreeting: draftGreeting.trim() || '亲爱的你：',
      letterBody: draftBody,
      sender: draftSender.trim() || '你的朋友',
    });
    setIsEditing(false);
    // Replay the gradual typewriter reveal from the very first character!
    setCharIndex(0);
  };

  const handleCopyShareLink = async () => {
    const updatedConfig: GiftConfig = {
      ...config,
      letterGreeting: isEditing ? draftGreeting.trim() || '亲爱的你：' : config.letterGreeting,
      letterBody: isEditing ? draftBody : config.letterBody,
      sender: isEditing ? draftSender.trim() || '你的朋友' : config.sender,
    };
    if (isEditing) {
      onUpdateLetter({
        letterGreeting: updatedConfig.letterGreeting,
        letterBody: updatedConfig.letterBody,
        sender: updatedConfig.sender,
      });
    }
    const url = buildGiftShareUrl(updatedConfig);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const inp = document.createElement('input');
      inp.value = url;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="letter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Glossy Crimson Wax Seal Crown at Top Center */}
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

        {/* Top-left quick Edit toggle ONLY in creator mode (completely hidden for shared links!) */}
        {!isSharedGift &&
          (!isEditing ? (
            <button
              type="button"
              className="letter-edit-toggle"
              onClick={() => setIsEditing(true)}
              title="直接在信纸上编辑属于你的文字"
            >
              <PenLine size={13} />
              <span>编辑信件</span>
            </button>
          ) : (
            <span className="letter-editing-tag">正在编辑信件</span>
          ))}

        <button
          type="button"
          className="letter-close-icon"
          onClick={onClose}
          aria-label="关闭信件"
        >
          <X size={16} />
        </button>

        {isEditing ? (
          <div className="letter-edit-form">
            <input
              type="text"
              className="parchment-input parchment-greeting"
              value={draftGreeting}
              maxLength={36}
              placeholder="开头称呼（如：亲爱的你：）"
              onChange={(e) => setDraftGreeting(e.target.value)}
            />
            <textarea
              className="parchment-input parchment-body"
              value={draftBody}
              maxLength={1000}
              placeholder="在这里写下想对 TA 说的话，保存后会自动保留逐字渐显的打字机效果..."
              onChange={(e) => setDraftBody(e.target.value)}
            />
            <div className="parchment-sender-row">
              <span>—</span>
              <input
                type="text"
                className="parchment-input parchment-sender"
                value={draftSender}
                maxLength={32}
                placeholder="你的署名"
                onChange={(e) => setDraftSender(e.target.value)}
              />
            </div>

            <div className="letter-edit-actions">
              <button type="button" className="letter-accept-btn" onClick={handleSaveAndReplay}>
                <Play size={14} />
                <span>保存并预览渐显效果</span>
              </button>
              <button type="button" className="letter-share-btn" onClick={handleCopyShareLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '已复制链接' : '复制分享链接'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
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
                <div className="letter-done-actions">
                  <button type="button" className="letter-accept-btn" onClick={onClose}>
                    <Check size={15} />
                    <span>收下这份圣诞祝福</span>
                  </button>
                  {!isSharedGift && (
                    <button type="button" className="letter-share-btn" onClick={handleCopyShareLink}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? '已复制分享链接' : '复制链接发给 TA'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
