<script setup>
import { useStore } from 'vuex';
import { uuid } from '../helper/stringHelper';

const store = useStore();

function addGroupToTop() {
  let name = new Date().toISOString().substring(0, 16).replace('T', ' ');
  store.dispatch('dialog/openInputDialog', {
    title: '请输入名字',
    placeholder: '在这里输入...',
    defaultValue: name,
    onConfirm: value => {
      let id = Date.now() + '_' + uuid();
      store.dispatch('groups/addFolder', {
        item: {
          isFolder: true,
          index: id,
          children: [],
          level: 1,
          data: {
            id: id,
            type: 'folder',
            title: value || name,
            emoji: undefined,
            message: '',
            avatar: undefined,
            backgroundColor: '#5b5fc7',
            unreadCount: 0,
            timestamp: Date.now(),
          },
        },
        folderId: 'root',
      });
    },
  });
}
</script>

<template>
  <div>
    <button @click.prevent="addGroupToTop" />
  </div>
</template>
