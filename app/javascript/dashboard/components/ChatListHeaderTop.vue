<script setup>
import NextButton from 'dashboard/components-next/button/Button.vue';
import { computed, ref } from 'vue';
import Checkbox from 'next/checkbox/Checkbox.vue';
import { useGroupStore } from 'dashboard/composables/useGroup';
import { useDialogStore } from 'dashboard/composables/useDialog';
import { checkUserGroupData } from 'dashboard/helper/groupHelper';
import localforage from 'localforage';
import { useMultiSendStore } from 'dashboard/composables/useMultiSendTask';
import Thumbnail from './widgets/Thumbnail.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { OnClickOutside } from '@vueuse/components';
import { useI18n } from 'vue-i18n';

const group = useGroupStore();
const selected = ref(false);
const dialog = useDialogStore();
const multiSend = useMultiSendStore();
const { t } = useI18n();
const fileInput = ref(null);
const currentTask = ref(null);
const position = ref({
  top: 0,
  left: 0,
});

function onMultiModeChange(checked) {
  group.setMultiSelectMode(checked);
}

function addGroupToTop() {
  let name = new Date().toISOString().substring(0, 16).replace('T', ' ');
  dialog.openInputDialog({
    title: t('FOLDER.INPUT_NAME'),
    placeholder: t('FOLDER.INPUT_HERA'),
    defaultInputValue: name,
    onConfirm: value => {
      let id = -1 * Date.now();
      let item = {
        isFolder: true,
        id: id + '',
        children: [],
        level: 1,
        data: {
          id: id,
          type: 'folder',
          title: value || name,
          emoji: '🔔',
          messages: [''],
          avatar: undefined,
          backgroundColor: '#5b5fc7',
          unread_count: 0,
          timestamp: Date.now(),
        },
      };
      group.addFolder(item, 'root');
    },
  });
}

function inputFolder() {
  fileInput.value?.click();
}

function download(d) {
  var fileName =
    'Chatwoot分类数据_' +
    new Date().toISOString().replace(/\..*$/, '') +
    '.json';
  let str = JSON.stringify(d, null, 4);
  let n = document.createElement('a');
  let r = new Blob([str], { type: 'octet/stream' });
  n.setAttribute('href', window.URL.createObjectURL(r));
  n.setAttribute('download', fileName);
  n.click();
}

function exportFolder() {
  if (group.currentAccountId) {
    let obj = {};
    obj[group.currentAccountId] = {
      userGroupData: group.userGroupData,
      expandFolderIds: group.expandedFolderIds,
    };
    download(obj);
  }
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = async e => {
      try {
        const text = e.target.result;
        const jsonData = JSON.parse(text);
        // console.log('解析后的 JSON 数据：', jsonData);
        let accountIds = Object.keys(jsonData);
        if (accountIds.length) {
          for (let i = 0; i < accountIds.length; i += 1) {
            let accountId = accountIds[i];
            let accUserData = jsonData[accountId];
            let accUserGroupData = checkUserGroupData(
              accUserData.userGroupData
            );
            let accExpandFolderIds = accUserData.expandFolderIds;
            // eslint-disable-next-line no-await-in-loop
            await localforage.setItem(
              'userGroupData_' + accountId,
              accUserGroupData
            );
            // eslint-disable-next-line no-await-in-loop
            await localforage.setItem(
              'expandFolderIds_' + accountId,
              accExpandFolderIds
            );
            if (group.getCurrentAccountId === accountId) {
              group.resetUserGroupData(accUserGroupData);
              group.resetExpandedIds(accExpandFolderIds);
            }
          }
        }
      } catch (err) {
        // alert(t('FOLDER.FILE_ERROR'));
      }
    };

    reader.onerror = () => {
      // alert(t('FOLDER.READ_FILE_FAILED'));
    };

    reader.readAsText(file);
    event.target.value = '';
  }
}

function showTaskDetail(task, target) {
  const rect = target.getBoundingClientRect();
  position.value.top = rect.bottom + window.scrollY;
  position.value.left = rect.left + window.scrollX;

  currentTask.value = task;
}

function closeTaskDetail() {
  currentTask.value = null;
}

function stopCurrentTask() {
  if (currentTask.value) multiSend.stopTask(currentTask.value.id);
}

function pauseOrStartCurrentTask() {
  if (currentTask.value) multiSend.startOrPauseTask(currentTask.value.id);
}

const hasTask = computed(
  () =>
    currentTask.value != null &&
    multiSend.tasks.some(it => it.id === currentTask.value.id)
);
</script>

<template>
  <div class="flex items-center px-3 pt-2">
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleFileChange"
    />
    <NextButton
      v-tooltip.top-end="$t('FOLDER.ADD_FOLDER')"
      icon="i-lucide-folder-plus"
      slate
      faded
      xs
      @click.prevent="addGroupToTop"
    />

    <NextButton
      v-tooltip.top-end="$t('FOLDER.INPUT_FOLDER')"
      class="ml-2"
      icon="i-lucide-file-down"
      slate
      faded
      xs
      @click.prevent="inputFolder"
    />

    <NextButton
      v-tooltip.top-end="$t('FOLDER.EXPORT_FOLDER')"
      class="ml-2"
      icon="i-lucide-file-up"
      slate
      faded
      xs
      @click.prevent="exportFolder"
    />

    <Checkbox
      v-model="selected"
      v-tooltip.top-end="$t('FOLDER.PATCH_MODE')"
      type="checkbox"
      class="ml-2 cursor-pointer"
      color-value="orange"
      @click.stop
      @change="onMultiModeChange($event.target.checked)"
    />

    <span
      v-if="selected"
      class="ml-1 shadow-lg rounded-full text-xxs font-semibold h-4 leading-4 min-w-[1rem] px-1 py-0 text-center text-white bg-n-orange"
    >
      {{ group.multiSelectChatIds.length }}
    </span>

    <div class="flex grow justify-end">
      <span
        class="ml-1 shadow-lg rounded-full text-xxs font-semibold h-4 leading-4 min-w-[1rem] px-1 py-0 text-center text-white bg-n-brand"
      >
        {{ group.multiSendChatIds.length }}
      </span>
    </div>
  </div>

  <div
    v-if="multiSend.tasks.length"
    class="flex items-center px-3 pt-1"
  >
    <NextButton
      v-for="task in multiSend.tasks"
      :key="task.id"
      v-tooltip.top-end="task.messages[0].message || $t('FOLDER.MEDIA_MESSAGE')"
      :label="task.sendedIds.length + '/' + task.chatIds.length"
      class="mr-1 flex-shrink-0"
      sm
      color="blue"
      xs
      @click.prevent="showTaskDetail(task, $event.target)"
    />
  </div>

  <OnClickOutside @trigger="closeTaskDetail">
    <div
      v-if="hasTask"
      class="absolute z-50 bg-n-alpha-3 rounded shadow-md"
      :style="{ top: `${position.top + 8}px`, left: `${position.left}px` }"
    >
      <div
        class="relative flex items-center px-12 overflow-hidden h-12 max-w-[300px]"
      >
        <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {{ currentTask.messages[0].message || $t('FOLDER.MEDIA_MESSAGE') }}
        </span>
        <Button
          ghost
          slate
          icon="i-lucide-x"
          class="absolute z-10 ltr:right-2 rtl:left-2 top-2"
          @click="closeTaskDetail"
        />
      </div>
      <div class="max-h-[400px] overflow-y-auto min-h-[100px] w-[300px]">
        <div
          v-for="chatId in currentTask.chatIds"
          :key="chatId"
          class="flex my-1 mx-4 items-center justify-start border-n-slate-3 border-b h=[40px]"
        >
          <Thumbnail
            :src="currentTask.chatInfo[chatId].avatar"
            :username="currentTask.chatInfo[chatId].name"
            size="32px"
          />
          <span class="ml-4">{{ currentTask.chatInfo[chatId].name }}</span>

          <span class="grow text-right">{{
            currentTask.sendedIds.includes(chatId) ? '✅' : ''
          }}</span>
        </div>
      </div>

      <div class="p-2 flex justify-end">
        <NextButton
          label="停止"
          class="mr-1 flex-shrink-0"
          sm
          color="blue"
          xs
          @click.prevent="stopCurrentTask"
        />
        <NextButton
          :label="currentTask.pause ? '继续' : '暂停'"
          class="mr-1 flex-shrink-0"
          sm
          color="blue"
          xs
          @click.prevent="pauseOrStartCurrentTask"
        />
      </div>
    </div>
  </OnClickOutside>
</template>
