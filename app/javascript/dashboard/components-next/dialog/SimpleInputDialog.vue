<script setup lang="ts">
import { ref, watch } from 'vue';
import { useStore } from 'vuex';
import NextButton from '../button/Button.vue';
import { useMapGetter } from '../../composables/store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const store = useStore();
const show = useMapGetter('dialog/show');
const title = useMapGetter('dialog/title');
const placeholder = useMapGetter('dialog/placeholder');
const defaultValue = useMapGetter('dialog/defaultValue');
const confirmButtonLabel = useMapGetter('dialog/confirmButtonLabel');
const cancelButtonLabel = useMapGetter('dialog/cancelButtonLabel');

const inputValue = ref('');

watch(show, newVal => {
  if (newVal) {
    inputValue.value = defaultValue.value || '';
  }
});

function close() {
  store.dispatch('dialog/closeInputDialog');
}

function handleConfirm() {
  let onConfirm = store.state.dialog.onConfirm;
  onConfirm?.(inputValue.value);
  close();
}
</script>

<template>
  <woot-modal
    :show="show"
    :on-close="close"
  >
    <div class="flex flex-col h-auto overflow-auto">
      <woot-modal-header :header-title="title" />

      <form
        class="flex flex-col w-full"
        @submit.prevent="handleConfirm"
      >
        <div class="w-full">
          <input
            v-model="inputValue"
            type="text"
            :placeholder="placeholder"
          />
        </div>
        <div class="w-full flex justify-end gap-2 items-center">
          <NextButton
            type="reset"
            :label="cancelButtonLabel || t('DIALOG.BUTTONS.CANCEL')"
            @click.prevent="close"
          />
          <NextButton
            type="submit"
            :label="confirmButtonLabel || t('DIALOG.BUTTONS.CONFIRM')"
            :disabled="!inputValue"
            @click.prevent="handleConfirm"
          />
        </div>
      </form>
    </div>
  </woot-modal>
</template>
