import React, { useState } from 'react';
import { Check, PenLine, Sparkles } from 'lucide-react';
import { GiftConfig } from '../../types/gift';

interface EnvelopeIntroProps {
  config: GiftConfig;
  isSharedGift: boolean;
  onUpdateRecipient: (recipient: string, tagline?: string) => void;
  onOpen: () => void;
  onOpenCustomize: () => void;
}

/**
 * Opening Ivory Tabletop & Deep Emerald Gold-Filigree Envelope (00:00 - 00:01).
 * Supports directly editing the recipient name right on the envelope flap
 * while preserving the wax-seal luminous flash unseal ceremony.
 */
export const EnvelopeIntro: React.FC<EnvelopeIntroProps> = ({
  config,
  isSharedGift,
  onUpdateRecipient,
  onOpen,
  onOpenCustomize,
}) => {
  const [opening, setOpening] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const handleUnseal = () => {
    if (opening || editingName) return;
    setOpening(true);
    window.setTimeout(() => {
      onOpen();
    }, 460);
  };

  return (
    <div className={`intro-screen ${opening ? 'is-flashing' : ''}`}>
      {!isSharedGift && (
        <button
          type="button"
          className="intro-customize-btn"
          onClick={onOpenCustomize}
          title="定制你的专属圣诞树、信封称呼与打字机长信"
        >
          <Sparkles size={14} />
          <span>定制祝福与分享</span>
        </button>
      )}

      <div className="intro-center">
        {/* Horizontal Forest-Green & Ivory Luxury Christmas Envelope */}
        <div className={`intro-envelope ${opening ? 'is-unsealing' : ''}`}>
          <div className="intro-env-shadow" />

          {/* Envelope SVG Artwork */}
          <svg
            viewBox="0 0 520 330"
            className="intro-env-svg"
            onClick={handleUnseal}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleUnseal();
            }}
            aria-label="点击火漆拆开圣诞惊喜"
          >
            <defs>
              <linearGradient id="env-ivory-top" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#faf6ec" />
                <stop offset="100%" stopColor="#eee6d5" />
              </linearGradient>
              <linearGradient id="env-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1b4332" />
                <stop offset="55%" stopColor="#133326" />
                <stop offset="100%" stopColor="#0b2219" />
              </linearGradient>
              <linearGradient id="env-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff0be" />
                <stop offset="50%" stopColor="#d8af58" />
                <stop offset="100%" stopColor="#9e7425" />
              </linearGradient>
              <radialGradient id="env-wax" cx="35%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#e2544a" />
                <stop offset="52%" stopColor="#b02224" />
                <stop offset="100%" stopColor="#690e12" />
              </radialGradient>
            </defs>

            {/* Emerald body */}
            <rect x="0" y="0" width="520" height="330" rx="10" fill="url(#env-emerald)" />

            {/* Delicate pine silhouette & gold stardust */}
            <g opacity="0.28" fill="#d9c082">
              <polygon points="48,330 82,226 116,330" />
              <polygon points="104,330 132,252 160,330" />
              <polygon points="365,330 398,238 432,330" />
              <polygon points="418,330 456,214 494,330" />
            </g>
            {[
              [62, 232], [140, 266], [210, 286], [312, 290], [385, 254], [452, 230],
              [90, 295], [430, 298], [260, 268],
            ].map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r="2.2" fill="#f5d98e" opacity="0.7" />
            ))}

            {/* Lower pocket fold seams */}
            <path d="M0,330 L260,162 L520,330" fill="none" stroke="url(#env-gold)" strokeOpacity="0.42" strokeWidth="1.2" />

            {/* Upper Ivory Triangular Flap */}
            <path
              d="M0,10 Q0,0 10,0 L510,0 Q520,0 520,10 L520,24 L276,184 Q260,196 244,184 L0,24 Z"
              fill="url(#env-ivory-top)"
              stroke="#dfd4bf"
              strokeWidth="1.2"
            />
            <path
              d="M14,14 L260,174 L506,14"
              fill="none"
              stroke="url(#env-gold)"
              strokeOpacity="0.55"
              strokeWidth="1"
            />

            {/* Header stamp on ivory upper flap */}
            <text
              x="260"
              y="66"
              textAnchor="middle"
              fill="#7c6336"
              fontSize="14"
              letterSpacing="5"
              fontFamily="Georgia, serif"
            >
              MERRY CHRISTMAS
            </text>

            {/* Outer gold hairline frame */}
            <rect x="8" y="8" width="504" height="314" rx="7" fill="none" stroke="url(#env-gold)" strokeOpacity="0.55" strokeWidth="1.1" />

            {/* Glossy 3D Crimson Wax Seal at Apex */}
            <g transform="translate(260, 184)">
              <path
                d="M-2,-34 C12,-36 26,-29 33,-17 C39,-4 38,14 29,25 C19,35 2,38 -13,34 C-28,29 -37,15 -36,-2 C-35,-18 -24,-31 -10,-34 Z"
                fill="url(#env-wax)"
              />
              <circle cx="0" cy="0" r="24" fill="none" stroke="#eb766b" strokeOpacity="0.48" strokeWidth="2.2" />
              <circle cx="0" cy="0" r="21" fill="none" stroke="#5e0d11" strokeOpacity="0.55" strokeWidth="1.5" />
              <path
                d="M0,-13 Q2,-2 13,0 Q2,2 0,13 Q-2,2 -13,0 Q-2,-2 0,-13 Z"
                fill="#f6cf7f"
              />
            </g>
          </svg>

          {/* Recipient Name on Ivory Flap: read-only in shared link, inline-editable in creator mode */}
          <div
            className={`env-recipient-slot ${editingName ? 'is-editing' : ''}`}
            onClick={(e) => {
              if (!isSharedGift) e.stopPropagation();
            }}
          >
            {isSharedGift ? (
              <div className="env-recipient-readonly" onClick={handleUnseal}>
                致 · {config.recipient || '亲爱的你'}
              </div>
            ) : editingName ? (
              <div className="env-inline-editor">
                <span className="env-to-prefix">致 ·</span>
                <input
                  type="text"
                  className="env-inline-input"
                  value={config.recipient}
                  maxLength={20}
                  autoFocus
                  placeholder="输入对方名字"
                  onChange={(e) => onUpdateRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingName(false);
                  }}
                />
                <button
                  type="button"
                  className="env-inline-done"
                  onClick={() => setEditingName(false)}
                  title="完成修改"
                >
                  <Check size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="env-recipient-btn"
                onClick={() => setEditingName(true)}
                title="点击直接修改信封收信人名字"
              >
                <span>致 · {config.recipient || '亲爱的你'}</span>
                <PenLine size={13} className="env-edit-icon" />
              </button>
            )}
          </div>

          <div className="intro-wax-pulse" />
        </div>

        <div className="intro-caption-main">{config.envelopeTagline}</div>
        <div className="intro-caption-hint">
          {isSharedGift
            ? '轻点红色火漆印，点亮专属星光圣诞树'
            : '点击上方名字可直接修改 · 轻点红色火漆开启星光圣诞树'}
        </div>
      </div>

      {/* Luminous pearlescent white-gold flash overlay (00:01) */}
      <div className={`intro-flash-veil ${opening ? 'active' : ''}`} />
    </div>
  );
};
