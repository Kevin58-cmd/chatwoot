import localforage from 'localforage';

const localforagePlugin = {
  install(app) {
    // 可配置 store 名称等参数
    localforage.config({
      driver: localforage.INDEXEDDB,
      name: 'chatwoot',
      storeName: 'user_group_data',
    });

    app.config.globalProperties.$vlf = localforage;
  },
};

export default localforagePlugin;
