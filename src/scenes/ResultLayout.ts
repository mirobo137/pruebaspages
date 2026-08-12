export interface ResultLayout {
  compact: boolean;
  cardWidth: number;
  cardHeight: number;
  cardX: number;
  cardY: number;
  totalButtonWidth: number;
  buttonY: number;
}

export function calculateResultLayout(width: number, height: number): ResultLayout {
  const compact = height < 620;
  const cardWidth = Math.min(520, Math.max(280, width - 30));
  const cardHeight = Math.max(190, Math.min(compact ? 365 : 470, height - 150));
  const cardX = (width - cardWidth) / 2;
  const cardY = Math.max(compact ? 24 : 50, (height - cardHeight - 90) / 2);
  return {
    compact,
    cardWidth,
    cardHeight,
    cardX,
    cardY,
    totalButtonWidth: Math.min(520, Math.max(250, width - 30)),
    buttonY: Math.min(height - 78, cardY + cardHeight + 28),
  };
}
