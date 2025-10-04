import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { socket } from '../utils/socket';

export function Chat({ contact, onClose, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMessages();
    markAsRead();

    // Set up socket listeners
    const handleNewMessageWrapper = (message) => handleNewMessage(message);
    const handleTypingWrapper = (data) => handleTyping(data);
    const handleStopTypingWrapper = (data) => handleStopTyping(data);

    socket.on('new-message', handleNewMessageWrapper);
    socket.on('user-typing', handleTypingWrapper);
    socket.on('user-stop-typing', handleStopTypingWrapper);

    return () => {
      socket.off('new-message', handleNewMessageWrapper);
      socket.off('user-typing', handleTypingWrapper);
      socket.off('user-stop-typing', handleStopTypingWrapper);
    };
  }, [contact.userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.getConversation(contact.userId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const markAsRead = async () => {
    try {
      await api.markMessagesAsRead(contact.userId);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  const handleNewMessage = (message) => {
    if (message.sender_id === contact.userId || message.recipient_id === contact.userId) {
      setMessages(prev => [...prev, message]);
      if (message.sender_id === contact.userId) {
        markAsRead();
      }
    }
  };

  const handleTyping = ({ userId }) => {
    if (userId === contact.userId) {
      setIsTyping(true);
    }
  };

  const handleStopTyping = ({ userId }) => {
    if (userId === contact.userId) {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { to: contact.userId });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { to: contact.userId });
    }, 1000);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedImage) || loading) return;

    setLoading(true);
    const messageText = newMessage;
    const imageFile = selectedImage;
    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);

    socket.emit('stop-typing', { to: contact.userId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      let imageUrl = null;
      let messageType = 'text';

      if (imageFile) {
        const uploadResult = await api.uploadChatImage(imageFile);
        imageUrl = uploadResult.imageUrl;
        messageType = 'image';
      }

      const message = await api.sendMessage(
        contact.userId, 
        messageText || '', 
        imageUrl, 
        messageType
      );
      setMessages(prev => [...prev, message]);
      socket.emit('send-message', { to: contact.userId, message });
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageText);
      if (imageFile) {
        setSelectedImage(imageFile);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(imageFile);
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:max-w-2xl sm:h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between rounded-t-lg border-b">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {contact.displayName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{contact.displayName}</h2>
              <p className="text-sm text-gray-500">
                {isTyping ? 'typing...' : contact.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            
            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-lg px-4 py-2 ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow'}`}>
                    {/* Image message */}
                    {message.message_type === 'image' && message.image_url && (
                      <img src={message.image_url} alt="Shared image" className="max-w-full rounded-lg mb-2" />
                    )}
                    
                    {/* Text message */}
                    {message.message_type === 'text' && (
                      <>
                        {message.original_text !== message.translated_text && !isOwnMessage && (
                          <p className="text-sm opacity-75 italic mb-1">{message.original_text}</p>
                        )}
                        <p className="text-base">
                          {isOwnMessage ? message.original_text : message.translated_text}
                        </p>
                      </>
                    )}
                    
                    {/* Caption for image */}
                    {message.message_type === 'image' && message.original_text && (
                      <p className="text-sm mt-2">{message.original_text}</p>
                    )}
                    
                    {/* Language indicator and time */}
                    <div className="flex items-center justify-between mt-1 gap-2">
                      {!isOwnMessage && message.original_language && message.original_language !== 'en' && (
                        <span className="text-xs opacity-75">{message.original_language.toUpperCase()}</span>
                      )}
                      <span className={`text-xs ${isOwnMessage ? 'opacity-75' : 'text-gray-500'} ml-auto`}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 rounded-b-lg">
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 transition-colors text-lg"
              title="Upload image"
            >
              📎
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm sm:text-base"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || (!newMessage.trim() && !selectedImage)}
              className="flex-shrink-0 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Messages are automatically translated to your preferred language
          </p>
        </div>
      </div>
    </div>
  );
}
