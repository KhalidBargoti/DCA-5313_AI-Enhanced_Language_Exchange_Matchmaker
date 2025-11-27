import { GoogleGenerativeAI } from "@google/generative-ai";
import { assertParticipant, assertAIAllowed } from "../Service/privacyService.js";
import aiAssistantService from "../Service/aiAssistantService.js";
import { callPartnerMatching, callSummarizePracticeSession, createMcpClient } from "../mcp/client.js";
import UserAvailability from "../models/userAvailabilityModel.js";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const conversationStore = new Map();

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
    Does the user want to find or get suggestions for practice partners, language exchange partners, or people to practice with?
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
    Does the user want to summarize, review, or get a summary of a practice session or conversation?
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

    if (!message || !userId) {
      return res.status(400).json({ error: "Missing message or userId" });
    }

    // Ensure userId is a number
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId)) {
      return res.status(400).json({ 
        error: "Invalid userId", 
        details: `userId must be a number, got: ${userId} (type: ${typeof userId})` 
      });
    }

    console.log(`[AI Assistant] User ${numericUserId} sent message: "${message}"`);

    // Initialize conversation store for user if not exists
    if (!conversationStore.has(numericUserId)) {
      conversationStore.set(numericUserId, []);
    }

    const conversation = conversationStore.get(numericUserId);
    conversation.push({ role: "user", content: message });

    let reply;
    let toolUsed = null;
    let toolResult = null;

    // Check if user wants partner matching
    const wantsPartnerMatching = await shouldUsePartnerMatching(message);
    if (wantsPartnerMatching) {
      toolUsed = "partnerMatching";
      const criteria = await extractCriteria(message);
      console.log(`[AI Assistant] Calling partnerMatching for user ${numericUserId} with criteria:`, criteria);
      toolResult = await callPartnerMatching(numericUserId, criteria);
      console.log(`[AI Assistant] partnerMatching result:`, toolResult);
      reply = formatToolResponse("partnerMatching", toolResult);
    } else {
      // Check if user wants to summarize a session
      const wantsSummarize = await shouldSummarizeSession(message);
      if (wantsSummarize) {
        const chatId = await extractChatId(message);
        if (chatId) {
          try {
            // Check privacy permissions
            await assertParticipant(chatId, numericUserId);
            await assertAIAllowed(chatId);

            toolUsed = "summarizePracticeSession";
            const client = await createMcpClient();
            toolResult = await callSummarizePracticeSession(chatId, numericUserId);
            const modelResponse = await model.generateContent(toolResult.prompt);
            reply = modelResponse.response.text()
          } catch (privacyError) {
            throw privacyError;
            reply = `I'm sorry, but I don't have permission to access that practice session. ${privacyError.message}`;
          }
        } else {
          reply = "I'd be happy to summarize a practice session! Could you please provide the chat ID from that practice session?";
        }
      } else {
        // Regular conversational response
        const chatHistory = conversation
          .slice(-10) // Last 10 messages for context
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n");

        const prompt = `You are a helpful AI assistant for a language exchange app, where students learning a foreign language are able to practice speaking with students who are native speakers, and both students are able to learn from eath other. Help users find practice partners, answer questions about language learning, summarize their practice sessions, and assist with translation.

Previous conversation:
${chatHistory}

User: ${message}
Assistant:`;

        const aiResponse = await model.generateContent(prompt);
        reply = aiResponse.response.text();
      }
    }

    // Add assistant response to conversation
    conversation.push({ role: "assistant", content: reply });

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
    if (!conversation || conversation.length === 0) {
      return res.status(404).json({ error: "No conversation found to save" });
    }

    // Save to database
    await aiAssistantService.handleSaveAIChat(numericUserId, {
      conversation: conversation,
    });

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

const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
];

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00"
];

export async function saveAvailabilityFromAiChat(req, res) {
  try {
    let { userId, slots } = req.body;
    const numericUserId = Number(userId);

    if (!numericUserId || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: "userId and non-empty slots array are required" });
    }

    // Delete previous AI availability if desired
    await UserAvailability.destroy({ where: { user_id: numericUserId } });

    // Save new slots
    for (let slot of slots) {
      const dayIndex = slot.dayIndex;
      const timeIndex = slot.timeIndex;

      await UserAvailability.create({
        user_id: numericUserId,
        day_of_week: dayNames[dayIndex],
        start_time: timeSlots[timeIndex],
        end_time: timeSlots[timeIndex + 1] || timeSlots[timeIndex]
      });
    }

    return res.status(200).json({ message: "Availability saved" });
  } catch (err) {
    console.error("saveAvailabilityFromAiChat error:", err);
    return res.status(500).json({ error: err.message });
  }
}

