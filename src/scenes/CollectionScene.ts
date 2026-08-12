import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { ThemeCollectionItem } from '../customization/ThemeCollection';
import type { VisualQualityProfile } from '../customization/VisualQuality';
import type { Scene } from '../core/scene/Scene';
import { MenuButton } from '../ui/MenuButton';
import { ThemeList } from '../ui/ThemeList';
import { ThemePreview } from '../ui/ThemePreview';
import { CUSTOM_THEME_ID } from '../customization/ThemeComponents';

export interface CollectionSceneOptions {
  items: readonly ThemeCollectionItem[];
  equippedThemeId: string;
  visualQuality: VisualQualityProfile;
  onEquip: (themeId: string) => boolean;
  onCustomize: () => void;
  onBack: () => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 27,
  fontWeight: '900',
  letterSpacing: 2,
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#a2b0d0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 0.7,
  align: 'center',
});

const nameStyle = new TextStyle({
  fill: '#f8faff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 20,
  fontWeight: '900',
  letterSpacing: 1,
});

const detailStyle = new TextStyle({
  fill: '#aab8d8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
  wordWrap: true,
  wordWrapWidth: 320,
});

const statusStyle = new TextStyle({
  fill: '#75f5d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.7,
  align: 'center',
});

export class CollectionScene implements Scene {
  readonly id = 'collection';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'COLECCION VISUAL', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'PREVISUALIZA Y EQUIPA TU IDENTIDAD DE FLOW',
    style: subtitleStyle,
  });
  private readonly themeName = new Text({ text: '', style: nameStyle });
  private readonly details = new Text({ text: '', style: detailStyle });
  private readonly status = new Text({ text: '', style: statusStyle });
  private readonly themeList: ThemeList;
  private readonly preview: ThemePreview;
  private readonly backButton: MenuButton;
  private readonly equipButton: MenuButton;
  private readonly onCustomize: CollectionSceneOptions['onCustomize'];
  private readonly items: readonly ThemeCollectionItem[];
  private readonly onEquip: CollectionSceneOptions['onEquip'];
  private equippedThemeId: string;
  private selectedThemeId: string;
  private width: number;
  private height: number;

  constructor(width: number, height: number, options: CollectionSceneOptions) {
    this.width = width;
    this.height = height;
    this.items = options.items;
    this.onEquip = options.onEquip;
    this.onCustomize = options.onCustomize;
    this.equippedThemeId = options.equippedThemeId;
    this.selectedThemeId = this.items.some(
      (item) => item.theme.id === this.equippedThemeId,
    )
      ? this.equippedThemeId
      : this.items[0]?.theme.id ?? '';
    this.themeList = new ThemeList(this.handleThemeSelected);
    this.preview = new ThemePreview(options.visualQuality);
    this.backButton = new MenuButton('‹', options.onBack, 0x17233e, 44);
    this.equipButton = new MenuButton('EQUIPAR', this.handleEquip, 0x3155a5, 54);
    this.root.addChild(
      this.background,
      this.title,
      this.subtitle,
      this.themeList,
      this.preview,
      this.themeName,
      this.details,
      this.status,
      this.backButton,
      this.equipButton,
    );
  }

  mount(): void {
    this.themeList.setItems(this.items);
    this.themeList.setEquippedTheme(this.equippedThemeId);
    this.themeList.setSelectedTheme(this.selectedThemeId);
    this.refreshSelection();
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    this.preview.updatePreview(deltaSeconds);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const selected = this.selectedItem;
    const backgroundTheme = selected?.theme;
    this.background.clear().rect(0, 0, width, height).fill({
      color: backgroundTheme?.background.backdrop ?? 0x070c1c,
    });
    this.background.circle(width * 0.08, height * 0.18, Math.max(width, height) * 0.25)
      .fill({
        color: backgroundTheme?.background.phasePrimary[0] ?? 0x65efff,
        alpha: 0.045,
      });
    this.background.circle(width * 0.92, height * 0.75, Math.max(width, height) * 0.29)
      .fill({
        color: backgroundTheme?.background.phasePrimary[2] ?? 0xff5bd8,
        alpha: 0.035,
      });

    const landscape = width > height && width >= 650;
    const compact = !landscape && height < 680;
    this.subtitle.visible = true;
    this.details.visible = true;
    this.title.style.fontSize = landscape ? 27 : width < 400 ? 23 : 25;
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.backButton.resize(46);
    this.backButton.position.set(10, 13);

    if (landscape) {
      this.resizeLandscape(width, height);
      return;
    }

    const contentWidth = Math.min(520, Math.max(260, width - 28));
    const contentX = (width - contentWidth) / 2;
    this.title.position.set(width / 2, compact ? 30 : 38);
    this.subtitle.visible = !compact;
    this.subtitle.position.set(width / 2, 67);

    const previewTop = compact ? 58 : 94;
    const previewHeight = compact ? 154 : Math.max(205, Math.min(270, height * 0.31));
    this.preview.position.set(contentX, previewTop);
    this.preview.resize(contentWidth, previewHeight);

    const listTop = previewTop + previewHeight + 13;
    const listHeight = compact
      ? Math.max(112, Math.min(135, height - listTop - 180))
      : Math.max(145, Math.min(195, height - listTop - 190));
    this.themeList.position.set(contentX, listTop);
    this.themeList.resize(contentWidth, listHeight);

    const detailsTop = listTop + listHeight + 13;
    this.themeName.position.set(contentX + 4, detailsTop);
    this.details.style.wordWrapWidth = contentWidth - 8;
    this.details.position.set(contentX + 4, detailsTop + (compact ? 25 : 29));
    this.details.visible = !compact;
    this.status.anchor.set(0.5, 0);
    this.status.position.set(width / 2, Math.min(height - 92, detailsTop + (compact ? 29 : 75)));
    this.equipButton.resize(contentWidth);
    this.equipButton.position.set(contentX, height - 70);
  }

  unmount(): void {}

  private readonly handleThemeSelected = (themeId: string): void => {
    this.selectedThemeId = themeId;
    this.refreshSelection();
    this.resize(this.width, this.height);
  };

  private readonly handleEquip = (): void => {
    const item = this.selectedItem;
    if (item?.theme.id === CUSTOM_THEME_ID) {
      this.onCustomize();
      return;
    }
    if (!item || !item.unlocked) {
      this.status.text = item?.unlockDescription ?? 'Tema no disponible.';
      return;
    }
    if (!this.onEquip(item.theme.id)) {
      this.status.text = 'No se pudo equipar este tema.';
      return;
    }
    this.equippedThemeId = item.theme.id;
    this.themeList.setEquippedTheme(this.equippedThemeId);
    this.status.text = `${item.theme.name.toUpperCase()} EQUIPADO`;
    this.refreshSelection(false);
  };

  private refreshSelection(resetStatus = true): void {
    const item = this.selectedItem;
    if (!item) return;
    this.preview.setTheme(item.theme);
    this.themeName.text = item.theme.name.toUpperCase();
    this.themeName.style.fill = item.theme.background.phasePrimary[0];
    this.details.text = `${item.theme.description}\nORIGEN: ${item.origin.toUpperCase()}`;
    const equipped = item.theme.id === this.equippedThemeId;
    this.equipButton.setText(equipped
      ? item.theme.id === CUSTOM_THEME_ID ? 'EDITAR MI SKIN' : 'EQUIPADO'
      : item.unlocked
        ? item.theme.id === CUSTOM_THEME_ID ? 'EDITAR Y EQUIPAR' : 'EQUIPAR TEMA'
        : 'BLOQUEADO');
    this.equipButton.setEnabled(
      item.theme.id === CUSTOM_THEME_ID || (item.unlocked && !equipped),
    );
    if (resetStatus) {
      this.status.text = equipped
        ? 'TEMA ACTIVO EN MENU Y GAMEPLAY'
        : item.unlocked
          ? 'DISPONIBLE PARA EQUIPAR'
          : item.unlockDescription.toUpperCase();
    }
  }

  private resizeLandscape(width: number, height: number): void {
    const margin = 16;
    const top = 62;
    const listWidth = Math.min(286, width * 0.34);
    const rightX = margin + listWidth + 14;
    const rightWidth = width - rightX - margin;
    const previewHeight = Math.max(170, height - 153);
    this.title.position.set(rightX + rightWidth / 2, 25);
    this.subtitle.position.set(rightX + rightWidth / 2, 48);
    this.themeList.position.set(margin, top);
    this.themeList.resize(listWidth, Math.max(180, height - top - 16));
    this.preview.position.set(rightX, top);
    this.preview.resize(rightWidth, previewHeight);

    const detailsTop = top + previewHeight + 8;
    const buttonWidth = Math.min(210, rightWidth * 0.42);
    this.themeName.position.set(rightX + 3, detailsTop);
    this.details.style.wordWrapWidth = Math.max(150, rightWidth - buttonWidth - 20);
    this.details.position.set(rightX + 3, detailsTop + 27);
    this.status.anchor.set(1, 0);
    this.status.position.set(rightX + rightWidth, detailsTop - 1);
    this.equipButton.resize(buttonWidth);
    this.equipButton.position.set(rightX + rightWidth - buttonWidth, height - 62);
  }

  private get selectedItem(): ThemeCollectionItem | undefined {
    return this.items.find((item) => item.theme.id === this.selectedThemeId);
  }
}
