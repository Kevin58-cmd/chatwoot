<script>
import inboxMixin from 'shared/mixins/inboxMixin';
import fileUploadMixin from 'dashboard/mixins/fileUploadMixin';
import keyboardEventListenerMixins from 'shared/mixins/keyboardEventListenerMixins';
import { mapGetters } from 'vuex';
import FileUpload from 'vue-upload-component';
import NextButton from 'dashboard/components-next/button/Button.vue';
import AttachmentPreview from 'dashboard/components/widgets/AttachmentsPreview.vue';
import ResizableTextArea from 'shared/components/ResizableTextArea.vue';
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_TYPES_FOR_TWILIO_WHATSAPP,
  ALLOWED_FILE_TYPES_FOR_LINE,
  ALLOWED_FILE_TYPES_FOR_INSTAGRAM,
} from 'shared/constants/messages';
import { defineAsyncComponent, ref } from 'vue';
const EmojiInput = defineAsyncComponent(
  () => import('shared/components/emoji/EmojiInput.vue')
);
import { useDialogStore } from 'dashboard/composables/useDialog';
import { useGroupStore } from 'dashboard/composables/useGroup';
import { useMultiSendStore } from 'dashboard/composables/useMultiSendTask';
import { uuid } from 'dashboard/helper/stringHelper';
import { useAlert } from 'dashboard/composables';
export default {
  components: {
    FileUpload,
    NextButton,
    AttachmentPreview,
    EmojiInput,
    ResizableTextArea,
  },
  mixins: [inboxMixin, fileUploadMixin, keyboardEventListenerMixins],
  setup() {
    const multiSendUploadRef = ref(false);
    return {
      multiSendUploadRef,
      dialog: useDialogStore(),
      group: useGroupStore(),
      multiSendTask: useMultiSendStore(),
    };
  },
  data() {
    return {
      message: '',
      editorStateId: 'multi-send',
      messagePlaceHolder: this.$t('FOLDER.MULTI_SEND_PLACEHOLDER'),
      updateEditorSelectionWith: '',
      showCannedMenu: false,
      attachedFiles: [],
      showEmojiPicker: false,
    };
  },
  computed: {
    ...mapGetters({
      currentChat: 'getSelectedChat',
      currentUser: 'getCurrentUser',
      globalConfig: 'globalConfig/get',
    }),
    inboxId() {
      return this.currentChat.inbox_id;
    },
    inbox() {
      return this.$store.getters['inboxes/getInbox'](this.inboxId);
    },
    sender() {
      return {
        name: this.currentUser.name,
        thumbnail: this.currentUser.avatar_url,
      };
    },
    allowedFileTypes() {
      if (this.isATwilioWhatsAppChannel) {
        return ALLOWED_FILE_TYPES_FOR_TWILIO_WHATSAPP;
      }
      if (this.isALineChannel) {
        return ALLOWED_FILE_TYPES_FOR_LINE;
      }
      if (this.isAnInstagramChannel) {
        return ALLOWED_FILE_TYPES_FOR_INSTAGRAM;
      }

      return ALLOWED_FILE_TYPES;
    },
    hasAttachments() {
      return this.attachedFiles.length;
    },
    marginTop() {
      return -this.attachedFiles.length * 32 - 75 + 'px';
    },
    height() {
      return this.attachedFiles.length * 32 + 135 + 'px';
    },
  },
  methods: {
    clearEditorSelection() {
      this.updateEditorSelectionWith = '';
    },
    toggleCannedMenu(value) {
      this.showCannedMenu = value;
    },

    removeAttachment(attachments) {
      this.attachedFiles = attachments;
    },
    attachFile({ blob, file }) {
      const reader = new FileReader();
      reader.readAsDataURL(file.file);
      reader.onloadend = () => {
        this.attachedFiles.push({
          currentChatId: this.currentChat.id,
          resource: blob || file,
          isPrivate: this.isPrivate,
          thumb: reader.result,
          blobSignedId: blob ? blob.signed_id : undefined,
          isRecordedAudio: file?.isRecordedAudio || false,
        });
      };
    },
    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker;
    },
    hideEmojiPicker() {
      if (this.showEmojiPicker) {
        this.toggleEmojiPicker();
      }
    },
    clearMessage() {
      this.message = '';
      this.attachedFiles = [];
    },
    addIntoEditor(content) {
      if (this.showRichContentEditor) {
        this.updateEditorSelectionWith = content;
      }
      const { selectionStart, selectionEnd } = this.$refs.messageInput.$el;
      this.insertIntoTextEditor(content, selectionStart, selectionEnd);
    },
    insertIntoTextEditor(text, selectionStart, selectionEnd) {
      const { message } = this;
      const newMessage =
        message.slice(0, selectionStart) +
        text +
        message.slice(selectionEnd, message.length);
      this.message = newMessage;
    },
    onChangeSendInterval() {
      this.dialog.openInputDialog({
        title: this.$t('FOLDER.INPUT_TIME_INTERVAL'),
        defaultInputValue: this.group.settings.sendInterval + '',
        onConfirm: value => {
          this.group.settings.sendInterval = parseInt(value, 10);
          this.group.saveSettings();
        },
      });
    },
    onSend() {
      if (!this.group.multiSendChatIds.length) {
        useAlert(this.$t('FOLDER.SELECT_CHAT_FIRST'));
        return;
      }
      const isOnWhatsApp =
        this.isATwilioWhatsAppChannel ||
        this.isAWhatsAppCloudChannel ||
        this.is360DialogWhatsAppChannel;
      // When users send messages containing both text and attachments on Instagram, Instagram treats them as separate messages.
      // Although Chatwoot combines these into a single message, Instagram sends separate echo events for each component.
      // This can create duplicate messages in Chatwoot. To prevent this issue, we'll handle text and attachments as separate messages.
      const isOnInstagram = this.isAnInstagramChannel;
      let messages = null;
      if ((isOnWhatsApp || isOnInstagram) && !this.isPrivate) {
        messages = this.getMultipleMessagesPayload(this.message);
      } else {
        const messagePayload = this.getMessagePayload(this.message);
        messages = [messagePayload];
      }

      let chatInfo = {};
      let useGroupData = this.group.userGroupData;
      this.group.multiSendChatIds.forEach(chatId => {
        chatInfo[chatId] = {
          name: useGroupData[chatId] ? useGroupData[chatId].data.title : chatId,
          avatar: useGroupData[chatId] ? useGroupData[chatId].data.avatar : '',
        };
      });
      this.multiSendTask.addTask({
        id: Date.now() + uuid(),
        chatIds: this.group.multiSendChatIds,
        messages,
        channelType: this.channelType,
        sendInterval: this.group.settings.sendInterval,
        chatInfo,
      });

      this.clearMessage();
      this.hideEmojiPicker();
    },
    getMultipleMessagesPayload(message) {
      const multipleMessagePayload = [];

      if (this.attachedFiles && this.attachedFiles.length) {
        let caption = this.isAnInstagramChannel ? '' : message;
        this.attachedFiles.forEach(attachment => {
          const attachedFile = this.globalConfig.directUploadsEnabled
            ? attachment.blobSignedId
            : attachment.resource.file;
          let attachmentPayload = {
            conversationId: this.currentChat.id,
            files: [attachedFile],
            private: false,
            message: caption,
            sender: this.sender,
          };

          multipleMessagePayload.push(attachmentPayload);
          // For WhatsApp, only the first attachment gets a caption
          if (!this.isAnInstagramChannel) caption = '';
        });
      }

      const hasNoAttachments =
        !this.attachedFiles || !this.attachedFiles.length;
      // For Instagram, we need a separate text message
      // For WhatsApp, we only need a text message if there are no attachments
      if (
        (this.isAnInstagramChannel && this.message) ||
        (!this.isAnInstagramChannel && hasNoAttachments)
      ) {
        let messagePayload = {
          conversationId: this.currentChat.id,
          message,
          private: false,
          sender: this.sender,
        };

        multipleMessagePayload.push(messagePayload);
      }

      return multipleMessagePayload;
    },
    getMessagePayload(message) {
      let messagePayload = {
        conversationId: this.currentChat.id,
        message,
        private: false,
        sender: this.sender,
      };

      if (this.attachedFiles && this.attachedFiles.length) {
        messagePayload.files = [];
        this.attachedFiles.forEach(attachment => {
          if (this.globalConfig.directUploadsEnabled) {
            messagePayload.files.push(attachment.blobSignedId);
          } else {
            messagePayload.files.push(attachment.resource.file);
          }
        });
      }
      return messagePayload;
    },
  },
};
</script>

<template>
  <div
    id="second-reply-box"
    class="reply-box"
  >
    <div class="p-3">
      <EmojiInput
        v-if="showEmojiPicker"
        v-on-clickaway="hideEmojiPicker"
        :class="{
          'emoji-dialog--expanded': false,
        }"
        :on-click="addIntoEditor"
      />
      <ResizableTextArea
        ref="messageInput"
        v-model="message"
        class="rounded-none input max-h-[60px]"
        :placeholder="messagePlaceHolder"
        :min-height="4"
      />
      <div
        v-if="hasAttachments"
        class="attachment-preview-box"
        @paste="onPaste"
      >
        <AttachmentPreview
          class="flex-col mt-4"
          :attachments="attachedFiles"
          @remove-attachment="removeAttachment"
        />
      </div>

      <div class="flex flex-row justify-between">
        <div class="flex items-center gap-2">
          <NextButton
            v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_EMOJI_ICON')"
            icon="i-ph-smiley-sticker"
            slate
            faded
            sm
            @click="toggleEmojiPicker"
          />
          <FileUpload
            ref="multiSendUploadRef"
            v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')"
            class="cursor-pointer"
            input-id="multiSendAttachment"
            :size="4096 * 4096"
            :accept="allowedFileTypes"
            multiple
            drop="#second-reply-box"
            :drop-directory="false"
            :data="{
              direct_upload_url: '/rails/active_storage/direct_uploads',
              direct_upload: true,
            }"
            @input-file="onFileUpload"
          >
            <NextButton
              v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')"
              icon="i-ph-paperclip"
              slate
              faded
              sm
            />
          </FileUpload>
        </div>

        <div class="flex">
          <NextButton
            :label="$t('CONVERSATION.REPLYBOX.SEND')"
            :disabled="!message && !attachedFiles.length"
            type="submit"
            sm
            color="blue"
            class="flex-shrink-0"
            @click="onSend"
          />

          <NextButton
            v-tooltip.top-end="$t('FOLDER.SEND_INTERVAL')"
            :label="group.settings.sendInterval + 's'"
            class="ml-2"
            icon="i-lucide-clock-4"
            slate
            faded
            sm
            @click="onChangeSendInterval"
          />
        </div>

        <transition name="modal-fade">
          <div
            v-show="multiSendUploadRef && multiSendUploadRef.dropActive"
            class="z-20 flex flex-col items-center justify-center gap-2 text-n-slate-12 bg-modal-backdrop-light dark:bg-modal-backdrop-dark -ml-3 w-full absolute rounded-[12px]"
            :style="{ marginTop, height }"
          >
            <fluent-icon
              icon="cloud-backup"
              size="40"
            />
            <h4 class="text-2xl break-words text-n-slate-12">
              {{ $t('CONVERSATION.REPLYBOX.DRAG_DROP') }}
            </h4>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reply-box {
  transition: height 2s cubic-bezier(0.37, 0, 0.63, 1);

  @apply relative mb-2 mx-2 border border-n-weak rounded-xl bg-n-solid-1;

  &.is-private {
    @apply bg-n-solid-amber dark:border-n-amber-3/10 border-n-amber-12/5;
  }

  textarea {
    @apply shadow-none outline-none border-transparent bg-transparent m-0 max-h-60 min-h-[3rem] pb-0 px-0 resize-none;
  }
}
.emoji-dialog {
  @apply top-[unset] bottom-2 ltr:-left-80 ltr:right-[unset] rtl:left-[unset] rtl:-right-80;

  &::before {
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.08));
    @apply ltr:-right-4 bottom-2 rtl:-left-4 ltr:rotate-[270deg] rtl:rotate-[90deg];
  }
}

::v-deep .file-uploads {
  label {
    @apply cursor-pointer;
  }

  &:hover button {
    @apply enabled:bg-n-slate-9/20;
  }
}
</style>
