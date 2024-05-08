'use strict';

const { MyDriver } = require('my-homey');

module.exports = class PlayerDriver extends MyDriver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    super.onInit();
  }

  // FIXME: simplelog-api on/off
  logDebug(msg) {
    if (process.env.DEBUG === '1') {
      super.logDebug(msg);
    }
  }

  async onPairListDevices() {
    this.logDebug('onPairListDevices()');

    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = await discoveryStrategy.getDiscoveryResults();

    return Object.values(discoveryResults).map((device) => {
      return {
        name: device.name,
        data: {
          id: device.id.split(':')[1],
        },
        store: {
          address: device.address,
          port: device.port, // ???
        },
      };
    });
  }

};
