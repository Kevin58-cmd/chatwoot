import { getLastMessage } from 'dashboard/helper/conversationHelper';
import { toRaw, isProxy } from 'vue';

export const DEFAULT_FOLDER = 'default';
export function createItemFronOriginItem(item) {
  let message = getLastMessage(item);
  let newMessage = null;

  if (message) {
    let attachments;
    if (message.attachments) {
      attachments = [
        {
          file_type: message.attachments[0].file_type,
        },
      ];
    }
    newMessage = {
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      private: message.private,
      content_type: message.content_type,
      sender: message.sender
        ? { id: message.sender.id, name: message.sender.name }
        : null,
      attachments,
    };
  }
  let meta = null;
  if (item.meta) {
    meta = {
      sender: {
        name: item.meta?.sender?.name ?? '',
        id: item.meta?.sender?.id ?? '',
        phone_number: item.meta?.sender?.phone_number ?? '',
      },
      assignee: {
        name: item.meta?.assignee?.name ?? '',
      },
    };
  }
  let newObj = {
    isFolder: false,
    children: [],
    id: item.id + '',
    level: 2,
    data: {
      id: item.id,
      type: 'user',
      emoji: '',
      title: item.meta?.sender?.name ?? item.id + '',
      avatar: item.meta?.sender?.thumbnail ?? '',
      backgroundColor: undefined,
      unread_count: item.unread_count,
      timestamp: item.timestamp,
      meta,
      messages: [newMessage],
      priority: item.priority,
      created_at: item.created_at,
      labels: item.labels,
      status: item.status,
      sla_policy_id: item.sla_policy_id,
      inbox_id: item.inbox_id,
      uuid: item.uuid,
    },
  };

  return newObj;
}

export function updateFolderData(userGroupData) {
  function traverse(id) {
    const item = userGroupData[id];

    if (!item)
      return {
        unread_count: 0,
        messages: [''],
        timestamp: Date.now(),
        date: new Date(0).getTime(),
        created_at: new Date(0).getTime(),
      };

    if (!item.isFolder) {
      const ts = item.data.timestamp;
      return {
        unread_count: item.data.unread_count || 0,
        messages: item.data.messages,
        timestamp: ts,
        date: ts,
        created_at: item.data.created_at,
      };
    }

    let totalUnread = 0;
    let latestMessage = [''];
    let latestTimestamp = '';
    let latestDate = new Date(0).getTime();
    let latestCreatedAt = latestDate;

    item.children.forEach(childId => {
      const result = traverse(childId);
      totalUnread += result.unread_count;

      if (result.date > latestDate) {
        latestMessage = result.messages;
        latestTimestamp = result.timestamp;
        latestDate = result.date;
        latestCreatedAt = result.created_at;
      }
    });

    item.data.unread_count = totalUnread;
    item.data.messages = latestMessage;
    item.data.timestamp = latestTimestamp;
    item.data.created_at = latestCreatedAt;

    return {
      unread_count: totalUnread,
      messages: latestMessage,
      timestamp: latestTimestamp,
      date: latestDate,
      created_at: latestCreatedAt,
    };
  }
  Object.keys(userGroupData).forEach(key => {
    const item = userGroupData[key];
    if (item.isFolder) {
      traverse(key);
    }
  });
}

export function addItemToList(
  item,
  arr,
  expandedFolderIds,
  userGroupData,
  searchKey,
  sortType,
  folderTop
) {
  if (searchKey) {
    if (
      !item.isFolder &&
      (item.data.title.includes(searchKey) ||
        (item.data.messages &&
          item.data.messages.find(it => it.includes(searchKey))))
    ) {
      arr.push(item);
    }
  } else {
    arr.push(item);
  }

  if (
    item.isFolder &&
    item.children.length &&
    (searchKey || expandedFolderIds.includes(item.id))
  ) {
    let newChildren = [...item.children];
    if (sortType === 'time') {
      newChildren.sort((a, b) => {
        if (folderTop) {
          const folderDiff =
            (userGroupData[b]?.isFolder ? 1 : 0) -
            (userGroupData[a]?.isFolder ? 1 : 0);
          if (folderDiff !== 0) return folderDiff;
        }
        return (
          (userGroupData[b]?.data?.timestamp ?? 0) -
          (userGroupData[a]?.data?.timestamp ?? 0)
        );
      });
    } else if (sortType === 'unread') {
      newChildren.sort((a, b) => {
        if (folderTop) {
          const folderDiff =
            (userGroupData[b]?.isFolder ? 1 : 0) -
            (userGroupData[a]?.isFolder ? 1 : 0);
          if (folderDiff !== 0) return folderDiff;
        }
        const unreadDiff =
          (userGroupData[b]?.data?.unread_count ?? 0) -
          (userGroupData[a]?.data?.unread_count ?? 0);
        if (unreadDiff !== 0) {
          return unreadDiff;
        }
        const timeA = userGroupData[a]?.data?.timestamp ?? 0;
        const timeB = userGroupData[b]?.data?.timestamp ?? 0;
        return timeB - timeA;
      });
    }
    newChildren.forEach(id => {
      let childItem = userGroupData[id];
      if (childItem) {
        childItem.level = searchKey ? 1 : (item.level ?? 0) + 1;
        addItemToList(
          childItem,
          arr,
          expandedFolderIds,
          userGroupData,
          searchKey,
          sortType,
          folderTop
        );
      }
    });
  }
}

export function deleteFolderRecursively(data, folderId, deleteSelf = true) {
  const newData = { ...data };
  const deletedFolderId = [];
  function collectAllChildren(id) {
    const node = newData[id];
    if (!node || !node.isFolder) return [];

    const descendants = [];
    node.children.forEach(childId => {
      descendants.push(childId);
      if (newData[childId]?.isFolder) {
        descendants.push(...collectAllChildren(childId));
      }
    });
    return descendants;
  }

  const idsToDelete = deleteSelf
    ? [folderId, ...collectAllChildren(folderId)]
    : collectAllChildren(folderId);
  idsToDelete.forEach(id => {
    if (newData[id].isFolder) {
      delete newData[id];
      deletedFolderId.push(id);
    } else if (!newData[DEFAULT_FOLDER].children.includes(id)) {
      // 被删除的群组，都会被添加到默认分类中去。
      newData[DEFAULT_FOLDER].children.push(id);
    } else {
      newData[DEFAULT_FOLDER].children = newData[
        DEFAULT_FOLDER
      ].children.filter(it => it !== id); // 如果已经是默认分类中的群组，则直接删除
      delete newData[id];
    }
  });

  Object.keys(newData).forEach(key => {
    const node = newData[key];
    if (node.isFolder && node.children.length) {
      if (node.id !== DEFAULT_FOLDER) {
        node.children = node.children.filter(
          child => !idsToDelete.includes(child)
        ); // 其余的群组中都删除
      } else {
        node.children = node.children.filter(
          child => !deletedFolderId.includes(child)
        ); // 默认文件夹中需要保留所有的群组，但是不保留文件夹
      }
    }
  });

  return deletedFolderId;
}

function isPlainObject(value) {
  return (
    value &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

export function toRawDeep(obj) {
  if (isProxy(obj)) {
    obj = toRaw(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toRawDeep(item));
  }

  if (isPlainObject(obj)) {
    const result = {};
    Object.keys(obj).forEach(key => {
      result[key] = toRawDeep(obj[key]);
    });
    return result;
  }

  return obj;
}

export function getDefaultUserGroupData() {
  return {
    root: {
      isFolder: true,
      children: [DEFAULT_FOLDER],
      id: 'root',
      level: 0,
      data: {
        id: -1, // 这里的id都是数字格式，和系统统一
        type: 'folder',
        title: 'root Group',
        emoji: '',
        messages: [''],
        avatar: undefined,
        backgroundColor: undefined,
        unread_count: 0,
        timestamp: Date.now(),
        created_at: Date.now(),
      },
    },
    default: {
      isFolder: true,
      children: [],
      id: DEFAULT_FOLDER,
      level: 1,
      data: {
        id: -2, // 这里的id都是数字格式，和系统统一
        type: 'folder',
        title: '默认分类',
        emoji: '',
        messages: [''],
        avatar: undefined,
        backgroundColor: '#5b5fc7',
        unread_count: 0,
        timestamp: Date.now(),
        created_at: Date.now(),
      },
    },
  };
}

export function checkUserGroupData(data) {
  if (!data.root) {
    data.root = {
      isFolder: true,
      children: [DEFAULT_FOLDER],
      id: 'root',
      level: 0,
      data: {
        id: -1, // 这里的id都是数字格式，和系统统一
        type: 'folder',
        title: 'root Group',
        emoji: '',
        messages: [''],
        avatar: undefined,
        backgroundColor: undefined,
        unread_count: 0,
        timestamp: Date.now(),
        created_at: Date.now(),
      },
    };
  }

  if (!data[DEFAULT_FOLDER]) {
    data[DEFAULT_FOLDER] = {
      isFolder: true,
      children: [],
      id: DEFAULT_FOLDER,
      level: 1,
      data: {
        id: -2, // 这里的id都是数字格式，和系统统一
        type: 'folder',
        title: '默认分类',
        emoji: '🔔',
        messages: [''],
        avatar: undefined,
        backgroundColor: '#5b5fc7',
        unread_count: 0,
        timestamp: Date.now(),
        created_at: Date.now(),
      },
    };
  }

  return data;
}
