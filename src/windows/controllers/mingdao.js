'use strict';

const path = require('path');
const { BrowserWindow } = require('electron');
const electronLocalShortcut = require('electron-localshortcut');

const AppConfig = require('../../configuration');

class MingdaoWindow {
  constructor() {
    this.mingdaoWindow = null;
    this.createMingdaoWindow();
  }

  createMingdaoWindow() {
    this.mingdaoWindow = new BrowserWindow({
      width: 600,
      height: 440,
      resizable: false,
      fullscreenable: false,
      show: false,
      frame: true,
      //alwaysOnTop: true,
      icon: 'assets/icon.png',
      //titleBarStyle: 'hidden',
    });

    this.initWindowEvents();
    this.initMingdaoWindowShortcut();

    this.mingdaoWindow.loadURL(`file://${path.join(__dirname, '/../views/mingdao.html')}`);
  }

  initWindowEvents() {
    this.mingdaoWindow.on('close', () => {
      this.unregisterLocalShortCut();
      this.mingdaoWindow = null;
      this.isShown = false;
    });
    this.mingdaoWindow.once('ready-to-show', () => {
      this.mingdaoWindow.show();
    });
  }

  show() {
    if (!this.mingdaoWindow) {
      this.createMingdaoWindow();
    }
    this.mingdaoWindow.show();
    this.isShown = true;
  }

  hide() {
    this.mingdaoWindow.hide();
    this.isShown = false;
  }

  registerLocalShortcut() {
    electronLocalShortcut.register(this.mingdaoWindow, 'Esc', () => {
      this.mingdaoWindow.close();
    });
    electronLocalShortcut.register(this.mingdaoWindow, 'Enter', () => {
      var script = 'gotoCollect();';
      this.mingdaoWindow.webContents.executeJavaScript(script);  
      this.mingdaoWindow.close();
    });
  }

  unregisterLocalShortCut() {
    electronLocalShortcut.unregisterAll(this.mingdaoWindow);
  }

  initMingdaoWindowShortcut() {
    this.registerLocalShortcut();
  }
}

module.exports = MingdaoWindow;
