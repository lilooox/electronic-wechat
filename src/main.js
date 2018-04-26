'use strict';

const path = require('path');
const {app, ipcMain} = require('electron');

const UpdateHandler = require('./handlers/update');
const Common = require('./common');
const AppConfig = require('./configuration');

const SplashWindow = require('./windows/controllers/splash');
const WeChatWindow = require('./windows/controllers/wechat');
const SettingsWindow = require('./windows/controllers/settings');
const MingdaoWindow = require('./windows/controllers/mingdao');
const AppTray = require('./windows/controllers/app_tray');

class ElectronicWeChat {
  constructor() {
    this.wechatWindow = null;
    this.splashWindow = null;
    this.settingsWindow = null;
    this.mingdaoWindow = null;
    this.tray = null;
  }

  init() {
    if(this.checkInstance()) {
      this.initApp();
      this.initIPC();
    } else {
      app.quit();
    }
  }
  checkInstance() {
    if (AppConfig.readSettings('multi-instance') === 'on') return true;
    return !app.makeSingleInstance((commandLine, workingDirectory) => {
      if(this.splashWindow && this.splashWindow.isShown){
        this.splashWindow.show();
        return
      }
      if(this.wechatWindow){
        this.wechatWindow.show();
      }
      if(this.settingsWindow && this.settingsWindow.isShown){
        this.settingsWindow.show();
      }
      if(this.mingdaoWindow && this.mingdaoWindow.isShown){
        this.mingdaoWindow.show();
      }
    });

  }
  initApp() {
    app.on('ready', ()=> {
      this.createSplashWindow();
      this.createWeChatWindow();
      this.createTray();

      if (!AppConfig.readSettings('language')) {
        AppConfig.saveSettings('language', 'en');
        AppConfig.saveSettings('prevent-recall', 'on');
        AppConfig.saveSettings('icon', 'black');
        AppConfig.saveSettings('multi-instance','on');
      }
    });

    app.on('activate', () => {
      if (this.wechatWindow == null) {
        this.createWeChatWindow();
      } else {
        this.wechatWindow.show();
      }
    });
  };

  initIPC() {
    ipcMain.on('badge-changed', (event, num) => {
      if (process.platform == "darwin") {
        app.dock.setBadge(num);
        if (num) {
          this.tray.setTitle(` ${num}`);
        } else {
          this.tray.setTitle('');
        }
      } else if (process.platform === "linux" || process.platform === "win32") {
          app.setBadgeCount(num * 1);
          this.tray.setUnreadStat((num * 1 > 0)? 1 : 0);
      }
    });

    ipcMain.on('user-logged', () => {
      this.wechatWindow.resizeWindow(true, this.splashWindow)
    });

    ipcMain.on('wx-rendered', (event, isLogged) => {
      this.wechatWindow.resizeWindow(isLogged, this.splashWindow)
    });

    ipcMain.on('log', (event, message) => {
      console.log(message);
    });

    ipcMain.on('mdWorklogsSettings', (event, message) => {
      if (this.mingdaoWindow) {
        this.mingdaoWindow.show();
      } else {
        this.createMingdaoWindow();
        this.mingdaoWindow.show();
      }
      // if (this.wechatWindow == null) {
      //   console.log('>>> this.wechatWindow == null');
      // } else {
      //   //console.log('====> ' + this.wechatWindow.webContents);
      //   this.wechatWindow.mdWorklogs();
      // }
    });

    ipcMain.on('mdWorklogsCollect', (event, message) => {
      console.log('====> mdWorklogsCollect');
      if (this.wechatWindow == null) {
        console.log('>>> this.wechatWindow == null');
      } else {
        //console.log('====> ' + this.wechatWindow.webContents);
        //this.wechatWindow.mdWorklogs();
        this.wechatWindow.mdLogin();
      }
    });

    ipcMain.on('reload', (event, repetitive) => {
      if (repetitive) {
        this.wechatWindow.loginState.current = this.wechatWindow.loginState.NULL;
        this.wechatWindow.connectWeChat();
      } else {
        this.wechatWindow.loadURL(Common.WEB_WECHAT);
      }
    });

    ipcMain.on('update', (event, message) => {
      let updateHandler = new UpdateHandler();
      updateHandler.checkForUpdate(`v${app.getVersion()}`, false);
    });

    ipcMain.on('open-settings-window', (event, message) => {
      if (this.settingsWindow) {
        this.settingsWindow.show();
      } else {
        this.createSettingsWindow();
        this.settingsWindow.show();
      }
    });

    ipcMain.on('close-settings-window', (event, messgae) => {
      this.settingsWindow.close();
      this.settingsWindow = null;
    })
  };

  createTray() {
    this.tray = new AppTray(this.splashWindow, this.wechatWindow);
  }

  createSplashWindow() {
    this.splashWindow = new SplashWindow();
    this.splashWindow.show();
  }

  createWeChatWindow() {
    this.wechatWindow = new WeChatWindow();
  }

  createSettingsWindow() {
    this.settingsWindow = new SettingsWindow();
  }

  createMingdaoWindow() {
    this.mingdaoWindow = new MingdaoWindow();
  }
}

new ElectronicWeChat().init();
