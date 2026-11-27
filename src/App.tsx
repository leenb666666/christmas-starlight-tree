import React, { useCallback, useEffect, useState } from 'react';
import {
  Gift,
  MailOpen,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DEFAULT_GIFT_CONFIG, GiftConfig } from './types/gift';
import { getGiftFromCurrentUrl } from './utils/giftCodec';
import { christmasAudio } from './utils/christmasAudio';
import { StarlightScene } from './components/scene/StarlightScene';
import { EnvelopeIntro } from './components/ui/EnvelopeIntro';
import { CalligraphyTitle } from './components/ui/CalligraphyTitle';
import { QuizModal } from './components/ui/QuizModal';
import { TypewriterLetterModal } from './components/ui/TypewriterLetterModal';
import { CustomizeDrawer } from './components/ui/CustomizeDrawer';

export const App: React.FC = () => {
  const [config, setConfig] = useState<GiftConfig>(
    () => getGiftFromCurrentUrl() ?? DEFAULT_GIFT_CONFIG
  );
  const [stage, setStage] = useState<'envelope' | 'scene'>('envelope');
  const [treeGrown, setTreeGrown] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);
  const [celebrateSignal, setCelebrateSignal] = useState(0);
  const [muted, setMuted] = useState(false);

  const [quizOpen, setQuizOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pickedWishIdx, setPickedWishIdx] = useState<number | null>(null);
  const [activeBlessingRibbon, setActiveBlessingRibbon] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      christmasAudio.stop();
    };
  }, []);

  const handleOpenEnvelope = useCallback(() => {
    christmasAudio.playUnsealChime();
    christmasAudio.startMusic();
    setTreeGrown(false);
    setStage('scene');
    setReplaySignal((n) => n + 1);
  }, []);

  const handleTreeGrown = useCallback(() => {
    setTreeGrown(true);
  }, []);

  const handleReplay = useCallback(() => {
    setTreeGrown(false);
    setActiveBlessingRibbon(null);
    setReplaySignal((n) => n + 1);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      christmasAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleSubmitWish = useCallback((idx: number, blessing: string) => {
    setPickedWishIdx(idx);
    setQuizOpen(false);
    setActiveBlessingRibbon(blessing);
    setCelebrateSignal((n) => n + 1);
  }, []);

  return (
    <div className="starlight-app">
      {/* 3D Starlight Particle Tree + Ground Ripples + Apex Shockwave + Sky Fireworks */}
      <StarlightScene
        active={stage === 'scene'}
        replaySignal={replaySignal}
        celebrateSignal={celebrateSignal}
        onTreeGrown={handleTreeGrown}
      />

      {/* Stage 1: Opening Ivory & Forest-Emerald Wax-Sealed Envelope (00:00 - 00:01) */}
      {stage === 'envelope' && (
        <EnvelopeIntro
          config={config}
          onOpen={handleOpenEnvelope}
          onOpenCustomize={() => setCustomizeOpen(true)}
        />
      )}

      {/* Stage 2: Starry Night HUD Overlays (00:07 - 00:33) */}
      {stage === 'scene' && (
        <div className="scene-hud">
          {/* Top-right discrete luxury controls */}
          <div className="scene-top-actions">
            <button
              type="button"
              className="hud-chip"
              onClick={handleReplay}
              title="重新播放螺旋生长与星芒冲击波动画"
            >
              <RotateCcw size={14} />
              <span>重播生长</span>
            </button>
            <button
              type="button"
              className="hud-chip"
              onClick={() => setCustomizeOpen(true)}
              title="修改文案并生成专属分享链接"
            >
              <Sparkles size={14} />
              <span>定制分享</span>
            </button>
            <button
              type="button"
              className="hud-icon-btn"
              onClick={handleToggleMute}
              title={muted ? '开启背景音乐' : '静音'}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          {/* Calligraphic "Merry Christmas" written across top sky after apex ignition */}
          <CalligraphyTitle visible={treeGrown} subtitle={config.subtitle} />

          {/* Floating glowing wish blessing ribbon over the tree (00:18 - 00:21) */}
          {activeBlessingRibbon && treeGrown && (
            <div className="wish-ribbon-banner">
              <span>{activeBlessingRibbon}</span>
            </div>
          )}

          {/* Bottom twin glowing circular action orbs (matching 00:09 - 00:12!) */}
          <div className={`scene-bottom-orbs ${treeGrown ? 'is-visible' : ''}`}>
            <button
              type="button"
              className="glow-orb-btn"
              onClick={() => setQuizOpen(true)}
            >
              <span className="orb-circle orb-gift">
                <Gift size={20} />
              </span>
              <span className="orb-label">点亮星愿</span>
            </button>

            <button
              type="button"
              className="glow-orb-btn"
              onClick={() => setLetterOpen(true)}
            >
              <span className="orb-circle orb-letter">
                <MailOpen size={20} />
              </span>
              <span className="orb-label">阅读来信</span>
            </button>
          </div>

          {treeGrown && (
            <div className="ripple-micro-hint">
              轻点地面荡开星光涟漪 · 拖拽旋转 3D 圣诞树
            </div>
          )}
        </div>
      )}

      {/* Interactive Quiz / Wishing Modal (00:13 - 00:17) */}
      <QuizModal
        open={quizOpen}
        config={config}
        selectedIndex={pickedWishIdx}
        onClose={() => setQuizOpen(false)}
        onSubmitWish={handleSubmitWish}
      />

      {/* Wax-Sealed Typewriter Letter Modal (00:23 - 00:32) */}
      <TypewriterLetterModal
        open={letterOpen}
        config={config}
        onClose={() => setLetterOpen(false)}
      />

      {/* Creator Customization & Private Shareable Link Drawer */}
      <CustomizeDrawer
        open={customizeOpen}
        config={config}
        onChange={setConfig}
        onClose={() => setCustomizeOpen(false)}
        onPreviewFromEnvelope={() => {
          setTreeGrown(false);
          setActiveBlessingRibbon(null);
          setStage('envelope');
        }}
      />
    </div>
  );
};

export default App;
