import { defineStore } from 'pinia';

export const useDialogStore = defineStore('dialog', {
  state: () => ({
    isShowColorDialog: false, // 控制是否显示全局的修改颜色弹窗
    onColorChange: null,
    title: '',
    isShowInputDailog: false, // 控制是否显示全局的用户输入框
    placeholder: '',
    defaultInputValue: '',
    okLabel: '',
    cancelLabel: '',
    onConfirm: null,
    isShowEnsureDialog: false, // 是否显示简单确认对话框
    message: '',
    onEnsure: null, // 点击回调,
    isShowEmojiDialog: false,
    onSelectEmoji: null,
    emojiDialogPos: { left: 0, top: 0 },
  }),
  getters: {},
  actions: {
    openColorDialog(onColorChange) {
      this.isShowColorDialog = true;
      this.onColorChange = onColorChange;
    },
    closeColorDialog() {
      this.isShowColorDialog = false;
      this.onColorChange = null;
    },
    openInputDialog(payload) {
      this.isShowInputDailog = true;
      this.title = '';
      if (payload.title) {
        this.title = payload.title;
      }
      if (payload.placeholder) {
        this.placeholder = payload.placeholder;
      }
      if (payload.defaultInputValue) {
        this.defaultInputValue = payload.defaultInputValue;
      }
      if (payload.okLabel) {
        this.okLabel = payload.okLabel;
      }
      if (payload.cancelLabel) {
        this.cancelLabel = payload.cancelLabel;
      }
      if (payload.onConfirm) {
        this.onConfirm = payload.onConfirm;
      }
    },
    closeInputDialog() {
      this.isShowInputDailog = false;
      this.onConfirm = null;
    },
    openEnsureDialog(payload) {
      this.isShowEnsureDialog = true;
      this.title = '';
      if (payload.title) {
        this.title = payload.title;
      }
      if (payload.message) {
        this.message = payload.message;
      }
      if (payload.onEnsure) {
        this.onEnsure = payload.onEnsure;
      }
      if (payload.okLabel) {
        this.okLabel = payload.okLabel;
      }
      if (payload.cancelLabel) {
        this.cancelLabel = payload.cancelLabel;
      }
    },
    closeEnsureDialog() {
      this.isShowEnsureDialog = false;
      this.onEnsure = null;
    },
    openEmojiDialog(targetElement, callback) {
      const rect = targetElement.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 300;

      const spacing = 8; // 按钮和弹窗之间的间隔

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let top;
      let left;

      // 默认优先放在下方、右侧
      const preferBottom = rect.bottom + spacing + popupHeight <= windowHeight;
      const preferTop = rect.top - spacing - popupHeight >= 0;
      const preferRight = rect.left + popupWidth <= windowWidth;
      const preferLeft = rect.right - popupWidth >= 0;

      // 垂直方向：优先底部，退而求其次顶部
      if (preferBottom) {
        top = rect.bottom + spacing + window.scrollY;
      } else if (preferTop) {
        top = rect.top - popupHeight - spacing + window.scrollY;
      } else {
        // 实在放不下，粘在底部（避免弹窗消失）
        top = Math.max(window.scrollY, windowHeight - popupHeight);
      }

      // 水平方向：优先右侧对齐左边，退而求其次左侧对齐右边
      if (preferRight) {
        left = rect.left + window.scrollX;
      } else if (preferLeft) {
        left = rect.right - popupWidth + window.scrollX;
      } else {
        // 居中对齐（避免弹窗被截断）
        left = Math.max(0, (windowWidth - popupWidth) / 2 + window.scrollX);
      }

      // 设置弹窗位置
      this.emojiDialogPos.top = top;
      this.emojiDialogPos.left = left;
      this.isShowEmojiDialog = true;
      this.onSelectEmoji = callback;
    },
    closeEmojiDialog() {
      this.isShowEmojiDialog = false;
      this.onSelectEmoji = null;
    },
  },
});
