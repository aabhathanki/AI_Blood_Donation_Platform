import React from "react";

interface ChartProps {
  type: "bar" | "line" | "area";
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  height = 200,
  color = "#ef4444" // default red
}) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartWidth = 500;
  const chartHeight = height;
  const padding = 40;

  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  // Generate points for line/area charts
  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * graphWidth;
    const y = padding + graphHeight - (d.value / maxVal) * graphHeight;
    return { x, y, label: d.label, val: d.value };
  });

  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPointsStr = points.length
    ? `${padding},${padding + graphHeight} ${pointsStr} ${padding + graphWidth},${padding + graphHeight}`
    : "";

  return (
    <div className="w-full bg-slate-900/50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl relative overflow-hidden backdrop-blur-md">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full overflow-visible"
      >
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + graphHeight - ratio * graphHeight;
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={padding + graphWidth}
                y2={y}
                stroke="rgba(148, 163, 184, 0.08)"
                strokeDasharray="4,4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500"
                textAnchor="end"
              >
                {Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Rendering Bar Chart */}
        {type === "bar" &&
          points.map((p, idx) => {
            const barWidth = Math.max(10, graphWidth / (data.length || 1) - 15);
            const x = p.x - barWidth / 2;
            const barHeight = padding + graphHeight - p.y;
            return (
              <g key={idx} className="group">
                <rect
                  x={x}
                  y={p.y}
                  width={barWidth}
                  height={Math.max(2, barHeight)}
                  rx={4}
                  fill={color}
                  className="transition-all duration-500 hover:opacity-85"
                  opacity={0.8}
                />
                {/* Value on hover */}
                <text
                  x={p.x}
                  y={p.y - 8}
                  className="text-[10px] font-bold fill-slate-700 dark:fill-slate-200 opacity-0 group-hover:opacity-100 transition-opacity text-center"
                  textAnchor="middle"
                >
                  {p.val}
                </text>
              </g>
            );
          })}

        {/* Rendering Area Chart */}
        {type === "area" && points.length > 0 && (
          <polygon
            points={areaPointsStr}
            fill={`url(#area-gradient-${color.replace("#", "")})`}
            opacity={0.15}
          />
        )}

        {/* Rendering Line Chart */}
        {(type === "line" || type === "area") && points.length > 0 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            points={pointsStr}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots on points for Line/Area */}
        {(type === "line" || type === "area") &&
          points.map((p, idx) => (
            <g key={idx} className="group">
              <circle
                cx={p.x}
                cy={p.y}
                r={4.5}
                fill={color}
                className="transition-all duration-300 group-hover:r-6 cursor-pointer"
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={p.x}
                y={p.y - 10}
                className="text-[10px] font-bold fill-slate-700 dark:fill-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                textAnchor="middle"
              >
                {p.val}
              </text>
            </g>
          ))}

        {/* X-axis Labels */}
        {points.map((p, idx) => (
          <text
            key={idx}
            x={p.x}
            y={padding + graphHeight + 18}
            className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient
            id={`area-gradient-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
