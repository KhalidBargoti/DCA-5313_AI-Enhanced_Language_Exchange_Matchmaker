import { GoogleGenerativeAI } from "@google/generative-ai";
import { assertParticipant, assertAIAllowed } from "../Service/privacyService.js";
import aiAssistantService from "../Service/aiAssistantService.js";
import { callPartnerMatching, callSummarizePracticeSession, createMcpClient } from "../mcp/client.js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const conversationStore = new Map();

/**
 * Convert a local file buffer (like one from a multipart form) into a GenerativePart object.
 * @param {Buffer} buffer The file buffer (e.g., req.files.audioFile.data).
 * @param {string} mimeType The file's MIME type (e.g., req.files.audioFile.mimetype).
 * @returns {Part} A Part object for the Gemini API.
 */
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

/**
 * Format mcp tool results into user-friendly text
 */
function formatToolResponse(toolName, result) {
  if (result.error) {
    return `I encountered an error while using ${toolName}: ${result.error}`;
  }

  if (toolName === "partnerMatching") {
    if (!result.matches || result.matches.length === 0) {
      return "I couldn't find any compatible practice partners at the moment. Try adjusting your search criteria or check back later!";
    }

    let response = `I found ${result.matches.length} compatible practice partner${result.matches.length > 1 ? "s" : ""} for you:\n\n`;
    
    result.matches.forEach((match, index) => {
      response += `${index + 1}. **${match.firstName} ${match.lastName}**\n`;
      response += `   - Age: ${match.age || "Not specified"}\n`;
      response += `   - Gender: ${match.gender || "Not specified"}\n`;
      if (match.profession) {
        response += `   - Profession: ${match.profession}\n`;
      }
      response += `   - Native Language: ${match.nativeLanguage}\n`;
      response += `   - Learning: ${match.targetLanguage} (${match.targetLanguageProficiency || "Not specified"})\n`;
      if (match.sharedInterests && match.sharedInterests.length > 0) {
        response += `   - Shared Interests: ${match.sharedInterests.join(", ")}\n`;
      }
      if (match.mbti) {
        response += `   - MBTI: ${match.mbti}\n`;
      }
      if (match.zodiac) {
        response += `   - Zodiac: ${match.zodiac}\n`;
      }
      response += `   - Compatibility Score: ${match.compatibilityScore}\n\n`;
    });

    return response;
  }

  if (toolName === "summarizePracticeSession") {
    // TODO: temporary placeholder for now
    return `Practice session summary: ${JSON.stringify(result, null, 2)}`;
  }

  return `Result from ${toolName}: ${JSON.stringify(result, null, 2)}`;
}

/**
 * Extract criteria from user message using Gemini
 */
async function extractCriteria(userMessage) {
  const criteriaPrompt = `
    Analyze this user message and extract any specific criteria they mention for finding practice partners.
    Look for mentions of zodiac signs or MBTI types.
    Respond with ONLY valid JSON:
    {"zodiac": "sign" or null, "mbti": "type" or null}
    
    User message: "${userMessage}"
  `;

  try {
    const response = await model.generateContent(criteriaPrompt);
    const text = response.response.text().trim();
    // Remove markdown code blocks
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      zodiac: parsed.zodiac || null,
      mbti: parsed.mbti || null,
    };
  } catch (error) {
    console.error("Error extracting user search criteria:", error);
    return { zodiac: null, mbti: null };
  }
}

/**
 * Check if user wants to use partnerMatching tool
 */
async function shouldUsePartnerMatching(userMessage) {
  const checkPrompt = `
    Does the user want to find, match with, search for, or get recommendations for OTHER PEOPLE to practice with (practice partners, language exchange partners, conversation partners)?
    
    Answer "yes" ONLY if they are explicitly looking to connect with other users or people.
    Answer "no" if they are asking for:
    - Help with language learning activities (reading, writing, grammar, vocabulary)
    - Translation assistance
    - Learning tips or advice
    - General conversation or questions
    - Practice exercises or materials
    
    Respond with ONLY "yes" or "no".
    
    User message: "${userMessage}"
  `;

  try {
    const response = await model.generateContent(checkPrompt);
    const text = response.response.text().trim().toLowerCase();
    return text.includes("yes");
  } catch (error) {
    console.error("Error checking partner matching intent:", error);
    return false;
  }
}

/**
 * Check if user wants to summarize a practice session
 */
async function shouldSummarizeSession(userMessage) {
  const checkPrompt = `
    Does the user want to summarize, review, or get a summary of a practice session or conversation they had with another user?
    Answer "yes" ONLY if they are explicitly looking to get a summary of a practice session or conversation.
    Answer "no" if they are asking for:
    - Help with language learning activities (reading, writing, grammar, vocabulary)
    - Translation assistance
    - Learning tips or advice
    - General conversation or questions
    - Practice exercises or materials
    
    Respond with ONLY "yes" or "no".
    
    User message: "${userMessage}"
  `;

  try {
    const response = await model.generateContent(checkPrompt);
    const text = response.response.text().trim().toLowerCase();
    return text.includes("yes");
  } catch (error) {
    console.error("Error checking summarize intent:", error);
    return false;
  }
}

/**
 * Converts the application's conversation history objects into the
 * structured array format required by the Google Generative AI SDK.
 * @param {Array<Object>} messages - Array of message objects {role: string, content: string}
 * @returns {Array<Object>} Formatted history for the Gemini API.
 */
function formatHistory(messages) {
    return messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
    }));
}

/**
 * Extract chatId from user message
 */
async function extractChatId(userMessage) {
  const extractPrompt = `
    Extract any numeric chat ID or conversation ID from this message.
    Respond with ONLY the number, or "null" if no ID is found.
    
    User message: "${userMessage}"
  `;

  try {
      const response = await model.generateContent(extractPrompt);
      const text = response.response.text().trim();
      const chatId = parseInt(text);
      return isNaN(chatId) ? null : chatId;
  } catch (error) {
      console.error("Error extracting chatId:", error);
      return null;
  }
}

export async function chatWithAssistant(req, res) {
  try {
    const { message, userId } = req.body;
    const audioFile = req.file;
    if ((!message && !audioFile) || !userId) {
      return res.status(400).json({ error: "Missing message/audio or userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ 
        error: "Invalid userId", 
        details: `userId must be a number, got: ${userId} (type: ${typeof userId})` 
      });
    }

    let userMessage = message || "[Audio Message]"; // Use placeholder if only audio is sent
    
    console.log(`[AI Assistant] User ${numericUserId} sent message: "${userMessage}"`);

    // Initialize conversation store for user if not exists
    let conversation = conversationStore.get(numericUserId);
    if (!conversation) {
      conversation = {
        messages: [],
        state: null,
        pendingData: {},
        chatId: null // Track if this is a continuation of an existing conversation
      };
      conversationStore.set(numericUserId, conversation);
    }
    
    // Store user's text or placeholder message in history
    conversation.messages.push({ role: "user", content: userMessage });

    let reply;
    let toolUsed = null;
    let toolResult = null;
    
    const wantsPartnerMatching = await shouldUsePartnerMatching(userMessage);
    const wantsSummarize = await shouldSummarizeSession(userMessage);

    if (wantsPartnerMatching || wantsSummarize) {
        if (wantsPartnerMatching) {
            toolUsed = "partnerMatching";
            const criteria = await extractCriteria(userMessage);
            console.log(`[AI Assistant] Calling partnerMatching for user ${numericUserId} with criteria:`, criteria);
            toolResult = await callPartnerMatching(numericUserId, criteria);
            console.log(`[AI Assistant] partnerMatching result:`, toolResult);
            reply = formatToolResponse("partnerMatching", toolResult);
        } else if (wantsSummarize) {
            const chatId = await extractChatId(userMessage);
            if (chatId) {
                try {
                    // Check privacy permissions
                    await assertParticipant(chatId, numericUserId);
                    await assertAIAllowed(chatId);

                    toolUsed = "summarizePracticeSession";
                    const client = await createMcpClient();
                    toolResult = await callSummarizePracticeSession(chatId, numericUserId);
                    const modelResponse = await model.generateContent(toolResult.prompt);
                    reply = modelResponse.response.text();
                } catch (error) {
                    console.error("Error summarizing practice session:", error);
                    reply = "I ran into an issue while trying to summarize that session. Please check the chat ID and permissions.";
                }
            } else {
                reply = "I'd be happy to summarize a practice session! Could you please provide the chat ID from that practice session?";
            }
        }
    } else {
      // Regular conversational response
      const chatHistory = conversation.messages
        .slice(-10) // Last 10 messages for context
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");
        
      const systemInstruction = `You are a helpful AI assistant for a language exchange app, where students learning a foreign language are able to practice speaking with students who are native speakers, and both students are able to learn from eath other. Help users find practice partners, answer questions about language learning, summarize their practice sessions, and assist with translation.`;

      const historyForModel = formatHistory(
        conversation.messages.slice(0, -1).slice(-10) // up to the last 10 messages before current
      );

      // --- Construct the current user message (input) ---
      let userParts = [];
      
      if (audioFile) {
          // Assuming memory storage: audioFile.buffer
          const audioPart = fileToGenerativePart(audioFile.buffer, audioFile.mimetype); 
          userParts.push(audioPart);
      }
      
      // Add Text Part
      userParts.push({ text: userMessage }); 

      // --- CONSTRUCT FINAL CONTENTS ARRAY ---
      
      // 1. Prepend the System Instruction as the first message turn (Workaround for older SDK)
      const contents = [
          { 
              role: "user", 
              parts: [{ text: systemInstruction }] 
          },
          { 
              role: "model", 
              parts: [{ text: "Acknowledged." }] // Optional acknowledgment turn
          },
          ...historyForModel, // Previous turns (after system prompt)
          { role: "user", parts: userParts } // Current user turn (Audio + Text)
      ];

      // Call the model using the structured approach, but WITHOUT the config object
      const aiResponse = await model.generateContent({
          contents: contents
          // 🛑 REMOVED: config: { systemInstruction: systemInstruction }
      });
      
      reply = aiResponse.response.text();
    }
    
    // Store assistant's reply in conversation history
    conversation.messages.push({ role: "assistant", content: reply });
    
    return res.json({ reply });
  } catch (err) {
    console.error("chatWithAssistant error:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Save conversation to database (called after user confirms)
 */
export async function saveConversation(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const conversation = conversationStore.get(numericUserId);
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return res.status(404).json({ error: "No conversation found to save" });
    }

    // Check if this is a continuation of an existing conversation
    if (conversation.chatId) {
      // Update existing conversation
      await aiAssistantService.handleUpdateAIChat(conversation.chatId, {
        conversation: conversation,
      });
    } else {
      // Create new conversation
      await aiAssistantService.handleSaveAIChat(numericUserId, {
        conversation: conversation,
      });
    }

    // Clear the conversation from memory
    conversationStore.delete(numericUserId);

    return res.json({ message: "Conversation saved successfully" });
  } catch (err) {
    console.error("saveConversation error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function clearConversation(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    conversationStore.delete(numericUserId);

    return res.json({ message: "Conversation cleared" });
  } catch (err) {
    console.error("clearConversation error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getConversation(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
            console.log(result);
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const conversation = conversationStore.get(numericUserId) || [];

    return res.json({ conversation });
  } catch (err) {
    console.error("getConversation error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function loadConversationFromDB(req, res) {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "Missing chatId or userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    const numericChatId = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;
    
    if (isNaN(numericUserId) || isNaN(numericChatId)) {
      return res.status(400).json({ error: "Invalid userId or chatId" });
    }

    // Fetch the conversation from database
    const result = await aiAssistantService.handleGetAIChatById(numericChatId);
    const chat = result.data;

    // Verify the conversation belongs to the user
    if (chat.userId !== numericUserId) {
      return res.status(403).json({ error: "Unauthorized access to conversation" });
    }

    // Parse the conversation
    let parsedConversation;
    try {
      parsedConversation = JSON.parse(chat.conversation);
    } catch (err) {
      parsedConversation = chat.conversation; // fallback
    }

    // Extract messages array from parsed conversation
    let messages = [];
    if (Array.isArray(parsedConversation)) {
      messages = parsedConversation;
    } else if (parsedConversation && typeof parsedConversation === "object") {
      if (parsedConversation.conversation) {
        const innerConv = parsedConversation.conversation;
        if (Array.isArray(innerConv)) {
          messages = innerConv;
        } else if (innerConv.messages && Array.isArray(innerConv.messages)) {
          messages = innerConv.messages;
        }
      } else if (parsedConversation.messages && Array.isArray(parsedConversation.messages)) {
        messages = parsedConversation.messages;
      }
    }

    // Load into conversationStore
    const conversation = {
      messages: messages,
      state: null,
      pendingData: {},
      chatId: numericChatId // Track that this is a continuation
    };
    conversationStore.set(numericUserId, conversation);

    return res.json({ 
      message: "Conversation loaded successfully",
      conversation: conversation
    });
  } catch (err) {
    console.error("loadConversationFromDB error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getAllAIChats(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // Fetch previous AI conversations
    const result = await aiAssistantService.handleGetAIChats(numericUserId);

    // Parse JSON string conversations into objects
    const parsedChats = result.data.map((chat) => {
      let parsedConversation;
      try {
        parsedConversation = JSON.parse(chat.conversation);
      } catch (err) {
        parsedConversation = chat.conversation; // fallback
      }

      return {
        id: chat.id,
        userId: chat.userId,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        conversation: parsedConversation,
      };
    });

    return res.json({
      message: result.errMessage,
      chats: parsedChats,
    });
  } catch (err) {
    console.error("getAllAIChats error:", err);
    res.status(500).json({ error: err.message });
  }
}
