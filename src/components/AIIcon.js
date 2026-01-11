import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/**
 * AI 助手图标 - 机器人头像
 * @param {Object} props
 * @param {number} props.size - 图标大小
 * @param {string} props.color - 图标颜色
 * @param {boolean} props.focused - 是否选中状态
 */
export default function AIIcon({ size = 24, color = '#000', focused = false }) {
  const strokeWidth = focused ? 2.5 : 2;
  const opacity = focused ? 1 : 0.7;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 机器人头部（圆角矩形） */}
      <Rect
        x="5"
        y="7"
        width="14"
        height="12"
        rx="3"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={focused ? color : 'none'}
        opacity={opacity}
      />
      
      {/* 天线 */}
      <Path
        d="M12 7 L12 4 M12 4 L10 2 M12 4 L14 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      
      {/* 左眼 */}
      <Circle
        cx="9"
        cy="11"
        r="1.5"
        fill={focused ? '#fff' : color}
        opacity={opacity}
      />
      
      {/* 右眼 */}
      <Circle
        cx="15"
        cy="11"
        r="1.5"
        fill={focused ? '#fff' : color}
        opacity={opacity}
      />
      
      {/* 嘴巴（微笑弧线） */}
      <Path
        d="M9 15 Q12 17 15 15"
        stroke={focused ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
      
      {/* 左侧闪电（AI 能量） */}
      <Path
        d="M4 12 L2 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity * 0.8}
      />
      
      {/* 右侧闪电 */}
      <Path
        d="M20 12 L22 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity * 0.8}
      />
      
      {/* 身体连接（脖子） */}
      <Rect
        x="10"
        y="19"
        width="4"
        height="2"
        rx="1"
        fill={color}
        opacity={opacity * 0.6}
      />
    </Svg>
  );
}
