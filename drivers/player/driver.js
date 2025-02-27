'use strict';

const { MyDriver } = require('my-homey');

module.exports = class PlayerDriver extends MyDriver {

  #actionSwitchOff;
  #actionCallPreset;

  async onInit() {
    super.onInit();

    this.#actionSwitchOff = this.homey.flow.getActionCard('switch_off');
    this.#actionSwitchOff.registerRunListener((args, state) => args.device.onCapabilityPlayerOff());

    this.#actionCallPreset = this.homey.flow.getActionCard('call_preset');
    this.#actionCallPreset.registerRunListener((args, state) => args.device.onCapabilityPreset(args.preset_number));
  }

  async onPairListDevices() {
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
