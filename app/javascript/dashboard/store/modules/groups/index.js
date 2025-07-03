import localforage from 'localforage';
import {
  addItemToList,
  createItemFronOriginItem,
  getDefaultUserGroupData,
  updateFolderData,
} from './helpers';
import { toRaw, isProxy } from 'vue';

const state = {
  originItems: null,
  currentAccountId: null,
  userGroupData: null,
};
let saveTtimeout = null;
const mutations = {
  SET_USER_GROUP_DATA(_state, data) {
    // console.log("commit userGroupData", data);
    _state.userGroupData = data;
    if (_state.currentAccountId && data) {
      clearTimeout(saveTtimeout);
      saveTtimeout = setTimeout(() => {
        Object.keys(data).forEach(key => {
          if (isProxy(data[key])) {
            data[key] = toRaw(data[key]);
          }
        });
        // console.log("saveData", data);
        localforage.setItem('userGroupData_' + _state.currentAccountId, data);
      }, 1000);
    }
  },
  SET_ORIGIN_ITEMS(_state, data) {
    _state.originItems = data;
  },
  SET_ACCOUNT_ID(_state, id) {
    _state.currentAccountId = id;
  },
};

const actions = {
  setUserGroupData({ commit }, data) {
    commit('SET_USER_GROUP_DATA', data);
  },
  async setAccountId({ state: _state, commit }, accountId) {
    // console.log("setAccountId", { accountId });
    commit('SET_ACCOUNT_ID', accountId);
    if (
      !_state.currentAccountId ||
      _state.currentAccountId !== accountId ||
      !_state.userGroupData
    ) {
      commit('SET_USER_GROUP_DATA', null);
      let userData = await localforage.getItem('userGroupData_' + accountId);
      userData = userData || getDefaultUserGroupData();
      commit('SET_USER_GROUP_DATA', userData);
    }
  },
  updateUserGroupFromOrigiItems({ state: _state, commit }, data) {
    commit('SET_ORIGIN_ITEMS', data);
    if (_state.userGroupData && Array.isArray(data)) {
      const groupData = { ..._state.userGroupData };
      let originItemIds = [];
      data.forEach(item => {
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
          if (!groupData.root.children.includes(it)) {
            groupData.root.children.push(it);
          }
        });
      }

      commit('SET_USER_GROUP_DATA', groupData);
    }
  },
  addFolder({ state: _state, commit }, { item, folderId }) {
    if (_state.userGroupData) {
      const groupData = { ..._state.userGroupData };
      groupData[item.index] = item;
      if (groupData[folderId] && groupData[folderId].isFolder) {
        groupData[folderId].children.unshift(item.index);
      }
      commit('SET_USER_GROUP_DATA', groupData);
    }
  },
};

const getters = {
  getUserGroupData: _state => _state.userGroupData || {},
  getUserGroupList: _state => {
    if (!_state.userGroupData || !_state.userGroupData.root) return [];

    let userGroupData = { ..._state.userGroupData };
    updateFolderData(userGroupData);
    let arr = [];
    userGroupData.root.children.forEach(id => {
      let item = userGroupData[id];
      if (item) {
        item.level = 1;
        addItemToList(item, arr, [], userGroupData, '', '', true);
      }
    });
    return arr;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
