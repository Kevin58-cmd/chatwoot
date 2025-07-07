<script setup lang="ts">
import { useDialogStore } from 'dashboard/composables/useDialog';
import NextButton from '../button/Button.vue';

import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';

import { ref } from 'vue';

const dialog = useDialogStore();

const color = ref();

function handleConfirm() {
  if (dialog.onColorChange) {
    dialog.onColorChange(color.value);
  }
  dialog.closeColorDialog();
}
</script>

<template>
  <woot-modal
    :show="dialog.isShowColorDialog"
    :on-close="dialog.closeColorDialog"
  >
    <div class="flex flex-col h-auto overflow-auto">
      <woot-modal-header :header-title="dialog.title" />

      <form
        class="flex flex-col"
        @submit.prevent="handleConfirm"
      >
        <ColorPicker
          v-model:pure-color="color"
          is-widget
          format="hex"
          shape="square"
          use-type="pure"
          disable-history
          :default-colors="['#ffff00', '#00ffff']"
        />

        <NextButton
          class="mt-2"
          type="submit"
          :label="$t('DIALOG.BUTTONS.CONFIRM')"
          @click.prevent="handleConfirm"
        />
      </form>
    </div>
  </woot-modal>
</template>
