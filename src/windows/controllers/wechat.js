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


  mdLogin(){
    var data = {
        'account': AppConfig.readSettings('mingdao-username'),
        'password': AppConfig.readSettings('mingdao-password'),
        'verifyCode': '',
        'isCookie': true
    }
    var xx = this;
    var formData = querystring.stringify(data);
    var contentLength = formData.length;

    var options = {
      headers: {
        'Content-Length': contentLength,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: 'https://www.mingdao.com/ajaxpage/AjaxHeader.ashx?controller=Login&action=MDAccountLogin',
      method: 'POST',
      body: formData
    };

    function callback(error, response, data) {
      console.log('>>>>>>: ' + error + '\n' + response + '\n' + data);

      if (!error && response.statusCode == 200) {
        console.log('----info------',data);
        var json = JSON.parse(data);
        var sessionId = json.data.sessionId;
        var memberId = json.data.accountId;
        var cookie = 'md_pss_id=' + sessionId;
        xx.mdWorklogs(cookie, memberId);
      }
    } 

    request(options, callback);
  }

  mdWorklogs(cookie, memberId){
    var startDate = new Date(AppConfig.readSettings('mingdao-today'));
    var tomorrow = AppConfig.readSettings('mingdao-tomorrow');
    var days = 2;
    if (tomorrow == 'monday'){
      var n = startDate.getDay();
      if (n > 1) days = 8 - n + 1;
    }
    var endDate = new Date(startDate.valueOf() + days * 24 * 60 * 60 * 1000);
    //var s = dateFormat(startDate, "yyyy-mm-dd") + " - " + dateFormat(endDate, "yyyy-mm-dd");
    var data = {
        "isWorkCalendar": "true",
        "isTaskCalendar": "true",
        "filterTaskType": "2",
        "categoryIDs": "All",
        "memberIDs": memberId, //"8b11c703-b2e7-457a-9752-9d4a6077920b",
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
        'Cookie': cookie //'i18n.langtag=zh-Hans; gr_user_id=4aa35485-e1f4-4259-813f-fa061f8e8a56; _ga=GA1.2.6248114.1522833926; messagesUtk=d6271df3f739433b93a41d66c807d0d5; hubspotutk=8c8f815492c04af250b98eca8a3164b6; LoginName=+8613207169452; lastView=agendaDay; mdAutoLogin=accountId=8b11c703-b2e7-457a-9752-9d4a6077920b&password=ED30C5D75CC036D53AAF269E356AFE36; md_route=c8c2ff8deb5c89112522547c9109a331; md_s_id=dquvbpiw5z5eivqxrp2kmedi; md_pss_id=AB6F396375C8F4B4AF2B06E22664444; Hm_lvt_7fa03e3bcf838dc769842176503c5c5b=1522833926,1523539689,1523836592; __hssrc=1; _gid=GA1.2.370128181.1524122702; io=r51u9eSphYqwVMNnAAg6; tpStatistic=1; _gat=1; gr_session_id_b5122f5cd903be65=f7b693b5-c09c-4432-b97b-232ed05bc1d3; gr_cs1_f7b693b5-c09c-4432-b97b-232ed05bc1d3=user_id%3A8b11c703-b2e7-457a-9752-9d4a6077920b; __hstc=117017817.8c8f815492c04af250b98eca8a3164b6.1522833927156.1524182220771.1524184612569.9; Hm_lpvt_7fa03e3bcf838dc769842176503c5c5b=1524184644; __hssc=117017817.2.1524184612569'
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

        if (tomorrow != 'none'){
          var cs = getCalendarsByDate(items, startDate.valueOf() + (days - 1) * 24 * 60 * 60 * 1000);
          var name = days == 2 ? '明日':'下周一';
          worklog += '\\n\\n' + name +'计划:\\n';
          for(var idx in cs){
            worklog += cs[idx] + '\\n';
          }
          if (cs.length == 0){
            worklog += '绞尽脑汁，还没有想出' + name + '计划';
          }
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
