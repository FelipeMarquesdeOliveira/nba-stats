import { getLineColor } from '@domain/types';
import './LineIndicator.css';

interface LineIndicatorProps {
  pointsRemaining: number;
}

function LineIndicator({ pointsRemaining }: LineIndicatorProps) {
  const color = getLineColor(pointsRemaining);

  const getLabel = () => {
    if (pointsRemaining <= 0) return '✓';
    return `+${pointsRemaining}`;
  };

  return (
    <span className={`line-indicator line-${color}`}>
      {getLabel()}
    </span>
  );
}

export { LineIndicator };