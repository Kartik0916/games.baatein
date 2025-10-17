import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions
} from 'react-native';
import { RtcLocalView, RtcRemoteView } from 'react-native-agora';
import agoraService from '../services/agoraService';

const { width, height } = Dimensions.get('window');

const VideoCallView = ({
  channelName,
  uid,
  agoraAppId,
  agoraToken = null,
  style = 'floating', // 'floating', 'split', 'background'
  onUserJoined,
  onUserLeft
}) => {
  const [remoteUid, setRemoteUid] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeVideoCall();
    setupAgoraListeners();

    return () => {
      cleanup();
    };
  }, []);

  const initializeVideoCall = async () => {
    try {
      console.log('🎥 Initializing video call...');
      
      // Initialize Agora
      const success = await agoraService.initialize(agoraAppId);
      if (!success) {
        console.error('❌ Failed to initialize Agora');
        return;
      }

      // Join channel
      const joinSuccess = await agoraService.joinChannel(agoraToken, channelName, uid);
      if (joinSuccess) {
        setIsConnected(true);
        console.log('✅ Joined video channel:', channelName);
      }
    } catch (error) {
      console.error('❌ Video call initialization failed:', error);
    }
  };

  const setupAgoraListeners = () => {
    agoraService.addEventListener('onUserJoined', (uid) => {
      console.log('👤 Remote user joined video:', uid);
      setRemoteUid(uid);
      if (onUserJoined) {
        onUserJoined(uid);
      }
    });

    agoraService.addEventListener('onUserOffline', (uid) => {
      console.log('👤 Remote user left video:', uid);
      setRemoteUid(null);
      if (onUserLeft) {
        onUserLeft(uid);
      }
    });

    agoraService.addEventListener('onJoinSuccess', (channel, uid) => {
      console.log('✅ Video call connected:', channel, uid);
      setIsConnected(true);
    });

    agoraService.addEventListener('onLeaveChannel', () => {
      console.log('🔌 Video call disconnected');
      setIsConnected(false);
    });
  };

  const cleanup = async () => {
    try {
      await agoraService.leaveChannel();
      console.log('🧹 Video call cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up video call:', error);
    }
  };

  const toggleAudio = async () => {
    const muted = !isAudioMuted;
    const success = await agoraService.muteLocalAudio(muted);
    if (success) {
      setIsAudioMuted(muted);
      console.log('🔇 Audio toggled:', muted ? 'muted' : 'unmuted');
    }
  };

  const toggleVideo = async () => {
    const muted = !isVideoMuted;
    const success = await agoraService.muteLocalVideo(muted);
    if (success) {
      setIsVideoMuted(muted);
      console.log('📹 Video toggled:', muted ? 'muted' : 'unmuted');
    }
  };

  const switchCamera = async () => {
    try {
      await agoraService.switchCamera();
      console.log('📷 Camera switched');
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
    }
  };

  const renderFloatingVideo = () => {
    return (
      <View style={styles.floatingContainer}>
        {/* Remote Video - Main */}
        {remoteUid && (
          <View style={styles.remoteVideoMain}>
            <RtcRemoteView.SurfaceView
              style={styles.remoteVideoFull}
              uid={remoteUid}
              channelId={channelName}
              renderMode={1}
            />
          </View>
        )}

        {/* Local Video - Floating */}
        <View style={styles.localVideoFloating}>
          <RtcLocalView.SurfaceView
            style={styles.localVideoSmall}
            channelId={channelName}
            renderMode={1}
          />
          
          {/* Video Controls */}
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={[styles.controlButton, isAudioMuted && styles.mutedButton]}
              onPress={toggleAudio}
            >
              <Text style={styles.controlButtonText}>
                {isAudioMuted ? '🔇' : '🔊'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isVideoMuted && styles.mutedButton]}
              onPress={toggleVideo}
            >
              <Text style={styles.controlButtonText}>
                {isVideoMuted ? '📷' : '📹'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Text style={styles.controlButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionIndicator}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSplitVideo = () => {
    return (
      <View style={styles.splitContainer}>
        {/* Top Half - Remote Video */}
        <View style={styles.splitTop}>
          {remoteUid ? (
            <RtcRemoteView.SurfaceView
              style={styles.splitVideo}
              uid={remoteUid}
              channelId={channelName}
              renderMode={1}
            />
          ) : (
            <View style={[styles.splitVideo, styles.waitingView]}>
              <Text style={styles.waitingText}>Waiting for opponent...</Text>
            </View>
          )}
        </View>

        {/* Bottom Half - Local Video */}
        <View style={styles.splitBottom}>
          <RtcLocalView.SurfaceView
            style={styles.splitVideo}
            channelId={channelName}
            renderMode={1}
          />
          
          {/* Controls */}
          <View style={styles.splitControls}>
            <TouchableOpacity
              style={[styles.controlButton, isAudioMuted && styles.mutedButton]}
              onPress={toggleAudio}
            >
              <Text style={styles.controlButtonText}>
                {isAudioMuted ? '🔇' : '🔊'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isVideoMuted && styles.mutedButton]}
              onPress={toggleVideo}
            >
              <Text style={styles.controlButtonText}>
                {isVideoMuted ? '📷' : '📹'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Text style={styles.controlButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderBackgroundVideo = () => {
    return (
      <View style={styles.backgroundContainer}>
        {/* Background Video */}
        {remoteUid && (
          <RtcRemoteView.SurfaceView
            style={styles.backgroundVideo}
            uid={remoteUid}
            channelId={channelName}
            renderMode={2}
          />
        )}
        
        {/* Overlay */}
        <View style={styles.videoOverlay} />
      </View>
    );
  };

  if (style === 'floating') {
    return renderFloatingVideo();
  } else if (style === 'split') {
    return renderSplitVideo();
  } else if (style === 'background') {
    return renderBackgroundVideo();
  }

  return null;
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    marginBottom: 20
  },
  remoteVideoMain: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4ECDC4'
  },
  remoteVideoFull: {
    width: '100%',
    height: '100%'
  },
  localVideoFloating: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B6B'
  },
  localVideoSmall: {
    width: '100%',
    height: '70%'
  },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4
  },
  controlButton: {
    padding: 4
  },
  mutedButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 4
  },
  controlButtonText: {
    fontSize: 12,
    color: '#fff'
  },
  connectionIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  splitContainer: {
    width: '100%',
    height: 300,
    marginBottom: 20
  },
  splitTop: {
    flex: 1,
    marginBottom: 5
  },
  splitBottom: {
    flex: 1,
    position: 'relative'
  },
  splitVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden'
  },
  waitingView: {
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed'
  },
  waitingText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '500'
  },
  splitControls: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1
  },
  backgroundVideo: {
    width: '100%',
    height: '100%'
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.3)'
  }
});

export default VideoCallView;
