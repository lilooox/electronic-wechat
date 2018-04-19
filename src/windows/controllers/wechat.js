/**
 * Created by Zhongyi on 5/2/16.
 */

'use strict';

const path = require('path');
const isXfce = require('is-xfce');
const { app, shell, BrowserWindow } = require('electron');
const electronLocalShortcut = require('electron-localshortcut');

const dateFormat = require('dateformat');
const request = require('request');
const querystring = require('querystring');

const AppConfig = require('../../configuration');

const CSSInjector = require('../../inject/css');
const MessageHandler = require('../../handlers/message');
const UpdateHandler = require('../../handlers/update');

const lan = AppConfig.readSettings('language');

let Common;
if (lan === 'zh-CN') {
  Common = require('../../common_cn');
} else {
  Common = require('../../common');
}

class WeChatWindow {
  constructor() {
    this.isShown = false;
    this.loginState = { NULL: -2, WAITING: -1, YES: 1, NO: 0 };
    this.loginState.current = this.loginState.NULL;
    this.inervals = {};
    this.createWindow();
    this.initWechatWindowShortcut();
    this.initWindowEvents();
    this.initWindowWebContent();
  }

  resizeWindow(isLogged, splashWindow) {
    const size = isLogged ? Common.WINDOW_SIZE : Common.WINDOW_SIZE_LOGIN;

    this.wechatWindow.setResizable(isLogged);
    this.wechatWindow.setSize(size.width, size.height);
    if (this.loginState.current === 1 - isLogged || this.loginState.current === this.loginState.WAITING) {
      splashWindow.hide();
      this.show();
      this.wechatWindow.center();
      this.loginState.current = isLogged;
    }
  }

  createWindow() {
    this.wechatWindow = new BrowserWindow({
      title: Common.ELECTRONIC_WECHAT,
      resizable: true,
      center: true,
      show: false,
      frame: true,
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../../../assets/icon.png'),
      titleBarStyle: 'hidden-inset',
      webPreferences: {
        javascript: true,
        plugins: true,
        nodeIntegration: false,
        webSecurity: false,
        preload: path.join(__dirname, '../../inject/preload.js'),
      },
    });

    /* menu is always visible on xfce session */
    isXfce().then(data => {
      if(data) {
        this.wechatWindow.setMenuBarVisibility(true);
        this.wechatWindow.setAutoHideMenuBar(false);
      }
    });
  }

  loadURL(url) {
    this.wechatWindow.loadURL(url);
  }

  show() {
    this.wechatWindow.show();
    this.wechatWindow.focus();
    this.wechatWindow.webContents.send('show-wechat-window');
    this.isShown = true;
  }

  hide() {
    this.wechatWindow.hide();
    this.wechatWindow.webContents.send('hide-wechat-window');
    this.isShown = false;
  }


  mdWorklogs(){
    var startDate = new Date();
    var endDate = new Date(startDate.valueOf() + 2 * 24 * 60 * 60 * 1000);
    //var s = dateFormat(startDate, "yyyy-mm-dd") + " - " + dateFormat(endDate, "yyyy-mm-dd");
    var data = {
        "isWorkCalendar": "true",
        "isTaskCalendar": "true",
        "filterTaskType": "2",
        "categoryIDs": "All",
        "memberIDs": "8b11c703-b2e7-457a-9752-9d4a6077920b",
        "startDate": dateFormat(startDate, "yyyy-mm-dd"),
        "endDate": dateFormat(endDate, "yyyy-mm-dd")
    }
    var xx = this;
    var formData = querystring.stringify(data);
    var contentLength = formData.length;

    var options = {
      headers: {
        'Content-Length': contentLength,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': 'gr_cs1_fc3da78f-2a69-4e88-ae3c-f3554a348802=user_id%3A8b11c703-b2e7-457a-9752-9d4a6077920b; gr_session_id_b5122f5cd903be65=fc3da78f-2a69-4e88-ae3c-f3554a348802; Hm_lpvt_7fa03e3bcf838dc769842176503c5c5b=1523539383; Hm_lvt_7fa03e3bcf838dc769842176503c5c5b=1522843774,1523234533,1523325274,1523539383; tpStatistic=1; md_pss_id=CE7101CF0DB83417D7B1E4D9447DB8F; md_route=c403aa5352b7f7ff465b9aae5ebd5a4d; md_s_id=cdlfmwfalbiizjnhepv3w2jo; __hstc=117017817.64ade9afe8562679988034db1a2b9289.1522671231556.1522671231556.1522671231556.1; hubspotutk=64ade9afe8562679988034db1a2b9289; messagesUtk=b9f0233f250743b59b610f990bcb2dae; _ga=GA1.2.1984145339.1488784879; lastView=agendaDay; i18n.langtag=zh-Hans; foldedProjects_8b11c703-b2e7-457a-9752-9d4a6077920b_feed=048e2c9e-9ae6-4089-8f8e-8464e7f2dbcd%2C; fs_uid=www.fullstory.com`219ZY`5172547914039296:5629499534213120`8b11c703-b2e7-457a-9752-9d4a6077920b`; LoginName=+8613207169452; mdAutoLogin=accountId=8b11c703-b2e7-457a-9752-9d4a6077920b&password=ED30C5D75CC036D53AAF269E356AFE36; gr_user_id=8d0430f8-451a-4b90-bb10-7e7366a58705'
      },
      url: 'https://www.mingdao.com/ajaxpage/AjaxHeader.ashx?controller=Calendar&action=GetCalendars',
      method: 'POST',
      body: formData
    };

    function getCalendarsByDate(calendars, date){
      var result = new Array();
      for (var i = 0; i < calendars.length; i++) {
        var c = calendars[i];
        var startDate = dateFormat(c.startTime, "yyyy-mm-dd");
        var endDate = dateFormat(c.endTime, "yyyy-mm-dd");
        var d = dateFormat(date, "yyyy-mm-dd");
        if (d >= startDate && d <= endDate){
          result.push(c.title);
        }
      }
      return result.sort();
    }

    function callback(error, response, data) {
      console.log('>>>>>>: ' + error + '\n' + response + '\n' + data);

      if (!error && response.statusCode == 200) {
        console.log('----info------',data);
        var json = JSON.parse(data);
        var list = json.data.data.calendars;
        //console.log('json: ', json, 'list: ', list);
        // var items = new Array();
        // for(var idx in list){
        //   var item = list[idx];
        //   var it = item.title;
        //   if (it.indexOf('(全天)') == 0){
        //     console.log('>>>> ', it.substring(4));
        //     items.push(it.substring(4));
        //   }
        // }
        var items = new Array();
        for(var idx in list){
          var item = list[idx];
          //console.log('+++++ ', item);
          items.push({'createUser': item.createUser, 'createUserName': item.createUserName, 'startTime': item.start, 'endTime': item.isAllDay?(new Date(item.end).valueOf() - 1 * 24 * 60 * 60 * 1000):item.end, 'title': item.title.replace('(全天)', '')});
        }
        var cs = getCalendarsByDate(items, startDate);
        // items = items.sort();
        // console.log(items);
        // console.log('+++++ ', items);
        var worklog = dateFormat(startDate, "yyyy-mm-dd") + ' 工作内容:\\n';
        for(var idx in cs){
          worklog += cs[idx] + '\\n';
        }
        if (cs.length == 0){
          worklog += '太懒了，今天还没有写日志';
        }

        var cs = getCalendarsByDate(items, startDate.valueOf() + 1 * 24 * 60 * 60 * 1000);
        worklog += '\\n明日计划:\\n';
        for(var idx in cs){
          worklog += cs[idx] + '\\n';
        }
        if (cs.length == 0){
          worklog += '绞尽脑汁，还没有想出明日计划';
        }

        /*
        var script = '\
          $("#editArea").focus();\
          $("#editArea").text("' + worklog + '");\
          var appElement = document.querySelector("[ng-controller=chatSenderController]");\
          var $scope = angular.element(appElement).scope();\
          $scope.$apply();\
          $scope.sendTextMessage();\
        ';
        */
        var script = '\
          $("#editArea").text("");\
          var appElement = document.querySelector("[ng-controller=chatSenderController]");\
          var $scope = angular.element(appElement).scope();\
          $scope.insertToEditArea("' + worklog + '", 0);\
          $scope.sendTextMessage();\
          $("#editArea").text("");\
        ';

        console.log('mdWorklogs: ' + script);

        xx.wechatWindow.webContents.executeJavaScript(script);  
      }
    } 

    request(options, callback);
  }

  connectWeChat() {
    Object.keys(this.inervals).forEach((key, index) => {
      clearInterval(key);
      delete this.inervals[key];
    });

    this.loadURL(Common.WEB_WECHAT);
    const int = setInterval(() => {
      if (this.loginState.current === this.loginState.NULL) {
        this.loadURL(Common.WEB_WECHAT);
        console.log('Reconnect.');
      }
    }, 5000);
    this.inervals[int] = true;
  }

  initWindowWebContent() {
    this.wechatWindow.webContents.setUserAgent(Common.USER_AGENT[process.platform]);
    if (Common.DEBUG_MODE) {
      this.wechatWindow.webContents.openDevTools();
    }

    this.connectWeChat();

    this.wechatWindow.webContents.on('will-navigate', (ev, url) => {
      if (/(.*wx.*\.qq\.com.*)|(web.*\.wechat\.com.*)/.test(url)) return;
      ev.preventDefault();
    });

    this.wechatWindow.webContents.on('dom-ready', () => {
      this.wechatWindow.webContents.insertCSS(CSSInjector.commonCSS);
      if (process.platform === 'darwin') {
        this.wechatWindow.webContents.insertCSS(CSSInjector.osxCSS);
      }

      if (!UpdateHandler.CHECKED) {
        new UpdateHandler().checkForUpdate(`v${app.getVersion()}`, true);
      }
    });

    this.wechatWindow.webContents.on('new-window', (event, url) => {
      event.preventDefault();
      shell.openExternal(new MessageHandler().handleRedirectMessage(url));
    });

    this.wechatWindow.webContents.on('will-navigate', (event, url) => {
      if (url.endsWith('/fake')) event.preventDefault();
    });
  }

  initWindowEvents() {
    this.wechatWindow.on('close', (e) => {
      if (this.wechatWindow.isVisible()) {
        e.preventDefault();
        this.hide();
      }
      this.unregisterLocalShortCut();
    });

    this.wechatWindow.on('page-title-updated', (ev) => {
      if (this.loginState.current === this.loginState.NULL) {
        this.loginState.current = this.loginState.WAITING;
      }
      ev.preventDefault();
    });

    this.wechatWindow.on('show', () => {
      this.registerLocalShortcut();
    });
  }

  registerLocalShortcut() {
    electronLocalShortcut.register(this.wechatWindow, 'CommandOrControl + H', () => {
      this.wechatWindow.hide();
    });
  }

  unregisterLocalShortCut() {
    electronLocalShortcut.unregisterAll(this.wechatWindow);
  }

  initWechatWindowShortcut() {
    this.registerLocalShortcut();
  }
}

module.exports = WeChatWindow;
