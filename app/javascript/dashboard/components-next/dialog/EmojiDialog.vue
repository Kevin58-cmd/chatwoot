<script setup>
import { useDialogStore } from 'dashboard/composables/useDialog';
import { defineAsyncComponent } from 'vue';

const EmojiInput = defineAsyncComponent(
  () => import('shared/components/emoji/EmojiInput.vue')
);

const dialog = useDialogStore();

function hideEmojiPicker() {
  dialog.closeEmojiDialog();
}

function onSelect(emoji) {
  let callback = dialog.onSelectEmoji;
  if (callback) {
    callback(emoji);
  }
}
</script>

<template>
  <div>
    <EmojiInput
      v-if="dialog.isShowEmojiDialog"
      v-on-clickaway="hideEmojiPicker"
      :style="{
        left: dialog.emojiDialogPos.left + 'px',
        top: dialog.emojiDialogPos.top + 'px',
      }"
      :on-click="onSelect"
    />
  </div>
</template>
