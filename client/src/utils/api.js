const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Contact endpoints
  async searchUsers(query) {
    return this.request(`/contacts/search?query=${encodeURIComponent(query)}`);
  }

  async sendContactRequest(contactId) {
    return this.request('/contacts/request', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  }

  async getPendingRequests() {
    return this.request('/contacts/requests/pending');
  }

  async getSentRequests() {
    return this.request('/contacts/requests/sent');
  }

  async cancelContactRequest(requestId) {
    return this.request(`/contacts/request/${requestId}/cancel`, {
      method: 'DELETE',
    });
  }

  async acceptContactRequest(requestId) {
    return this.request(`/contacts/request/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async rejectContactRequest(requestId) {
    return this.request(`/contacts/request/${requestId}/reject`, {
      method: 'POST',
    });
  }

  async getContacts() {
    return this.request('/contacts/list');
  }

  async removeContact(contactId) {
    return this.request(`/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async sendMessage(recipientId, text, imageUrl = null, messageType = 'text') {
    return this.request('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ recipientId, text, imageUrl, messageType }),
    });
  }

  async getConversation(contactId, limit = 50) {
    return this.request(`/messages/conversation/${contactId}?limit=${limit}`);
  }

  async markMessagesAsRead(contactId) {
    return this.request(`/messages/mark-read/${contactId}`, {
      method: 'POST',
    });
  }

  async getUnreadCounts() {
    return this.request('/messages/unread-count');
  }

  // Language preference
  async updateLanguage(language) {
    return this.request('/auth/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    });
  }

  // Upload endpoints
  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/upload/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }

  async uploadChatImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/upload/chat-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }
}

export const api = new ApiClient();
