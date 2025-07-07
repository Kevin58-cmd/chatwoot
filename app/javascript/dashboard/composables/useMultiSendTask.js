import { defineStore } from 'pinia';
import { useStore } from 'vuex';
import { useAlert, useTrack } from '.';
import { CONVERSATION_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import localforage from 'localforage';
import { useGroupStore } from './useGroup';
import { toRawDeep } from 'dashboard/helper/groupHelper';

let saveTimeOut;

export const useMultiSendStore = defineStore('multiSendTask', () => {
  const vuexStore = useStore();
  const { t } = useI18n();
  const group = useGroupStore();
  const taskList = ref([]);

  const tasks = computed(() => taskList.value.filter(it => !it.stop));

  function saveTaskList() {
    if (group.currentAccountId) {
      clearTimeout(saveTimeOut);
      saveTimeOut = setTimeout(() => {
        localforage.setItem(
          'multiSendTask_' + group.currentAccountId,
          toRawDeep(taskList.value)
        );
      }, 1000);
    }
  }

  function stopTask(taskId) {
    let index = taskList.value.findIndex(it => it.id === taskId);
    if (index !== -1) {
      taskList.value[index].stop = true;
      taskList.value.splice(index, 1);
      saveTaskList();
    }
  }

  async function startTask(taskId) {
    let task = taskList.value.find(it => it.id === taskId);
    if (task && !task.stop) {
      task.pause = false;
      task.stop = false;
      let needSendIds = task.chatIds.filter(it => !task.sendedIds.includes(it));
      if (needSendIds.length) {
        for (let i = 0; i < needSendIds.length; i += 1) {
          let chatId = parseInt(needSendIds[i], 10);

          if (!task.pause && !task.stop) {
            for (let j = 0; j < task.messages.length; j += 1) {
              let messagePayload = task.messages[j];
              if (!task.pause && !task.stop) {
                messagePayload.conversationId = chatId;
                try {
                  // eslint-disable-next-line no-await-in-loop
                  await vuexStore.dispatch(
                    'createPendingMessageAndSend',
                    messagePayload
                  );

                  useTrack(CONVERSATION_EVENTS.SENT_MESSAGE, {
                    channelType: task.channelType,
                    signatureEnabled: false,
                    hasReplyTo: '',
                  });

                  task.sendedIds.push(chatId + '');

                  useAlert(t('FOLDER.SEND') + task.chatInfo[chatId].name);

                  saveTaskList();
                } catch (error) {
                  const errorMessage =
                    error?.response?.data?.error ||
                    t('CONVERSATION.MESSAGE_ERROR');
                  useAlert(errorMessage);
                }
              } else {
                break;
              }
            }
          } else {
            break;
          }
          if (i !== needSendIds.length - 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise(res => {
              setTimeout(
                () => {
                  res();
                },
                (task.sendInterval || 2) * 1000
              );
            });
          }
        }
        if (!task.pause) {
          stopTask(task.id);
        }
      } else if (!task.pause) {
        stopTask(task.id);
      }
    }
  }

  async function addTask(task) {
    task.sendedIds = [];
    task.pause = true;
    task.stop = false;
    // let newTask = {
    //     id: Date.now() + "ABCD",
    //     chatIds: ["1","2","3"],
    //     messages: [],
    //     sendedIds: ["1","2"],
    //     pause: false,
    //     stop: false,
    //     chatInfo: {
    //         [chatId]: { name, avater }
    //     }
    // }
    taskList.value.push(task);
    saveTaskList();
    startTask(task.id);
  }

  function startOrPauseTask(taskId) {
    let task = taskList.value.find(it => it.id === taskId);
    if (task) {
      if (task.pause) {
        startTask(task.id);
      } else {
        task.pause = true;
      }
      saveTaskList();
    }
  }

  async function initTaskList() {
    if (group.currentAccountId) {
      let taskCache = await localforage.getItem(
        'multiSendTask_' + group.currentAccountId
      );
      // console.log("multiSendTask_", t);
      if (taskCache) {
        taskCache.forEach(it => {
          it.pause = true;
          it.stop = false;
        });
        taskList.value = taskCache;
      }
    }
  }

  return {
    tasks,
    addTask,
    startTask,
    startOrPauseTask,
    stopTask,
    initTaskList,
  };
});
