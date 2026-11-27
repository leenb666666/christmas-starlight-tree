import React, { useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Sparkles, X } from 'lucide-react';
import { DEFAULT_GIFT_CONFIG, GiftConfig } from '../../types/gift';
import { buildGiftShareUrl } from '../../utils/giftCodec';

interface CustomizeDrawerProps {
  open: boolean;
  config: GiftConfig;
  onChange: (next: GiftConfig) => void;
  onClose: () => void;
  onPreviewFromEnvelope: () => void;
}

export const CustomizeDrawer: React.FC<CustomizeDrawerProps> = ({
  open,
  config,
  onChange,
  onClose,
  onPreviewFromEnvelope,
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => buildGiftShareUrl(config), [config]);

  if (!open) return null;

  const patch = (partial: Partial<GiftConfig>) => onChange({ ...config, ...partial });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const inp = document.createElement('input');
      inp.value = shareUrl;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-title">
            <Sparkles size={16} />
            <span>定制我的专属星光圣诞夜</span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-scroll">
          <label className="drawer-field">
            <span>收信人称呼（显示在信封与页面）</span>
            <input
              type="text"
              value={config.recipient}
              maxLength={32}
              onChange={(e) => patch({ recipient: e.target.value })}
            />
          </label>

          <label className="drawer-field">
            <span>信封底部导语</span>
            <input
              type="text"
              value={config.envelopeTagline}
              maxLength={50}
              onChange={(e) => patch({ envelopeTagline: e.target.value })}
            />
          </label>

          <label className="drawer-field">
            <span>圣诞树顶部副标题（Merry Christmas 下方）</span>
            <input
              type="text"
              value={config.subtitle}
              maxLength={50}
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </label>

          <div className="drawer-divider" />

          <label className="drawer-field">
            <span>互动问答 / 许愿标题</span>
            <input
              type="text"
              value={config.quizTitle}
              maxLength={36}
              onChange={(e) => patch({ quizTitle: e.target.value })}
            />
          </label>

          <label className="drawer-field">
            <span>问答题目</span>
            <input
              type="text"
              value={config.quizQuestion}
              maxLength={120}
              onChange={(e) => patch({ quizQuestion: e.target.value })}
            />
          </label>

          <div className="drawer-divider" />

          <label className="drawer-field">
            <span>长信开头称呼</span>
            <input
              type="text"
              value={config.letterGreeting}
              maxLength={36}
              onChange={(e) => patch({ letterGreeting: e.target.value })}
            />
          </label>

          <label className="drawer-field">
            <span>打字机长信正文（支持多段落换行）</span>
            <textarea
              rows={6}
              value={config.letterBody}
              maxLength={1000}
              onChange={(e) => patch({ letterBody: e.target.value })}
            />
          </label>

          <label className="drawer-field">
            <span>落款签名</span>
            <input
              type="text"
              value={config.sender}
              maxLength={32}
              onChange={(e) => patch({ sender: e.target.value })}
            />
          </label>

          <div className="drawer-share-card">
            <div className="drawer-share-title">独立私密分享链接</div>
            <p className="drawer-share-desc">
              你的全部定制内容已压缩编码进此链接，对方打开即可从信封拆封 → 星光树生长 → 问答 → 打字机长信完整体验。
            </p>
            <div className="drawer-url-box" title={shareUrl}>
              {shareUrl}
            </div>
            <button type="button" className="drawer-gold-btn" onClick={handleCopy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? '已复制链接！快发给 TA 吧' : '一键复制独立分享链接'}</span>
            </button>
          </div>
        </div>

        <div className="drawer-foot">
          <button
            type="button"
            className="drawer-sub-btn"
            onClick={() => {
              onClose();
              onPreviewFromEnvelope();
            }}
          >
            从拆信封完整预演
          </button>
          <button
            type="button"
            className="drawer-sub-btn"
            onClick={() => onChange(DEFAULT_GIFT_CONFIG)}
          >
            <RotateCcw size={13} />
            <span>恢复默认</span>
          </button>
        </div>
      </div>
    </div>
  );
};
