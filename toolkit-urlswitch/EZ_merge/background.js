// 初始化默认设置
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['rules', 'enabled'], (result) => {
      if (!result.rules) {
        chrome.storage.sync.set({
          rules: [
            {
              from: "",
              to: ""
            }
          ]
        });
      }
      
      if (result.enabled === undefined) {
        chrome.storage.sync.set({ enabled: true });
      }
      
      updateContextMenu(result.enabled !== false);
    });
  });
  
  // 创建或更新右键菜单
  function updateContextMenu(enabled) {
    // 先移除现有的菜单
    chrome.contextMenus.removeAll(() => {
      if (enabled) {
        // 创建新菜单
        chrome.contextMenus.create({
          id: "convertPath",
          title: "转换成分支路径",
          contexts: ["link"]
        });
      }
    });
  }
  
  // 监听设置变化，更新右键菜单
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      updateContextMenu(changes.enabled.newValue);
    }
  });
  
  // 处理右键菜单点击事件
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "convertPath") {
      const originalUrl = info.linkUrl;
      
      chrome.storage.sync.get(['rules'], (result) => {
        let convertedUrl = originalUrl;
        const rules = result.rules || [];
        
        for (const rule of rules) {
          // 将通配符模式转换为正则表达式
          const pattern = wildcardToRegExp(rule.from);
          if (pattern.test(originalUrl)) {
            // 使用捕获组进行替换
            convertedUrl = originalUrl.replace(pattern, rule.to);
            break;
          }
        }
        
        // 复制转换后的URL到剪贴板
        copyToClipboard(convertedUrl, tab.id);
      });
    }
  });
  
  // 将通配符模式转换为正则表达式
  function wildcardToRegExp(wildcardPattern) {
    // 转义正则表达式特殊字符
    let regexPattern = wildcardPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // 将通配符转换为正则表达式模式
    // * -> .*  (匹配0或多个任意字符)
    // ? -> .   (匹配1个任意字符)
    regexPattern = regexPattern.replace(/\*/g, '(.*)').replace(/\?/g, '(.)');
    
    return new RegExp(regexPattern, 'g');
  }
  
  // 复制到剪贴板并通知用户
  function copyToClipboard(text, tabId) {
    // 创建一个临时的content script来执行复制操作
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: copyTextToClipboard,
      args: [text]
    });
  }
  
  // 在页面上下文中执行的复制函数
  function copyTextToClipboard(text) {
    // 使用 Clipboard API (现代方法)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showNotification("链接已转换并复制到剪贴板!"))
        .catch(err => showNotification("复制失败: " + err, true));
    } else {
      // 使用传统方法作为后备
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";  // 避免滚动到视图之外
      textArea.style.opacity = "0";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showNotification("链接已转换并复制到剪贴板!");
        } else {
          showNotification("复制失败", true);
        }
      } catch (err) {
        showNotification("复制失败: " + err, true);
      }
      
      document.body.removeChild(textArea);
    }
    
    // 显示通知
    function showNotification(message, isError = false) {
      // 移除任何现有的通知
      const oldNotifications = document.querySelectorAll('.path-converter-notification');
      oldNotifications.forEach(n => document.body.removeChild(n));
      
      // 创建通知元素
      const notification = document.createElement('div');
      notification.className = 'path-converter-notification';
      notification.textContent = message;
      notification.style.position = 'fixed';
      notification.style.top = '10px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.padding = '10px 20px';
      notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
      notification.style.color = 'white';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = '9999999';
      notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
      notification.style.fontSize = '14px';
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }
  }
  