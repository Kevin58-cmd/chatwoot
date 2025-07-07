import {
  addItemToList,
  createItemFronOriginItem,
  DEFAULT_FOLDER,
  getDefaultUserGroupData,
  toRawDeep,
  updateFolderData,
  deleteFolderRecursively,
} from 'dashboard/helper/groupHelper';
import localforage from 'localforage';
import { defineStore } from 'pinia';

let saveTtimeout = null;

export const useGroupStore = defineStore('newgroup', {
  state: () => ({
    originItems: null,
    currentAccountId: null,
    userGroupData: null,
    isMultiSelectMode: false,
    multiSelectChatIds: [],
    expandedFolderIds: ['default'],
    multiSendChatIds: [],
    settings: {
      sendInterval: 2,
    },
  }),
  getters: {
    getCurrentAccountId() {
      return this.currentAccountId + '';
    },
    getUserGroupList() {
      if (!this.userGroupData || !this.userGroupData.root) return [];

      let userGroupData = { ...this.userGroupData };
      const expandedFolderIds = [...this.expandedFolderIds];
      updateFolderData(userGroupData);
      let arr = [];
      userGroupData.root.children.forEach(id => {
        let item = userGroupData[id];
        if (item) {
          item.level = 1;
          addItemToList(
            item,
            arr,
            expandedFolderIds,
            userGroupData,
            '',
            '',
            true
          );
        }
      });
      return arr;
    },
  },
  actions: {
    saveSettings() {
      localforage.setItem('settings', toRawDeep(this.settings));
    },
    setMultiSelectMode(multiSelect) {
      this.isMultiSelectMode = multiSelect;
      this.multiSelectChatIds = [];
    },
    addOrRemoveMultiChatsSelect(ids, add) {
      let newMultiIds = [];
      if (add) {
        newMultiIds = [...new Set([...this.multiSelectChatIds, ...ids])];
      } else {
        newMultiIds = this.multiSelectChatIds.filter(it => !ids.includes(it));
      }
      this.multiSelectChatIds = newMultiIds;
    },

    async setAccountId(accountId) {
      // console.log("setAccountId", { accountId });
      if (
        !this.currentAccountId ||
        this.currentAccountId !== accountId ||
        !this.userGroupData
      ) {
        this.userGroupData = null;
        let userData = await localforage.getItem('userGroupData_' + accountId);
        userData = userData || getDefaultUserGroupData();
        this.userGroupData = userData;
      }
      this.currentAccountId = accountId;
      let settingCahe = await localforage.getItem('settings');
      if (settingCahe) this.settings = settingCahe;
    },

    updateUserGroupFromOrigiItems(originItems, inputData) {
      this.originItems = originItems || [];
      let groupData = inputData || this.userGroupData;

      if (groupData && Array.isArray(originItems)) {
        groupData = { ...groupData };
        let originItemIds = [];
        originItems.forEach(item => {
          let groupItem = createItemFronOriginItem(item);
          if (!groupData[item.id + '']) {
            groupData[item.id + ''] = groupItem;
            originItemIds.push(item.id + '');
          } else {
            groupItem.level = groupData[item.id + ''].level;
            groupData[item.id + ''] = groupItem;
          }
        });

        if (originItemIds.length) {
          originItemIds.forEach(it => {
            if (!groupData[DEFAULT_FOLDER].children.includes(it)) {
              groupData[DEFAULT_FOLDER].children.push(it);
            }
          });
        }
        this.saveUserGroupData(groupData);
      }
    },
    addFolder(item, folderId) {
      if (this.userGroupData) {
        const groupData = { ...this.userGroupData };
        const expandedFolderIds = [...this.expandedFolderIds];
        groupData[item.id] = item;
        if (groupData[folderId] && groupData[folderId].isFolder) {
          groupData[folderId].children.unshift(item.id);
        }
        if (!expandedFolderIds.includes(folderId))
          expandedFolderIds.push(folderId);
        this.saveUserGroupData(groupData);
        this.expandedFolderIds = expandedFolderIds;
      }
    },
    updateFolder(item) {
      Object.assign(this.userGroupData[item.id], item);
      this.saveUserGroupData();
    },
    clearFolder(id) {
      let ids = deleteFolderRecursively(this.userGroupData, id, false);
      this.saveUserGroupData(this.userGroupData);
      this.expandedFolderIds = this.expandedFolderIds.filter(
        it => !ids.includes(it)
      );
    },
    removeItem(id) {
      let ids = deleteFolderRecursively(this.userGroupData, id, true);
      this.saveUserGroupData(this.userGroupData);
      this.expandedFolderIds = this.expandedFolderIds.filter(
        it => !ids.includes(it)
      );
    },
    saveUserGroupData(data) {
      let dataObj = data || this.userGroupData;
      if (this.currentAccountId && dataObj) {
        clearTimeout(saveTtimeout);
        saveTtimeout = setTimeout(() => {
          let rawData = toRawDeep(dataObj);
          localforage.setItem(
            'userGroupData_' + this.currentAccountId,
            rawData
          );
        }, 1000);
      }
      this.userGroupData = dataObj;
    },
    patchMoveChatsToGroup(folderId, moveOut) {
      let userGroupData = { ...this.userGroupData };
      let folder = userGroupData[folderId];
      if (folder.isFolder) {
        if (moveOut) {
          let needDeleteIds = this.multiSelectChatIds.filter(it =>
            folder.children.includes(it)
          );
          folder.children = folder.children.filter(
            it => !needDeleteIds.includes(it)
          );
          if (folderId === DEFAULT_FOLDER) {
            needDeleteIds.forEach(it => delete userGroupData[it]);
          } else {
            needDeleteIds.forEach(it => {
              if (!userGroupData[DEFAULT_FOLDER].children.includes(it))
                userGroupData[DEFAULT_FOLDER].children.push(it);
            });
          }
        } else {
          this.multiSelectChatIds.forEach(id => {
            if (!folder.children.includes(id)) {
              folder.children.push(id);
            }
          });
        }
        if (!moveOut) {
          Object.keys(userGroupData).forEach(key => {
            if (key !== folderId) {
              let item = userGroupData[key];
              if (item.isFolder) {
                item.children = item.children.filter(
                  it => !this.multiSelectChatIds.includes(it)
                );
              }
            }
          });
        }
        this.saveUserGroupData(userGroupData);
        this.multiSelectChatIds = [];
      }
    },
    toggleFolderExpand(folderId) {
      const expandedFolderIds = this.expandedFolderIds;
      let newArr = [];
      if (expandedFolderIds.includes(folderId)) {
        newArr = expandedFolderIds.filter(id => id !== folderId);
      } else {
        newArr = [...expandedFolderIds, folderId];
      }
      this.expandedFolderIds = newArr;
    },
    resetUserGroupData(groupData) {
      this.updateUserGroupFromOrigiItems(this.originItems, groupData);
    },
    resetExpandedIds(ids) {
      this.expandedFolderIds = ids;
    },

    onSelectToMultiSend(ids, select) {
      let newMultiIds = [];
      if (select) {
        newMultiIds = [...new Set([...this.multiSendChatIds, ...ids])];
      } else {
        newMultiIds = this.multiSendChatIds.filter(it => !ids.includes(it));
      }
      this.multiSendChatIds = newMultiIds;
    },
  },
});
