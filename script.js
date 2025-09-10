// 全局变量
let currentMode = null;
let currentStep = 0;
let userId = null;
let userGroup = null;
let conversationHistory = [];

// 从URL参数获取实验组
function getGroupFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const group = urlParams.get('group');
    if (group && getConversationConfig(group)) {
        return {
            group: group,
            factors: {
                factor1: parseInt(group[0]),
                factor2: parseInt(group[1]), 
                factor3: parseInt(group[2])
            }
        };
    }
    return null;
}

// 生成随机用户ID
function generateUserId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `user_${timestamp}_${random}`;
}

// 随机分配实验组
function assignUserGroup() {
    const factor1 = Math.random() < 0.5 ? 1 : 2; // 人/AI
    const factor2 = Math.random() < 0.5 ? 1 : 2; // 强硬/附和
    const factor3 = Math.random() < 0.5 ? 1 : 2; // 好/差
    
    return {
        group: `${factor1}${factor2}${factor3}`,
        factors: { factor1, factor2, factor3 }
    };
}

// 记录用户分组信息
function logUserGroup(userId, userGroup) {
    const experimentId = `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const groupDescriptions = {
        '111': '人-强硬-好',
        '112': '人-强硬-差',
        '121': '人-附和-好',
        '122': '人-附和-差',
        '211': 'AI-强硬-好',
        '212': 'AI-强硬-差',
        '221': 'AI-附和-好',
        '222': 'AI-附和-差'
    };
    
    const logData = {
        userId: userId,
        experimentId: experimentId,
        group: userGroup.group,
        groupDescription: groupDescriptions[userGroup.group],
        factors: userGroup.factors,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    const dataStr = JSON.stringify(logData, null, 2);
    const dataBlob = new Blob([dataStr + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_group_${userId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('用户分组信息已记录:', logData);
}

// 动态获取对话配置的函数
function getConversationConfig(group) {
    // 根据组号返回对应的配置
    const configMap = {
        '111': typeof qaConfig111 !== 'undefined' ? qaConfig111 : null,
        '112': typeof qaConfig112 !== 'undefined' ? qaConfig112 : null,
        '121': typeof qaConfig121 !== 'undefined' ? qaConfig121 : null,
        '122': typeof qaConfig122 !== 'undefined' ? qaConfig122 : null,
        '211': typeof qaConfig211 !== 'undefined' ? qaConfig211 : null,
        '212': typeof qaConfig212 !== 'undefined' ? qaConfig212 : null,
        '221': typeof qaConfig221 !== 'undefined' ? qaConfig221 : null,
        '222': typeof qaConfig222 !== 'undefined' ? qaConfig222 : null
    };
    
    return configMap[group] || null;
}

// 等待所有配置加载完成
function waitForConfigs(callback) {
    let attempts = 0;
    const maxAttempts = 50; // 最多等待5秒
    
    function checkConfigs() {
        attempts++;
        
        // 检查当前页面需要的配置是否已加载
        const group = window.forceGroup;
        const config = getConversationConfig(group);
        
        if (config || attempts >= maxAttempts) {
            callback();
        } else {
            setTimeout(checkConfigs, 100);
        }
    }
    
    checkConfigs();
}

// 页面加载时初始化 - 使用window.onload确保所有脚本都已加载
window.addEventListener('load', function() {
    waitForConfigs(function() {
        // 优先使用强制组设置，然后是URL参数，最后是随机分配
        if (window.forceGroup && getConversationConfig(window.forceGroup)) {
            userGroup = {
                group: window.forceGroup,
                factors: {
                    factor1: parseInt(window.forceGroup[0]),
                    factor2: parseInt(window.forceGroup[1]),
                    factor3: parseInt(window.forceGroup[2])
                }
            };
        } else {
            userGroup = getGroupFromURL() || assignUserGroup();
        }
    
    userId = generateUserId();
    
    // logUserGroup(userId, userGroup); // 注释掉文件下载功能
    
    console.log('用户ID:', userId);
    console.log('实验组:', userGroup);
    
    // 隐藏实验ID和实验组信息显示
    const experimentHeader = document.querySelector('.experiment-header');
    if (experimentHeader) {
        experimentHeader.style.display = 'none';
    }
    
    const config = getConversationConfig(userGroup.group);
    console.log('用户组:', userGroup.group);
    console.log('配置:', config);
    
    if (!config) {
        console.error('无法找到组配置:', userGroup.group);
        return;
    }
    
    document.getElementById('partner-avatar').src = config.avatar;
    document.getElementById('partner-name').textContent = config.name;
    document.getElementById('partner-status').textContent = config.status;
    
    startConversation();

function startConversation() {
    const config = getConversationConfig(userGroup.group);
    if (currentStep < config.messages.length) {
        const message = config.messages[currentStep];
        if (message.text.trim() !== '') {  // 新增检查：如果text不为空，才显示消息
            addMessage(config.name, config.avatar, message.text, false);
        }
        showOptions(message.options);
    }
}

function addMessage(sender, avatar, text, isUser = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'sent' : 'received'}`;
    
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <img src="${avatar}" alt="${sender}" class="message-avatar">
        <div class="message-content">
            <div>${text}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    conversationHistory.push({
        sender: isUser ? 'user' : 'partner',
        text: text,
        timestamp: new Date(),
        step: currentStep
    });
}

function showOptions(options) {
    const optionsContainer = document.getElementById('option-buttons');
    optionsContainer.innerHTML = '';
    
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.onclick = () => selectOption(option, index);
        optionsContainer.appendChild(button);
    });
}

function selectOption(selectedText, optionIndex) {
    const userAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
    addMessage('我', userAvatar, selectedText, true);
    
    conversationHistory.push({
        sender: 'user',
        text: selectedText,
        optionIndex: optionIndex,
        timestamp: new Date(),
        step: currentStep
    });
    
    currentStep++;
    
    const config = getConversationConfig(userGroup.group);
    if (currentStep < config.messages.length) {
        setTimeout(() => {
            const nextMessage = config.messages[currentStep];
            if (nextMessage.text.trim() !== '') {  // 新增检查：如果text不为空，才显示消息
                addMessage(config.name, config.avatar, nextMessage.text, false);
            }
            showOptions(nextMessage.options);
        }, 1000);
    } else {
        setTimeout(() => {
            endConversation();
        }, 1000);
    }
}

function endConversation() {
    const config = getConversationConfig(userGroup.group);
    const endMessage = userGroup.factors.factor1 === 1 
        ? '很高兴和你聊天！希望我们下次还能继续交流。' 
        : '感谢您的使用！如果您还有其他问题，随时可以找我。';
    
    addMessage(config.name, config.avatar, endMessage, false);
    
    // 注释掉JSON文件下载功能
    // const conversationData = {
    //     userId: userId,
    //     group: userGroup.group,
    //     factors: userGroup.factors,
    //     conversationHistory: conversationHistory,
    //     endTime: new Date().toISOString()
    // };
    
    // const dataStr = JSON.stringify(conversationData, null, 2);
    // const dataBlob = new Blob([dataStr], { type: 'application/json' });
    // const url = URL.createObjectURL(dataBlob);
    
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = `conversation_${userId}.json`;
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // URL.revokeObjectURL(url);
    
    const optionsContainer = document.getElementById('option-buttons');
    optionsContainer.innerHTML = `
        <div style="text-align: center; color: #666; padding: 20px;">
            对话结束，感谢您的参与！
            <br><br>
            <div style="font-size: 0.9em; color: #999;">
                3秒后自动返回问卷页面...
            </div>
        </div>
    `;
    
    // 自动返回来源页面
    setTimeout(() => {
        // 获取来源页面URL
        const referrer = document.referrer;
        
        if (referrer && referrer !== window.location.href) {
            // 如果有来源页面且不是当前页面，则返回
            window.location.href = referrer;
        } else {
            // 如果没有来源页面，则返回上一页
            window.history.back();
        }
    }, 3000); // 3秒后自动跳转
}

    });  // 关闭waitForConfigs回调
});  // 关闭window.addEventListener 