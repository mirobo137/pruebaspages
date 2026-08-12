export interface MenuLayout {
  landscape: boolean;
  compact: boolean;
  contentX: number;
  contentWidth: number;
  titleY: number;
  subtitleY: number;
  actionsY: number;
  actionWidth: number;
  categoryTop: number;
  listTop: number;
  listHeight: number;
  difficultyTop: number;
  playTop: number;
  showSubtitle: boolean;
  showDetails: boolean;
}

const TIER_HEIGHT = 48;

export function calculateMenuLayout(width: number, height: number): MenuLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const landscape = safeWidth > safeHeight && safeWidth >= 650;
  if (landscape) return calculateLandscape(safeWidth, safeHeight);

  const compact = safeHeight < 680;
  const contentWidth = Math.min(500, Math.max(250, safeWidth - 28));
  const contentX = (safeWidth - contentWidth) / 2;
  const actionWidth = safeWidth < 360 ? 64 : 76;
  const titleY = compact ? 26 : Math.max(32, safeHeight * 0.05);
  const subtitleY = titleY + 29;
  const actionsY = compact ? 50 : 77;
  const categoryTop = compact ? 112 : Math.max(146, safeHeight * 0.17);
  const listTop = categoryTop + TIER_HEIGHT + 8;
  const reservedBelowList = compact ? 148 : 300;
  const minimumListHeight = compact ? 112 : 128;
  const listHeight = Math.max(
    minimumListHeight,
    Math.min(246, safeHeight - listTop - reservedBelowList),
  );
  const difficultyTop = listTop + listHeight + (compact ? 12 : 14);
  const playTop = compact ? difficultyTop + 62 : difficultyTop + 214;

  return {
    landscape,
    compact,
    contentX,
    contentWidth,
    titleY,
    subtitleY,
    actionsY,
    actionWidth,
    categoryTop,
    listTop,
    listHeight,
    difficultyTop,
    playTop,
    showSubtitle: !compact,
    showDetails: !compact,
  };
}

function calculateLandscape(width: number, height: number): MenuLayout {
  const contentWidth = Math.min(920, width - 32);
  const contentX = (width - contentWidth) / 2;
  const compact = height < 370;
  const categoryTop = compact ? 78 : Math.max(92, height * 0.2);
  const listTop = categoryTop + TIER_HEIGHT + 8;
  const listHeight = Math.max(100, height - listTop - 14);
  return {
    landscape: true,
    compact,
    contentX,
    contentWidth,
    titleY: 27,
    subtitleY: 54,
    actionsY: 12,
    actionWidth: 76,
    categoryTop,
    listTop,
    listHeight,
    difficultyTop: categoryTop,
    playTop: compact ? categoryTop + 62 : categoryTop + 194,
    showSubtitle: !compact,
    showDetails: !compact,
  };
}
