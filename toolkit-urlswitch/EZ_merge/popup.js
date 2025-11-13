// DOM 元素
const rulesContainer = document.getElementById('rules-container');
const addRuleBtn = document.getElementById('add-rule-btn');
const saveBtn = document.getElementById('save-btn');
const statusDiv = document.getElementById('status');
const extensionToggle = document.getElementById('extension-toggle');

// 加载保存的规则和启用状态
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['rules', 'enabled'], (result) => {
    // 加载规则
    const rules = result.rules || [];
    rules.forEach(rule => {
      addRuleRow(rule.from, rule.to);
    });
    
    // 如果没有规则，添加一个空规则
    if (rules.length === 0) {
      addRuleRow();
    }
    
    // 设置切换按钮状态
    extensionToggle.checked = result.enabled !== false;
  });
});

// 添加规则按钮
addRuleBtn.addEventListener('click', () => {
  addRuleRow();
});

// 保存按钮
saveBtn.addEventListener('click', saveRules);

// 保存规则和状态
function saveRules() {
  const rules = [];
  const ruleItems = rulesContainer.querySelectorAll('.rule-item');
  
  ruleItems.forEach(item => {
    const fromInput = item.querySelector('.from-input');
    const toInput = item.querySelector('.to-input');
    
    // 只保存不为空的规则
    if (fromInput.value.trim() && toInput.value.trim()) {
      rules.push({
        from: fromInput.value.trim(),
        to: toInput.value.trim()
      });
    }
  });
  
  // 保存规则和启用状态
  chrome.storage.sync.set({ 
    rules: rules,
    enabled: extensionToggle.checked 
  }, () => {
    showStatus('设置已保存!');
  });
}

// 添加规则行
function addRuleRow(from = '', to = '') {
  const ruleItem = document.createElement('div');
  ruleItem.className = 'rule-item';
  
  // 创建源路径行
  const fromRow = document.createElement('div');
  fromRow.className = 'rule-row';
  
  const fromLabel = document.createElement('div');
  fromLabel.className = 'rule-label';
  fromLabel.textContent = '源路径:';
  
  const fromInput = document.createElement('input');
  fromInput.className = 'rule-input from-input';
  fromInput.type = 'text';
  fromInput.placeholder = '例如: https://h74.pm.netease.com/projects/*/repository/*';
  fromInput.value = from;
  
  fromRow.appendChild(fromLabel);
  fromRow.appendChild(fromInput);
  
  // 创建源路径提示
  const fromHint = document.createElement('div');
  fromHint.className = 'rule-hint';
  fromHint.textContent = '支持通配符: * (多个字符), ? (单个字符)';
  
  // 创建目标路径行
  const toRow = document.createElement('div');
  toRow.className = 'rule-row';
  
  const toLabel = document.createElement('div');
  toLabel.className = 'rule-label';
  toLabel.textContent = '目标路径:';
  
  const toInput = document.createElement('input');
  toInput.className = 'rule-input to-input';
  toInput.type = 'text';
  toInput.placeholder = '例如: https://svn-h74.gz.netease.com/svn/$1/$2';
  toInput.value = to;
  
  toRow.appendChild(toLabel);
  toRow.appendChild(toInput);
  
  // 创建目标路径提示
  const toHint = document.createElement('div');
  toHint.className = 'rule-hint';
  toHint.textContent = '可使用 $1, $2 等引用源路径中的通配符匹配内容';
  
  // 创建操作行
  const actionsRow = document.createElement('div');
  actionsRow.className = 'rule-actions';
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-rule-btn';
  removeBtn.textContent = '删除规则';
  removeBtn.addEventListener('click', () => {
    rulesContainer.removeChild(ruleItem);
  });
  
  actionsRow.appendChild(removeBtn);
  
  // 组装规则项
  ruleItem.appendChild(fromRow);
  ruleItem.appendChild(fromHint);
  ruleItem.appendChild(toRow);
  ruleItem.appendChild(toHint);
  ruleItem.appendChild(actionsRow);
  
  rulesContainer.appendChild(ruleItem);
}

// 显示状态信息
function showStatus(message) {
  statusDiv.textContent = message;
  statusDiv.style.opacity = '1';
  
  setTimeout(() => {
    statusDiv.style.opacity = '0';
  }, 2000);
}
