'use strict';
/* 窄桥：只暴露向导四屏需要的显式方法。
 * 不暴露 ipcRenderer / fs / shell / 任意执行；无事件推送（结果均为 invoke 返回值）。 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentroomOnboarding', {
  getState: () => ipcRenderer.invoke('agentroom:onboarding:state'),
  install: (payload) => ipcRenderer.invoke('agentroom:onboarding:install', payload),
  runTest: () => ipcRenderer.invoke('agentroom:onboarding:test'),
  close: () => ipcRenderer.send('agentroom:onboarding:close')
});
