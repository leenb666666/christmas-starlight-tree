import LZString from 'lz-string';
import { DEFAULT_GIFT_CONFIG, GiftConfig } from '../types/gift';

interface CompactGift {
  v: 1;
  r: string;
  sub: string;
  env: string;
  qt: string;
  qq: string;
  qo: [string, string][];
  lg: string;
  lb: string;
  s: string;
}

export function encodeGiftToParam(cfg: GiftConfig): string {
  const payload: CompactGift = {
    v: 1,
    r: cfg.recipient.slice(0, 40),
    sub: cfg.subtitle.slice(0, 60),
    env: cfg.envelopeTagline.slice(0, 60),
    qt: cfg.quizTitle.slice(0, 40),
    qq: cfg.quizQuestion.slice(0, 140),
    qo: cfg.quizOptions.slice(0, 4).map((o) => [o.label.slice(0, 80), o.blessing.slice(0, 120)]),
    lg: cfg.letterGreeting.slice(0, 40),
    lb: cfg.letterBody.slice(0, 1200),
    s: cfg.sender.slice(0, 40),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeGiftFromParam(encoded: string): GiftConfig | null {
  try {
    const rawStr = LZString.decompressFromEncodedURIComponent(encoded);
    if (!rawStr) return null;
    const raw = JSON.parse(rawStr) as Partial<CompactGift>;
    if (!raw || typeof raw !== 'object') return null;

    return {
      recipient: typeof raw.r === 'string' ? raw.r : DEFAULT_GIFT_CONFIG.recipient,
      subtitle: typeof raw.sub === 'string' ? raw.sub : DEFAULT_GIFT_CONFIG.subtitle,
      envelopeTagline:
        typeof raw.env === 'string' ? raw.env : DEFAULT_GIFT_CONFIG.envelopeTagline,
      quizTitle: typeof raw.qt === 'string' ? raw.qt : DEFAULT_GIFT_CONFIG.quizTitle,
      quizQuestion: typeof raw.qq === 'string' ? raw.qq : DEFAULT_GIFT_CONFIG.quizQuestion,
      quizOptions:
        Array.isArray(raw.qo) && raw.qo.length > 0
          ? raw.qo.map((pair) => ({
              label: String(pair[0] || ''),
              blessing: String(pair[1] || '✨ 愿你圣诞快乐，所愿皆成真'),
            }))
          : DEFAULT_GIFT_CONFIG.quizOptions,
      letterGreeting:
        typeof raw.lg === 'string' ? raw.lg : DEFAULT_GIFT_CONFIG.letterGreeting,
      letterBody: typeof raw.lb === 'string' ? raw.lb : DEFAULT_GIFT_CONFIG.letterBody,
      sender: typeof raw.s === 'string' ? raw.s : DEFAULT_GIFT_CONFIG.sender,
    };
  } catch {
    return null;
  }
}

export function buildGiftShareUrl(cfg: GiftConfig): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('gift', encodeGiftToParam(cfg));
  return url.toString();
}

export function getGiftFromCurrentUrl(): GiftConfig | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('gift');
  if (raw) return decodeGiftFromParam(raw);
  if (window.location.hash.startsWith('#gift=')) {
    return decodeGiftFromParam(window.location.hash.slice('#gift='.length));
  }
  return null;
}
