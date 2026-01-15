import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * AI 生成图标 - 星光/闪耀（用于“AI生成”标记）
 *
 * @param {Object} props
 * @param {number} props.size - 图标大小
 * @param {string} props.color - 图标颜色
 */
export default function AIGeneratedIcon({ size = 18, color = '#000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 主星光（四尖） */}
      <Path
        d="M12 2.75l1.25 4.1 4.1 1.25-4.1 1.25L12 13.45l-1.25-4.1-4.1-1.25 4.1-1.25L12 2.75Z"
        fill={color}
      />
      {/* 右上小星光 */}
      <Path
        d="M18.2 10.2l.55 1.8 1.8.55-1.8.55-.55 1.8-.55-1.8-1.8-.55 1.8-.55.55-1.8Z"
        fill={color}
        opacity="0.9"
      />
      {/* 左下小星光 */}
      <Path
        d="M6.3 14.4l.45 1.45 1.45.45-1.45.45-.45 1.45-.45-1.45-1.45-.45 1.45-.45.45-1.45Z"
        fill={color}
        opacity="0.75"
      />
    </Svg>
  );
}

