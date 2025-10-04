import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { api } from '../utils/api';
import { socket } from '../utils/socket';
import { VideoCall } from './VideoCall';
import { Chat } from './Chat';
import { QRCodeSVG } from 'qrcode.react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('contacts'); // contacts, requests, search
  const [showQR, setShowQR] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const webRTCHook = useWebRTC(user?.id);
  const { incomingCall, startCall, acceptCall, rejectCall, localStream, remoteStream, isCallActive, callStatus, endCall, toggleVideo, toggleAudio } = webRTCHook;
  
  // Log incoming call for debugging
  useEffect(() => {
    if (incomingCall) {
      console.log('🔔 INCOMING CALL DETECTED IN DASHBOARD:', incomingCall);
      alert(`Incoming call from user ID: ${incomingCall.from}`);
    }
  }, [incomingCall]);

  // Load contacts and requests
  useEffect(() => {
    loadContacts();
    loadPendingRequests();
    loadSentRequests();
  }, []);

  // Handle online/offline status updates and new messages
  useEffect(() => {
    const handleUserOnline = ({ userId }) => {
      console.log('User came online:', userId);
      setContacts(prev =>
        prev.map(contact =>
          contact.userId === userId ? { ...contact, isOnline: true } : contact
        )
      );
    };

    const handleUserOffline = ({ userId }) => {
      console.log('User went offline:', userId);
      setContacts(prev =>
        prev.map(contact =>
          contact.userId === userId ? { ...contact, isOnline: false } : contact
        )
      );
    };

    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      // Reload unread counts when new message arrives
      loadUnreadCounts();
    };

    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
      socket.off('new-message', handleNewMessage);
    };
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const data = await api.getPendingRequests();
      setPendingRequests(data);
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  };

  const loadSentRequests = async () => {
    try {
      const data = await api.getSentRequests();
      setSentRequests(data);
    } catch (err) {
      console.error('Failed to load sent requests:', err);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const results = await api.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (contactId) => {
    try {
      await api.sendContactRequest(contactId);
      setSearchResults(prev => prev.filter(user => user.id !== contactId));
      setError('');
      // Show success message
      alert('Contact request sent! They will appear in your contacts once they accept.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptContactRequest(requestId);
      await loadContacts();
      await loadPendingRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectContactRequest(requestId);
      await loadPendingRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartCall = async (contact) => {
    try {
      setError(''); // Clear any previous errors
      await startCall(contact.userId);
      setActiveCall(contact); // Only set after call is initiated
    } catch (err) {
      setError(err.message || 'Failed to start call');
      setActiveCall(null);
      // Show alert for immediate feedback
      alert(err.message || 'Failed to start call. Please check your camera and microphone.');
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const handleAcceptIncomingCall = async () => {
    const caller = contacts.find(c => c.userId === incomingCall.from);
    if (caller) {
      try {
        setError('');
        setActiveCall(caller);
        await acceptCall();
      } catch (err) {
        setError(err.message || 'Failed to accept call');
        setActiveCall(null);
        alert(err.message || 'Failed to accept call. Please check your camera and microphone.');
      }
    }
  };

  const handleRejectIncomingCall = () => {
    rejectCall();
  };

  const handleStartChat = (contact) => {
    setActiveChat(contact);
  };

  const handleCloseChat = () => {
    setActiveChat(null);
    loadUnreadCounts();
  };

  const loadUnreadCounts = async () => {
    try {
      const counts = await api.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load unread counts:', err);
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      await api.updateLanguage(language);
      setShowLanguageSelector(false);
      alert(`Language preference updated to ${getLanguageName(language)}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const getLanguageName = (code) => {
    const languages = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      zh: 'Chinese',
      ja: 'Japanese',
      ar: 'Arabic',
      hi: 'Hindi',
      pt: 'Portuguese',
      ru: 'Russian',
      it: 'Italian',
      ko: 'Korean'
    };
    return languages[code] || code;
  };

  useEffect(() => {
    loadUnreadCounts();
  }, []);

  if (activeCall && (callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'connected' || callStatus === 'ringing')) {
    return <VideoCall 
      contact={activeCall} 
      onEndCall={handleEndCall}
      webRTC={webRTCHook}
    />;
  }

  if (activeChat) {
    return <Chat contact={activeChat} onClose={handleCloseChat} currentUserId={user?.id} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Peer-Connect</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Welcome, {user?.displayName}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 ml-4">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="px-2 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-base whitespace-nowrap"
              >
                🌐 <span className="hidden sm:inline">Language</span>
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">My QR Code</span>
                <span className="sm:hidden">QR</span>
              </button>
              <button
                onClick={logout}
                className="px-2 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-base"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-center">Select Your Language</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Messages will be automatically translated to your preferred language
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { code: 'en', name: 'English', flag: '🇬🇧' },
                { code: 'es', name: 'Spanish', flag: '🇪🇸' },
                { code: 'fr', name: 'French', flag: '🇫🇷' },
                { code: 'de', name: 'German', flag: '🇩🇪' },
                { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
                { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
                { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
                { code: 'ru', name: 'Russian', flag: '🇷🇺' },
                { code: 'it', name: 'Italian', flag: '🇮🇹' },
                { code: 'ko', name: 'Korean', flag: '🇰🇷' },
              ].map((lang) => {
                const isSelected = user?.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors border-2 ${
                      isSelected
                        ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
                        : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex flex-col items-start flex-1">
                      <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {lang.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-blue-600 font-semibold">✓ Selected</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowLanguageSelector(false)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">My QR Code</h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={user?.username || ''} size={200} />
            </div>
            <p className="text-center text-gray-600 mb-4">
              Username: <span className="font-bold">{user?.username}</span>
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Incoming Call</h3>
            <p className="text-center text-gray-600 mb-6">
              {contacts.find(c => c.userId === incomingCall.from)?.displayName || 'Unknown'} is calling...
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAcceptIncomingCall}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={handleRejectIncomingCall}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'contacts'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Contacts ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Requests ({pendingRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'search'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Add Contact
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No contacts yet. Add some contacts to start chatting!
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg">
                            {contact.displayName[0].toUpperCase()}
                          </div>
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              contact.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{contact.displayName}</p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">@{contact.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => handleStartChat(contact)}
                          className="relative flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          💬 <span className="hidden xs:inline">Chat</span>
                          {unreadCounts[contact.userId] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadCounts[contact.userId]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleStartCall(contact)}
                          disabled={!contact.isOnline}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
                        >
                          📞 <span className="hidden xs:inline">Call</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Incoming Requests */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Incoming Requests</h3>
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {request.displayName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.displayName}</p>
                              <p className="text-sm text-gray-500">@{request.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Sent Requests (Pending)</h3>
                    <div className="space-y-3">
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {request.displayName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.displayName}</p>
                              <p className="text-sm text-gray-500">@{request.username}</p>
                              <p className="text-xs text-blue-600 mt-1">Waiting for them to accept...</p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await api.cancelContactRequest(request.id);
                                await loadSentRequests();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Requests */}
                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No pending requests
                  </p>
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div>
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by username..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="space-y-4">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {user.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Contact
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
