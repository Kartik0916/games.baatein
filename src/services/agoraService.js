import { RtcEngine, ChannelProfile, ClientRole } from 'react-native-agora';

class AgoraService {
  engine = null;
  channelName = null;
  uid = 0;
  isJoined = false;
  listeners = {};

  async initialize(appId) {
    try {
      this.engine = await RtcEngine.create(appId);
      
      // Set channel profile
      await this.engine.setChannelProfile(ChannelProfile.Communication);
      
      // Enable audio and video
      await this.engine.enableAudio();
      await this.engine.enableVideo();
      
      // Set video encoder configuration
      await this.engine.setVideoEncoderConfiguration({
        dimensions: { width: 640, height: 480 },
        frameRate: 15,
        bitrate: 0,
        minBitrate: -1,
        orientationMode: 0
      });

      this.setupEventListeners();
      
      console.log('✅ Agora initialized');
      return true;
    } catch (error) {
      console.error('❌ Agora initialization failed:', error);
      return false;
    }
  }

  setupEventListeners() {
    this.engine.addListener('Warning', (warn) => {
      console.log('⚠️ Agora Warning:', warn);
    });

    this.engine.addListener('Error', (err) => {
      console.error('❌ Agora Error:', err);
      if (this.listeners.onError) {
        this.listeners.onError(err);
      }
    });

    this.engine.addListener('UserJoined', (uid, elapsed) => {
      console.log('👤 User joined:', uid);
      if (this.listeners.onUserJoined) {
        this.listeners.onUserJoined(uid);
      }
    });

    this.engine.addListener('UserOffline', (uid, reason) => {
      console.log('👤 User offline:', uid, reason);
      if (this.listeners.onUserOffline) {
        this.listeners.onUserOffline(uid);
      }
    });

    this.engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('✅ Joined channel:', channel, uid);
      this.isJoined = true;
      if (this.listeners.onJoinSuccess) {
        this.listeners.onJoinSuccess(channel, uid);
      }
    });

    this.engine.addListener('LeaveChannel', (stats) => {
      console.log('🔌 Left channel:', stats);
      this.isJoined = false;
      if (this.listeners.onLeaveChannel) {
        this.listeners.onLeaveChannel(stats);
      }
    });

    this.engine.addListener('RemoteVideoStateChanged', (uid, state, reason, elapsed) => {
      console.log('📹 Remote video state changed:', uid, state, reason);
      if (this.listeners.onRemoteVideoStateChanged) {
        this.listeners.onRemoteVideoStateChanged(uid, state);
      }
    });

    this.engine.addListener('RemoteAudioStateChanged', (uid, state, reason, elapsed) => {
      console.log('🔊 Remote audio state changed:', uid, state, reason);
      if (this.listeners.onRemoteAudioStateChanged) {
        this.listeners.onRemoteAudioStateChanged(uid, state);
      }
    });
  }

  addEventListener(eventName, callback) {
    this.listeners[eventName] = callback;
  }

  removeEventListener(eventName) {
    delete this.listeners[eventName];
  }

  async joinChannel(token, channelName, uid = 0) {
    try {
      if (!this.engine) {
        throw new Error('Agora engine not initialized');
      }

      this.channelName = channelName;
      this.uid = uid;

      await this.engine.joinChannel(token, channelName, null, uid);
      console.log('📞 Joining channel:', channelName, 'with uid:', uid);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      return false;
    }
  }

  async leaveChannel() {
    try {
      if (this.engine && this.isJoined) {
        await this.engine.leaveChannel();
        this.channelName = null;
        this.isJoined = false;
        console.log('🔌 Left channel');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      return false;
    }
  }

  async switchCamera() {
    try {
      await this.engine.switchCamera();
      console.log('📷 Camera switched');
      return true;
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      return false;
    }
  }

  async muteLocalAudio(muted) {
    try {
      await this.engine.muteLocalAudioStream(muted);
      console.log('🔇 Local audio muted:', muted);
      return true;
    } catch (error) {
      console.error('❌ Failed to mute audio:', error);
      return false;
    }
  }

  async muteLocalVideo(muted) {
    try {
      await this.engine.muteLocalVideoStream(muted);
      console.log('📹 Local video muted:', muted);
      return true;
    } catch (error) {
      console.error('❌ Failed to mute video:', error);
      return false;
    }
  }

  async enableSpeakerphone(enabled) {
    try {
      await this.engine.setEnableSpeakerphone(enabled);
      console.log('🔊 Speakerphone enabled:', enabled);
      return true;
    } catch (error) {
      console.error('❌ Failed to enable speakerphone:', error);
      return false;
    }
  }

  async setAudioVolume(volume) {
    try {
      await this.engine.adjustRecordingSignalVolume(volume);
      console.log('🔊 Audio volume set:', volume);
      return true;
    } catch (error) {
      console.error('❌ Failed to set volume:', error);
      return false;
    }
  }

  async destroy() {
    try {
      if (this.isJoined) {
        await this.leaveChannel();
      }
      if (this.engine) {
        await RtcEngine.destroy();
        this.engine = null;
        this.listeners = {};
        console.log('🗑️ Agora destroyed');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to destroy Agora:', error);
      return false;
    }
  }

  getEngine() {
    return this.engine;
  }

  isInChannel() {
    return this.isJoined;
  }

  getCurrentChannel() {
    return this.channelName;
  }

  getCurrentUid() {
    return this.uid;
  }
}

export default new AgoraService();