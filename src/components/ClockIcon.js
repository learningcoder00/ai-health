import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * 定点提醒图标 - 时钟样式
 * @param {Object} props
 * @param {number} props.size - 图标大小
 * @param {string} props.color - 图标颜色
 * @param {boolean} props.filled - 是否填充（选中状态）
 */
export default function ClockIcon({ size = 24, color = '#000', filled = false }) {
  const strokeWidth = filled ? 2.5 : 2;
  const opacity = filled ? 1 : 0.8;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 外圈 - 时钟边框 */}
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={filled ? color : 'none'}
        opacity={opacity}
      />
      
      {/* 时钟刻度 - 12点位置 */}
      <Line
        x1="12"
        y1="4"
        x2="12"
        y2="5.5"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 时钟刻度 - 3点位置 */}
      <Line
        x1="20"
        y1="12"
        x2="18.5"
        y2="12"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 时钟刻度 - 6点位置 */}
      <Line
        x1="12"
        y1="20"
        x2="12"
        y2="18.5"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 时钟刻度 - 9点位置 */}
      <Line
        x1="4"
        y1="12"
        x2="5.5"
        y2="12"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 时针 - 指向8点方向 */}
      <Path
        d="M12 12 L9 14.5"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 分针 - 指向12点方向 */}
      <Path
        d="M12 12 L12 7"
        stroke={filled ? '#fff' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* 中心点 */}
      <Circle
        cx="12"
        cy="12"
        r="1.5"
        fill={filled ? '#fff' : color}
        opacity={opacity}
      />
      
      {/* 固定标记 - 小三角形（表示固定时间点） */}
      {!filled && (
        <Path
          d="M12 2 L14 4.5 L10 4.5 Z"
          fill={color}
          opacity={opacity * 0.8}
        />
      )}
    </Svg>
  );
}
