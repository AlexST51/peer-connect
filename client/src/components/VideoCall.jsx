import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';

export function VideoCall({ contact, onEndCall }) {
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Safety check
  if (!contact) {
    console.error('VideoCall: contact is null or undefined');
    onEndCall();
    return null;
  }
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState('en');

  const {
    localStream,
    remoteStream,
    isCallActive,
    callStatus,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useWebRTC(user?.id);

  // Temporarily disable translation to fix video call
  const subtitles = [];
  const isTranslating = false;
  const translationError = null;
  const startTranslation = () => {};
  const stopTranslation = () => {};
  
  // const {
  //   subtitles,
  //   isTranslating,
  //   error: translationError,
  //   startTranslation,
  //   stopTranslation,
  // } = useTranslation(localStream, targetLanguage);

  // Set up video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start translation when call is active (disabled for now)
  // useEffect(() => {
  //   if (isCallActive && localStream && !isTranslating) {
  //     startTranslation();
  //   }
  // }, [isCallActive, localStream, isTranslating, startTranslation]);

  const handleEndCall = () => {
    stopTranslation();
    endCall();
    onEndCall();
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setIsAudioEnabled(enabled);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl text-gray-400">
                    {contact?.displayName?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <p className="text-white text-lg">{contact?.displayName}</p>
                <p className="text-gray-400 text-sm mt-2">
                  {callStatus === 'calling' && 'Calling...'}
                  {callStatus === 'ringing' && 'Ringing...'}
                  {callStatus === 'connecting' && 'Connecting...'}
                  {callStatus === 'connected' && 'Connected'}
                </p>
              </div>
            </div>
          )}

          {/* Subtitles Overlay */}
          {subtitles.length > 0 && (
            <div className="absolute bottom-20 left-0 right-0 px-8">
              <div className="max-w-4xl mx-auto space-y-2">
                {subtitles.slice(-3).map((subtitle) => (
                  <div
                    key={subtitle.id}
                    className={`px-4 py-2 rounded-lg ${
                      subtitle.type === 'original'
                        ? 'bg-blue-600/80'
                        : 'bg-green-600/80'
                    } backdrop-blur-sm`}
                  >
                    <p className="text-white text-lg font-medium text-center">
                      {subtitle.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {translationError && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg">
              Translation error: {translationError}
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400">No video</span>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="absolute top-4 left-4">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-gray-800/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
          {/* Toggle Video */}
          <button
            onClick={handleToggleVideo}
            className={`p-4 rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isVideoEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              )}
            </svg>
          </button>

          {/* Toggle Audio */}
          <button
            onClick={handleToggleAudio}
            className={`p-4 rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isAudioEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              )}
            </svg>
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            title="End call"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
              />
            </svg>
          </button>

          {/* Translation Status */}
          <div className="ml-4 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isTranslating ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-400">
              {isTranslating ? 'Translating' : 'Translation off'}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
