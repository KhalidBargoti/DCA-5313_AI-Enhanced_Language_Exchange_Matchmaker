import axios from '../Utils/axios';

/**
 * Query the AI assistant
 * @param {string} message
 * @param {number} userId
 * @returns {Promise} AI response
 */
const handleChatWithAssistant = (message, userId) => {
    return axios.post('/api/v1/ai-assistant/chat', {
        message: message,
        userId: userId
    });
};

/**
 * Save the current conversation to the database
 * @param {number} userId
 * @returns {Promise} saved confirmation message
 */
const handleSaveConversation = (userId) => {
    return axios.post('/api/v1/ai-assistant/save', {
        userId: userId
    });
};

/**
 * Clear the current conversation from memory (without saving)
 * @param {number} userId
 * @returns {Promise} cleared successfully confirmation message
 */
const handleClearConversation = (userId) => {
    return axios.post('/api/v1/ai-assistant/clear', {
        userId: userId
    });
};

/**
 * Get the current conversation from memory
 * @param {number} userId
 * @returns {Promise} Response with the conversation array
 */
const handleGetConversation = (userId) => {
    return axios.get(`/api/v1/ai-assistant/conversation/${userId}`);
};

/**
 * Get the current conversation from memory
 * @param {number} userId
 * @returns {Promise} Response with the conversation array
 */
const handleGetAllAIChats = (userId) => {
    return axios.get(`/api/v1/ai-assistant/history/${userId}`);
};

export {
    handleChatWithAssistant,
    handleSaveConversation,
    handleClearConversation,
    handleGetConversation,
    handleGetAllAIChats
};
