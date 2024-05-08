'use strict';

const { MyApp } = require('my-homey');

module.exports = class WiimApp extends MyApp {

  async onInit() {
    super.onInit();
  }

  // FIXME: simplelog-api on/off
  logDebug(msg) {
    if (process.env.DEBUG === '1') {
      super.logDebug(msg);
    }
  }


};
