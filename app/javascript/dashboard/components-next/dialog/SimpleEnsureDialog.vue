<script setup lang="ts">
import NextButton from '../button/Button.vue';
import { useDialogStore } from 'dashboard/composables/useDialog';
const dialog = useDialogStore();

function close() {
  dialog.closeEnsureDialog();
}

function handleCancel() {
  let onConfirm = dialog.onEnsure;
  onConfirm?.(false);
  close();
}

function handleConfirm() {
  let onConfirm = dialog.onEnsure;
  onConfirm?.(true);
  close();
}
</script>

<template>
  <woot-modal
    :show="dialog.isShowEnsureDialog"
    :on-close="close"
  >
    <div class="flex flex-col h-auto overflow-auto">
      <woot-modal-header :header-title="dialog.title" />

      <form
        class="flex flex-col w-full"
        @submit.prevent="handleConfirm"
      >
        <div class="w-full">
          <span>{{ dialog.message }}</span>
        </div>
        <div class="w-full flex justify-end gap-2 items-center">
          <NextButton
            type="reset"
            :label="dialog.cancelLabel || $t('DIALOG.BUTTONS.CANCEL')"
            @click.prevent="handleCancel"
          />
          <NextButton
            type="submit"
            :label="dialog.okLabel || $t('DIALOG.BUTTONS.CONFIRM')"
            @click.prevent="handleConfirm"
          />
        </div>
      </form>
    </div>
  </woot-modal>
</template>
