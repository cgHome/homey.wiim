'use strict';

const http = require('node:http');
const https = require('node:https');

const UPnP = require('upnp-client-ts');
const convert = require('xml-js')

const { MyHttpDevice } = require('my-homey');

module.exports = class PlayerDevice extends MyHttpDevice {

  #upnpClient
  #albumArtImage = null
  #currentAlbumURI = ''

  async onInit() {
    super.onInit();

    this.registerCapabilityListener('speaker_playing', this.onCapabilitySpeakerPlaying.bind(this));
    this.registerCapabilityListener('speaker_prev', this.onCapabilitySpeakerPrev.bind(this));
    this.registerCapabilityListener('speaker_next', this.onCapabilitySpeakerNext.bind(this));
    this.registerCapabilityListener('speaker_shuffle', this.onCapabilitySpeakerShuffle.bind(this));
    this.registerCapabilityListener('speaker_repeat', this.onCapabilitySpeakerRepeat.bind(this));
    this.registerCapabilityListener('volume_set', this.onCapabilityVolumeSet.bind(this));
    this.registerCapabilityListener('volume_mute', this.onCapabilityVolumeMute.bind(this));
    this.registerCapabilityListener('button.off', this.onCapabilityPlayerOff.bind(this));
    this.registerCapabilityListener('button.preset1', this.onCapabilityPreset.bind(this, '1'));
    this.registerCapabilityListener('button.preset2', this.onCapabilityPreset.bind(this, '2'));
    this.registerCapabilityListener('button.preset3', this.onCapabilityPreset.bind(this, '3'));
    this.registerCapabilityListener('button.preset4', this.onCapabilityPreset.bind(this, '4'));

    this.registerDeviceListener('GetInfoEx', this.onDeviceGetInfoEx.bind(this));

    this.#albumArtImage = await this.homey.images.createImage();
    this.#albumArtImage.setUrl(null)
    this.setAlbumArtImage(this.#albumArtImage)
      .catch((err) => this.logError(`onInit() > AlbumArtImage > ${err.message}`));

    this.#upnpClient = new UPnP.UpnpDeviceClient(`http://${this.getStoreValue('address')}:49152/description.xml`);
    // FIXME: Workaround until "subscribe > renew" is fixed
    // this.#upnpClient.subscribe('AVTransport', (event) => {
    //   this.logDebug(`onInit() > subscribe > AVTransport`)
    //   this.getDeviceValues()
    // })
    this.homey.setInterval(() => this.getDeviceValues(), 5000)
  }

  // FIXME: simplelog-api on/off
  logDebug(msg) {
    if (process.env.DEBUG === '1') {
      super.logDebug(msg);
    }
  }

  // MyHttpDevice

  getHttpConfig() {
    return {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    };
  }

  getBaseURL() {
    return `https://${this.getStoreValue('address')}`;
  }

  sendCommand(url) {
    return super.sendCommand(`/httpapi.asp?command=${url}`);
  }

  getDeviceValues(url = '**UPnP**') {
    return super.getDeviceValues(url)
  }

  async getDeviceData(url) {
    this.logDebug(`getDeviceData()`);

    return this.#upnpClient.callAction('AVTransport', 'GetInfoEx', { InstanceID: 0 })
      .then((data) => this.deviceDataReceived('GetInfoEx', data))
      .catch((error) => this.logError(`getDeviceData() > callAction > ${error}`))
  }

  //
  // Capability handling
  //

  onCapabilitySpeakerPlaying(value, opts) {
    this.logDebug(`onCapabilitySpeakerPlaying() > ${value} opts: ${JSON.stringify(opts)}`);

    if (value) {
      return this.sendCommand('setPlayerCmd:resume')
        .then(() => this.logNotice(`Play`))
        .catch((error) => this.logError(`onCapabilitySpeakerPlaying() > sendCommand > ${error}`))
    } else {
      return this.sendCommand('setPlayerCmd:pause')
        .then(() => this.logNotice(`Pause`))
        .catch((error) => this.logError(`onCapabilitySpeakerPlaying() > sendCommand > ${error}`))
    }
  }

  onCapabilitySpeakerPrev() {
    this.logDebug(`onCapabilitySpeakerPrev()`);

    return this.sendCommand('setPlayerCmd:prev')
      .then(() => this.logNotice(`Prev`))
      .catch((error) => this.logError(`onCapabilitySpeakerPrev() > sendCommand > ${error}`))
  }

  onCapabilitySpeakerNext() {
    this.logDebug(`onCapabilitySpeakerNext()`);

    return this.sendCommand('setPlayerCmd:next')
      .then(() => this.logNotice(`Next`))
      .catch((error) => this.logError(`onCapabilitySpeakerNext() > sendCommand > ${error}`))
  }

  onCapabilitySpeakerShuffle(value, opts) {
    this.logDebug(`onCapabilitySpeakerShuffle() > ${value} opts: ${JSON.stringify(opts)}`);

    return this.sendCommand(`setPlayerCmd:loopmode:${this.#convertToLoopMode(value, this.getCapabilityValue('speaker_repeat'))}`)
      .then(() => this.logNotice(`Shuffle`))
      .catch((error) => this.logError(`onCapabilitySpeakerShuffle() > sendCommand > ${error}`))
  }

  onCapabilitySpeakerRepeat(value, opts) {
    this.logDebug(`onCapabilitySpeakerRepeat() > ${value} opts: ${JSON.stringify(opts)}`)

    return this.sendCommand(`setPlayerCmd:loopmode:${this.#convertToLoopMode(this.getCapabilityValue('speaker_shuffle'), value)}`)
      .then(() => this.logNotice(`Repeat - ${value}`))
      .catch((error) => this.logError(`onCapabilitySpeakerRepeat() > sendCommand > ${error}`))
  }

  onCapabilityVolumeSet(value, opts) {
    this.logDebug(`onCapabilityVolumeSet() > ${value} opts: ${JSON.stringify(opts)}`)

    return this.sendCommand(`setPlayerCmd:vol:${value * 100}`)
      .then(() => this.logNotice(`Volume - ${value * 100}`))
      .catch((error) => this.logError(`onCapabilityVolumeSet() > sendCommand > ${error}`))
  }

  onCapabilityVolumeMute(value, opts) {
    this.logDebug(`onCapabilityVolumeMute() > ${value} opts: ${JSON.stringify(opts)}`)

    return this.sendCommand(`setPlayerCmd:mute:${value ? '1' : '0'}`)
      .then(() => this.logNotice(`Mute - ${value ? 'on' : 'off'}`))
      .catch((error) => this.logError(`onCapabilityVolumeMute() > sendCommand > ${error}`))
  }

  onCapabilityPlayerOff() {
    this.logDebug(`onCapabilityPlayerOff()`)

    return this.sendCommand(`setPlayerCmd:stop`)
      .then(() => this.logNotice(`Off`))
      .catch((error) => this.logError(`onCapabilityPlayerOff() > sendCommand > ${error}`))
  }

  onCapabilityPreset(value) {
    this.logDebug(`onCapabilityPreset() > ${value}`)

    return this.sendCommand(`MCUKeyShortClick:${value}`)
      .then(() => this.logNotice(`Preset ${value}`))
      .catch((error) => this.logError(`onCapabilityPreset() > sendCommand > ${error}`))
  }

  //
  // Device handling
  //

  onDeviceGetInfoEx(value) {
    try {
      const data = { ...value }

      if (data.TrackMetaData.length > 0) {
        data.TrackMetaData = this.#convertXmlToJSON(data.TrackMetaData)['DIDL-Lite'].item
      }
      this.logDebug(`onDeviceGetInfoEx() > ${JSON.stringify(data)}`)

      const playing = data.CurrentTransportState === "PLAYING"
      this.setCapabilityValue('speaker_playing', playing)

      switch (data['LoopMode']) {
        case "0":
          this.setCapabilityValue('speaker_shuffle', false)
          this.setCapabilityValue('speaker_repeat', 'playlist')
          break;
        case "1":
          this.setCapabilityValue('speaker_shuffle', false)
          this.setCapabilityValue('speaker_repeat', 'track')
          break;
        case "2":
          this.setCapabilityValue('speaker_shuffle', true)
          this.setCapabilityValue('speaker_repeat', 'playlist')
          break;
        case "3":
          this.setCapabilityValue('speaker_shuffle', true)
          this.setCapabilityValue('speaker_repeat', 'none')
          break;
        case "4":
          this.setCapabilityValue('speaker_shuffle', false)
          this.setCapabilityValue('speaker_repeat', 'none')
          break;
        case "5":
          this.setCapabilityValue('speaker_shuffle', true)
          this.setCapabilityValue('speaker_repeat', 'track')
          break;
        default:
          this.logError(`onDeviceGetInfoEx() > LoopMode not found > ${data['LoopMode']}`)
          break;
      }

      this.setCapabilityValue('speaker_duration', this.#convertTimeToNumber(data['TrackDuration']))
      this.setCapabilityValue('speaker_position', this.#convertTimeToNumber(data['RelTime']))

      this.setCapabilityValue('volume_set', data['CurrentVolume'] / 100)
      this.setCapabilityValue('volume_mute', data['CurrentMute'] === '1' ? true : false)

      if (data.CurrentTransportState !== 'NO_MEDIA_PRESENT' && typeof data.TrackMetaData === 'object') {
        const artist = data.TrackMetaData['dc:subtitle'] ? data.TrackMetaData['dc:title'] : `${data.TrackMetaData['upnp:artist']}, ${data.TrackMetaData['upnp:album']}`
        this.setCapabilityValue('speaker_artist', String(artist))

        const album = data.TrackMetaData['dc:subtitle'] ? data.TrackMetaData['dc:title'] : data.TrackMetaData['upnp:album']
        this.setCapabilityValue('speaker_album', String(album))

        const track = data.TrackMetaData['dc:subtitle'] ? data.TrackMetaData['dc:subtitle'] : data.TrackMetaData['dc:title']
        this.setCapabilityValue('speaker_track', String(track))

        if (this.#currentAlbumURI !== data.TrackMetaData['upnp:albumArtURI']) {
          this.#currentAlbumURI = data.TrackMetaData['upnp:albumArtURI']
          this.logDebug(`onDeviceGetInfoEx() > AlbumArtImage > ${this.#currentAlbumURI}`)

          this.#albumArtImage.setStream((stream) => {
            const func = this.#currentAlbumURI.startsWith('https://') ? https.get : http.get
            func(this.#currentAlbumURI, (res) => { res.pipe(stream) })
              .on('error', (err) => { throw err });
          })
          this.#albumArtImage.update()
            .catch((err) => this.logError(`onDeviceGetInfoEx() > AlbumArtImage > ${err.message}`));
        }
      } else {
        this.logDebug(`onDeviceGetInfoEx() > TrackMetaData doesn't exist`)

        this.setCapabilityValue('speaker_artist', '')
        this.setCapabilityValue('speaker_album', '')
        this.setCapabilityValue('speaker_track', '')

        if (this.#currentAlbumURI !== null) {
          this.#currentAlbumURI = null
          this.#albumArtImage.setUrl(this.#currentAlbumURI)
          this.#albumArtImage.update()
            .catch((err) => this.logError(`onDeviceGetInfoEx() > AlbumArtImage > ${err.message}`));
        }
      }
    } catch (err) {
      this.logError(`onDeviceGetInfoEx() > ${err.message} > ${JSON.stringify(value)}`)
    }
  }

  // Helper

  #convertToLoopMode(shuffle, repeat) {
    let loopMode = '??' // DummyVal

    if (shuffle === true && repeat === 'none') {
      loopMode = '3'
    } else if (shuffle === true && repeat === 'playlist') {
      loopMode = '2'
    } else if (shuffle === true && repeat === 'track') {
      loopMode = '5'
    } else if (shuffle === false && repeat === 'none') {
      loopMode = '4'
    } else if (shuffle === false && repeat === 'playlist') {
      loopMode = '0'
    } else if (shuffle === false && repeat === 'track') {
      loopMode = '1'
    }

    return loopMode
  }

  #convertTimeToNumber(time) {
    const val = time.split(':')
    return val[0] * 216000 + val[1] * 3600 + val[2] * 60
  }

  #convertXmlToJSON(val) {
    const nativeType = function (value) {
      let nValue = Number(value);
      if (!isNaN(nValue)) {
        return nValue;
      }
      let bValue = value.toLowerCase();
      if (bValue === 'true') {
        return true;
      } else if (bValue === 'false') {
        return false;
      }
      return value;
    }
    const removeJsonTextAttribute = function (value, parentElement) {
      try {
        const parentOfParent = parentElement._parent;
        const pOpKeys = Object.keys(parentElement._parent);
        const keyNo = pOpKeys.length;
        const keyName = pOpKeys[keyNo - 1];
        const arrOfKey = parentElement._parent[keyName];
        const arrOfKeyLen = arrOfKey.length;
        if (arrOfKeyLen > 0) {
          const arr = arrOfKey;
          const arrIndex = arrOfKey.length - 1;
          arr[arrIndex] = value;
        } else {
          parentElement._parent[keyName] = nativeType(value);
        }
      } catch (e) { }
    };

    const options = {
      compact: true,
      nativeType: false,
      compact: true,
      trim: true,
      ignoreDeclaration: true,
      ignoreInstruction: true,
      ignoreAttributes: true,
      ignoreComment: true,
      ignoreCdata: true,
      ignoreDoctype: true,
      textFn: removeJsonTextAttribute
    };

    return JSON.parse(convert.xml2json(val, options).replaceAll(':{}', ':""'))
  }

};
