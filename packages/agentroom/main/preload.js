'use strict';
/* 窄桥：只暴露显式命令/取消/退出与一次性配对凭据。
 * 不暴露 ipcRenderer / fs / shell / 任意执行。 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('npcDesktop', {
  takePairCredential: () => ipcRenderer.invoke('npc:take-pair-credential'),
  sendCommand: (payload) => ipcRenderer.invoke('npc:command', payload),
  sendCancel: (target) => ipcRenderer.invoke('npc:cancel', target),
  requestExit: () => ipcRenderer.send('npc:exit'),
  onCommandUpdate: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('npc:command-update', handler);
    return () => ipcRenderer.removeListener('npc:command-update', handler);
  }
});
