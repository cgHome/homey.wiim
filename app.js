'use strict';

const { MyApp } = require('my-homey');

module.exports = class WiimApp extends MyApp {

  async onInit() {
    super.onInit();

    this.logInfo('App has been initialized');
  }

};
