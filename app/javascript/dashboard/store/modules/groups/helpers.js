export function createItemFronOriginItem(item) {
  let message = '';
  let lastMsg = null;
  let senderName = null;
  let senderId = null;
  if (Array.isArray(item.messages) && item.messages.length) {
    lastMsg = item.messages[item.messages.length - 1];
    message = lastMsg.content;
    if (lastMsg.sender) {
      senderName = lastMsg.sender.name;
    }
    senderId = lastMsg.sender_id;
  }

  let newObj = {
    isFolder: false,
    children: [],
    index: item.id + '',
    level: 1,
    data: {
      id: item.id + '',
      type: 'user',
      title: item.meta?.sender?.name ?? item.id + '',
      emoji: '',
      message,
      avatar: item.meta?.sender?.thumbnail ?? '',
      backgroundColor: undefined,
      unreadCount: item.unread_count,
      timestamp: item.timestamp,
      phoneNumber: item.meta?.sender?.phone_number ?? '',
      senderId,
      senderName,
    },
  };

  return newObj;
}

export function getDefaultUserGroupData() {
  return {
    root: {
      isFolder: true,
      children: [],
      index: 'root',
      level: 0,
      data: {
        id: 'root',
        type: 'folder',
        title: 'root Group',
        emoji: '',
        message: '',
        avatar: undefined,
        backgroundColor: undefined,
        unreadCount: 0,
        timestamp: Date.now(),
        phoneNumber: '',
        senderId: null,
        senderName: null,
      },
    },
  };
}

export function updateFolderData(userGroupData) {
  function traverse(id) {
    const item = userGroupData[id];

    if (!item)
      return {
        unreadCount: 0,
        message: '',
        timestamp: '',
        date: new Date(0).getTime(),
      };

    if (!item.isFolder) {
      const ts = item.data.timestamp;
      return {
        unreadCount: item.data.unreadCount || 0,
        message: item.data.message,
        timestamp: ts,
        date: ts,
      };
    }

    let totalUnread = 0;
    let latestMessage = '';
    let latestTimestamp = '';
    let latestDate = new Date(0).getTime();

    item.children.forEach(childId => {
      const result = traverse(childId);
      totalUnread += result.unreadCount;

      if (result.date > latestDate) {
        latestMessage = result.message;
        latestTimestamp = result.timestamp;
        latestDate = result.date;
      }
    });

    item.data.unreadCount = totalUnread;
    item.data.message = latestMessage;
    item.data.timestamp = latestTimestamp;

    return {
      unreadCount: totalUnread,
      message: latestMessage,
      timestamp: latestTimestamp,
      date: latestDate,
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
        item.data.message.includes(searchKey))
    ) {
      arr.push(item);
    }
  } else {
    arr.push(item);
  }

  if (
    item.isFolder &&
    item.children.length &&
    (searchKey || expandedFolderIds.includes(item.index))
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
          (userGroupData[b]?.data?.unreadCount ?? 0) -
          (userGroupData[a]?.data?.unreadCount ?? 0);
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
