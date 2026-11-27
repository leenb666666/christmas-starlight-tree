export interface QuizOption {
  label: string;
  blessing: string;
}

export interface GiftConfig {
  recipient: string;
  subtitle: string;
  envelopeTagline: string;
  quizTitle: string;
  quizQuestion: string;
  quizOptions: QuizOption[];
  letterGreeting: string;
  letterBody: string;
  sender: string;
}

export const DEFAULT_GIFT_CONFIG: GiftConfig = {
  recipient: '亲爱的你',
  subtitle: '愿你岁末常欢喜 · 今冬皆胜意',
  envelopeTagline: '一封跨越星光的圣诞来信',
  quizTitle: '点亮你的圣诞星愿',
  quizQuestion: '如果这个冬天有一份魔法可以立刻实现，你最想把哪一份惊喜留在身边？',
  quizOptions: [
    {
      label: 'A. 岁岁平安，所爱之人常伴身旁',
      blessing: '✨ 愿望已挂上星光树梢：愿你和所爱之人岁岁安康、温暖常伴',
    },
    {
      label: 'B. 烦恼清零，每天都有不期而遇的小幸运',
      blessing: '✨ 愿望已挂上星光树梢：愿所有温柔与好运都奔你而来',
    },
    {
      label: 'C. 心怀热爱，奔赴一场自由闪亮的远方',
      blessing: '✨ 愿望已挂上星光树梢：愿你步履轻盈、眼中有光、一路生花',
    },
    {
      label: 'D. 以上全部都要，贪心一点也无妨！',
      blessing: '✨ 愿望已挂上星光树梢：平安、幸运与闪亮，这一年全部送给你',
    },
  ],
  letterGreeting: '亲爱的你：',
  letterBody:
    '见字如晤，圣诞快乐。\n\n总觉得冬天最温柔的事情，就是在漫天雪落与静谧星夜里，能有人惦记着你的冷暖。\n\n过去这一年，你或许经历过忙碌的深夜，也走过偶尔疲惫的路口，但谢谢你一直那么认真、那么努力地发光。\n\n所以我想用这棵从星尘里慢慢生长起来的金色圣诞树告诉你：无论外界多喧嚣，你永远值得被世界温柔以待。\n\n愿新的一年里，你有随时出发的勇气，也有安心停靠的港湾；愿清晨有暖阳，夜里有星光，所念皆如愿，所行化坦途。',
  sender: '一直为你祈愿的朋友',
};

export interface RipplePulse {
  id: number;
  x: number;
  z: number;
  startTime: number;
  strength: number;
}
