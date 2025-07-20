<script>
import { mapGetters } from 'vuex';
import { getLastMessage } from 'dashboard/helper/conversationHelper';
import MessagePreview from './MessagePreview.vue';
import TimeAgo from 'dashboard/components/ui/TimeAgo.vue';
import ContextMenu from 'dashboard/components/ui/ContextMenu.vue';
import { getTextColorForBgColor } from './helpers/colorHelper';
import Checkbox from 'next/checkbox/Checkbox.vue';
import MenuItem from './contextMenu/menuItem.vue';
import { useDialogStore } from 'dashboard/composables/useDialog';
import { useGroupStore } from 'dashboard/composables/useGroup';
import Avatar from '../Avatar.vue';
import { copyTextToClipboard } from 'helpers/clipboard';
import { useAlert } from 'dashboard/composables';

export default {
  components: {
    TimeAgo,
    MessagePreview,
    ContextMenu,
    Checkbox,
    MenuItem,
    Avatar,
  },
  inject: ['isConversationSelected'],
  props: {
    chat: {
      type: Object,
      default: () => {
        return {
          id: '',
          data: {
            backgroundColor: '',
            emoji: '',
          },
        };
      },
    },
    hideThumbnail: {
      type: Boolean,
      default: false,
    },
    enableContextMenu: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['contextMenuToggle'],
  setup() {
    const dialog = useDialogStore();
    const group = useGroupStore();
    return { dialog, group };
  },
  data() {
    return {
      hovered: false,
      showContextMenu: false,
      contextMenu: {
        x: null,
        y: null,
      },
    };
  },
  computed: {
    ...mapGetters({
      currentChat: 'getSelectedChat',
      // activeInbox: 'getSelectedInbox',
      // accountId: 'getCurrentAccountId',
    }),

    isActiveChat() {
      return this.currentChat.id === this.chat.data.id;
    },

    unreadCount() {
      return this.chat.data.unread_count;
    },
    showMultiSelect() {
      return this.group.isMultiSelectMode;
    },
    hasUnread() {
      return this.unreadCount > 0;
    },

    inbox() {
      if (this.chat.children.length) {
        let first = this.chat.children.find(
          it => !this.group.userGroupData[it].isFolder
        );
        if (first) {
          let firstChat = this.group.userGroupData[first];
          const { inbox_id: inboxId } = firstChat;
          const stateInbox = this.$store.getters['inboxes/getInbox'](inboxId);
          return stateInbox;
        }
      }
      return { id: 0 };
    },
    avatarId() {
      return 'avatar_' + this.chat.id;
    },
    lastMessageInChat() {
      return getLastMessage(this.chat.data);
    },

    textColor() {
      return getTextColorForBgColor(
        this.chat.data.backgroundColor || '#1fe146'
      );
    },
    paddingLeftValue() {
      if (this.chat.level <= 1) return '';
      return (this.chat.level - 1) * 10 + 'px';
    },
    parsedLastMessage() {
      let lastMsg = this.chat.data.messages.length
        ? this.chat.data.messages[0]
        : { content: '' };
      return lastMsg.content;
    },
    isSeleced() {
      let chatIds = this.chat.children.filter(
        it => !this.group.userGroupData[it].isFolder
      );
      return (
        chatIds.length &&
        chatIds.filter(it => !this.isConversationSelected(parseInt(it, 10)))
          .length === 0
      );
    },
    isMultiSelected: {
      get() {
        let multiSelectedIds = this.group.multiSelectChatIds;
        let userGroupData = this.group.userGroupData;

        return (
          this.chat.children.length > 0 &&
          this.chat.children.filter(
            it => !userGroupData[it].isFolder && !multiSelectedIds.includes(it)
          ).length === 0
        );
      },
      set(value) {
        this.group.addOrRemoveMultiChatsSelect(this.chat.children, value);
      },
    },
    isMultiSend: {
      get() {
        let multiSelectedIds = this.group.multiSendChatIds;
        let userGroupData = this.group.userGroupData;
        return (
          this.chat.children.length > 0 &&
          this.chat.children.filter(
            it => !userGroupData[it].isFolder && !multiSelectedIds.includes(it)
          ).length === 0
        );
      },
      set(value) {
        this.group.onSelectToMultiSend(this.chat.children, value);
      },
    },
  },
  methods: {
    onCardClick() {
      this.group.toggleFolderExpand(this.chat.id);
    },
    onThumbnailHover() {
      this.hovered = !this.hideThumbnail;
    },
    onThumbnailLeave() {
      this.hovered = false;
    },
    onSelectConversation(checked) {
      const action = checked ? 'selectConversation' : 'deSelectConversation';
      if (this.chat.children.length) {
        this.chat.children.forEach(id => {
          if (!this.group.userGroupData[id].isFolder) {
            this.$emit(action, parseInt(id, 10), this.inbox.id);
          }
        });
      }
    },
    openContextMenu(e) {
      if (!this.enableContextMenu) return;
      e.preventDefault();
      this.$emit('contextMenuToggle', true);
      this.contextMenu.x = e.pageX || e.clientX;
      this.contextMenu.y = e.pageY || e.clientY;
      this.showContextMenu = true;
    },
    closeContextMenu() {
      this.$emit('contextMenuToggle', false);
      this.showContextMenu = false;
      this.contextMenu.x = null;
      this.contextMenu.y = null;
    },
    onClickAddChildFoler() {
      let name = new Date().toISOString().substring(0, 16).replace('T', ' ');
      this.dialog.openInputDialog({
        title: this.$t('FOLDER.INPUT_NAME'),
        placeholder: this.$t('FOLDER.INPUT_HERE'),
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
          this.group.addFolder(item, this.chat.id);
        },
      });
      this.closeContextMenu();
    },
    onClickChangeName() {
      this.dialog.openInputDialog({
        title: this.$t('CUSTOM_ROLE.FORM.NAME.PLACEHOLDER'),
        defaultInputValue: this.chat.data.title,
        placeHolder: this.$t('FOLDER.INPUT_HERE'),
        onConfirm: name => {
          this.group.updateFolder({
            id: this.chat.id,
            data: { ...this.chat.data, title: name },
          });
        },
      });
      this.closeContextMenu();
    },
    onClickChangeColor() {
      this.dialog.openColorDialog(color => {
        this.group.updateFolder({
          id: this.chat.id,
          data: { ...this.chat.data, backgroundColor: color },
        });
      });
      this.closeContextMenu();
    },
    onClickChangeEmoji() {
      let avatar = this.$refs[this.avatarId];
      if (avatar)
        this.dialog.openEmojiDialog(avatar, emoji => {
          this.group.updateFolder({
            id: this.chat.id,
            data: { ...this.chat.data, emoji },
          });
        });
      this.closeContextMenu();
    },
    patchMoveIn() {
      this.group.patchMoveChatsToGroup(this.chat.id, false);
      this.closeContextMenu();
    },
    patchMoveOut() {
      this.group.patchMoveChatsToGroup(this.chat.id, true);
      this.closeContextMenu();
    },
    async copyAllContactPhone() {
      let arr = await this.group.getAllUserPhoneNumber(
        this.chat.id,
        this.$store
      );
      let str = arr.join('\n');
      if (str) {
        await copyTextToClipboard(str);
        useAlert(this.$t('COMPONENTS.CODE.COPY_SUCCESSFUL'));
      } else {
        useAlert(this.$t('FOLDER.NO_COPY'));
      }
      this.closeContextMenu();
    },
    async copySelectedContachPhone() {
      let arr = await this.group.getSelectChatPhoneNumber(this.$store);
      let str = arr.join('\n');
      if (str) {
        await copyTextToClipboard(str);
        useAlert(this.$t('COMPONENTS.CODE.COPY_SUCCESSFUL'));
      } else {
        useAlert(this.$t('FOLDER.NO_COPY'));
      }
      this.closeContextMenu();
    },
    onDeleteFolder() {
      this.dialog.openEnsureDialog({
        title: this.$t('FOLDER.DELETE_FOLDER_NOTICE_TITLE'),
        message: this.$t('FOLDER.DELETE_FOLDER_NOTICE_MESSAGE'),
        onEnsure: ensure => {
          if (ensure) {
            this.group.removeItem(this.chat.id);
          }
        },
      });
      this.closeContextMenu();
    },
    onClearFolder() {
      this.dialog.openEnsureDialog({
        title: this.$t('FOLDER.CLEAR_FOLDER_NOTICE_TITLE'),
        message: this.$t('FOLDER.CLEAR_FOLDER_NOTICE_MESSAGE'),
        onEnsure: ensure => {
          if (ensure) {
            this.group.clearFolder(this.chat.id);
          }
        },
      });
      this.closeContextMenu();
    },
  },
};
</script>

<template>
  <div
    class="py-1 px-1"
    :style="{ paddingLeft: paddingLeftValue }"
  >
    <div
      class="relative flex items-start flex-grow-0 flex-shrink-0 w-auto max-w-full px-3 py-0 rounded-lg border-t-0 border-b-0 border-l-2 border-r-0 border-transparent border-solid cursor-pointer conversation hover:bg-n-alpha-1 dark:hover:bg-n-alpha-3 group"
      :class="{
        'active animate-card-select bg-n-alpha-1 dark:bg-n-alpha-3 border-n-weak':
          isActiveChat,
        'unread-chat': hasUnread,
      }"
      :style="{
        backgroundColor: chat.data.backgroundColor || '#1fe146',
        color: textColor,
      }"
      @click="onCardClick"
      @contextmenu="openContextMenu($event)"
    >
      <div
        class="relative"
        @mouseenter="onThumbnailHover"
        @mouseleave="onThumbnailLeave"
      >
        <label
          v-if="hovered || isSeleced"
          class="checkbox-wrapper absolute inset-0 z-20 backdrop-blur-[2px]"
          @click.stop
        >
          <input
            :value="isSeleced"
            :checked="isSeleced"
            class="checkbox"
            type="checkbox"
            @change="onSelectConversation($event.target.checked)"
          />
        </label>
        <div
          :ref="avatarId"
          class="flex justify-center items-center mt-4"
        >
          <Avatar
            class="w-8 h-8 rounded-full"
            :size="32"
          >
            {{ chat.data.emoji || '🔔' }}
          </Avatar>
        </div>
      </div>
      <div
        class="px-0 py-1 group-hover:border-transparent flex-1 border-n-slate-3 w-[calc(100%-40px)]"
      >
        <h4
          class="conversation--user text-sm my-0 mx-2 capitalize pt-0.5 text-ellipsis overflow-hidden whitespace-nowrap w-[calc(100%-70px)] text-n-slate-12"
          :class="hasUnread ? 'font-semibold' : 'font-medium'"
          :style="{
            color: textColor,
          }"
        >
          {{ chat.data.title }}
        </h4>
        <MessagePreview
          v-if="lastMessageInChat"
          :message="lastMessageInChat"
          :color="textColor"
          class="conversation--message my-0 mx-2 leading-6 h-6 max-w-[96%] w-[16.875rem] text-sm"
          :class="hasUnread ? 'font-medium text-n-slate-12' : 'text-n-slate-11'"
        />
        <p
          v-else
          class="conversation--message text-n-slate-11 text-sm my-0 mx-2 leading-6 h-6 max-w-[96%] w-[16.875rem] overflow-hidden text-ellipsis whitespace-nowrap"
          :class="hasUnread ? 'font-medium text-n-slate-12' : 'text-n-slate-11'"
        >
          <fluent-icon
            size="16"
            class="-mt-0.5 align-middle inline-block text-n-slate-10"
            icon="info"
            :style="{
              color: textColor,
            }"
          />
          <span
            class="ml-1"
            :style="{
              color: textColor,
            }"
          >
            {{ $t(`CHAT_LIST.NO_MESSAGES`) }}
          </span>
        </p>
      </div>
      <div
        class="absolute flex flex-col mt-2"
        :class="[
          showMultiSelect
            ? 'ltr:right-14 rtl:left-14'
            : 'ltr:right-8 rtl:left-8',
        ]"
      >
        <span class="ml-auto font-normal leading-4 text-xxs">
          <TimeAgo
            v-if="chat.data.timestamp"
            :color="textColor"
            :last-activity-timestamp="chat.data.timestamp"
            :created-at-timestamp="chat.data.created_at"
          />
        </span>
        <span
          class="unread shadow-lg rounded-full hidden text-xxs font-semibold h-4 leading-4 ltr:ml-auto rtl:mr-auto mt-1 min-w-[1rem] px-1 py-0 text-center text-white bg-n-teal-9"
          :style="{
            color: textColor,
          }"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </div>
      <span
        class="absolute text-xs -left-[2px]"
        :style="{
          color: textColor,
        }"
        >{{ `🏠:` + chat.children.length }}</span
      >
      <Checkbox
        v-if="showMultiSelect"
        v-model="isMultiSelected"
        color-value="orange"
        class="mt-5 mr-2"
        @click.stop
      />

      <Checkbox
        v-model="isMultiSend"
        color-value="brand"
        class="mt-5 -mr-1"
        @click.stop
      />

      <ContextMenu
        v-if="showContextMenu"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="closeContextMenu"
      >
        <div class="menu-container">
          <MenuItem
            :option="{
              label: $t('FOLDER.ADD_CHILD_FOLDER'),
            }"
            variant="label"
            @click="onClickAddChildFoler"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.PATCH_MOVE_IN'),
            }"
            variant="label"
            @click="patchMoveIn"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.PATCH_MOVE_OUT'),
            }"
            variant="label"
            @click="patchMoveOut"
          />
          <hr class="m-1 rounded border-b border-n-weak dark:border-n-weak" />
          <MenuItem
            v-if="chat.id !== 'default'"
            :option="{
              label: $t('FOLDER.CHANGE_NAME'),
            }"
            variant="label"
            @click="onClickChangeName"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.CHANGE_COLOR'),
            }"
            variant="label"
            @click="onClickChangeColor"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.CHANGE_EMOJI'),
            }"
            variant="label"
            @click="onClickChangeEmoji"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.COPY_ALL_CONTACT_PHONE'),
            }"
            variant="label"
            @click="copyAllContactPhone"
          />
          <MenuItem
            :option="{
              label: $t('FOLDER.COPY_SELECTED_CONTACT_PHONE'),
            }"
            variant="label"
            @click="copySelectedContachPhone"
          />
          <hr class="m-1 rounded border-b border-n-weak dark:border-n-weak" />
          <MenuItem
            v-if="chat.id !== 'default'"
            :option="{
              label: $t('FOLDER.CLEAR_FOLER'),
            }"
            variant="label"
            @click="onClearFolder"
          />
          <MenuItem
            v-if="chat.id !== 'default'"
            :option="{
              label: $t('FOLDER.DELETE_FOLDER'),
            }"
            variant="label"
            @click="onDeleteFolder"
          />
        </div>
      </ContextMenu>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.conversation {
  &.unread-chat {
    .unread {
      @apply block;
    }
  }

  &.compact {
    @apply pl-0;

    .conversation-card--meta {
      @apply ltr:pr-4 rtl:pl-4;
    }

    .conversation--details {
      @apply rounded-sm ml-0 pl-5 pr-2;
    }
  }

  &::v-deep .user-thumbnail-box {
    @apply mt-4;
  }

  &.conversation-selected {
    @apply bg-n-slate-2 dark:bg-n-slate-3;
  }

  &.has-inbox-name {
    &::v-deep .user-thumbnail-box {
      @apply mt-8;
    }

    .checkbox-wrapper {
      @apply mt-8;
    }

    .conversation--meta {
      @apply mt-4;
    }
  }

  .checkbox-wrapper {
    @apply flex items-center justify-center rounded-full cursor-pointer mt-4;

    input[type='checkbox'] {
      @apply m-0 cursor-pointer;
    }
  }
}

.menu-container {
  @apply p-1 bg-n-background shadow-xl rounded-md;

  hr:first-child {
    @apply hidden;
  }

  hr {
    @apply m-1 border-b border-solid border-n-strong;
  }
}
</style>
