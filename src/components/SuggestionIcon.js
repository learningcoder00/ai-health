import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * 生成建议图标 - 灯泡 + 闪光（用于“生成建议”标志）
 *
 * @param {Object} props
 * @param {number} props.size - 图标大小
 * @param {string} props.color - 图标颜色
 * @param {boolean} props.focused - 是否高亮/选中状态
 */
export default function SuggestionIcon({ size = 24, color = '#000', focused = false }) {
  const strokeWidth = focused ? 2.5 : 2;
  const opacity = focused ? 1 : 0.8;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 外框：作为“标志/徽章” */}
      <Rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={focused ? color : 'none'}
        opacity={opacity}
      />

      {/* 灯泡轮廓（建议/灵感） */}
      <Path
        d="M12 7.1c-2.05 0-3.7 1.6-3.7 3.58 0 1.25.62 2.35 1.6 3.02.43.3.7.76.7 1.27V15h2.8v-.03c0-.51.27-.97.7-1.27.98-.67 1.6-1.77 1.6-3.02 0-1.98-1.65-3.58-3.7-3.58Z"
        stroke={focused ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity={opacity}
      />
      {/* 灯泡底座 */}
      <Path
        d="M10.4 16.3h3.2M10.8 17.7h2.4"
        stroke={focused ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />

      {/* 闪光（表示“生成/AI”） */}
      <Path
        d="M17.6 6.3l.35.9.9.35-.9.35-.35.9-.35-.9-.9-.35.9-.35.35-.9Z"
        fill={focused ? '#fff' : color}
        opacity={opacity}
      />
    </Svg>
  );
}

