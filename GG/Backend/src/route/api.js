import express from "express";
import APIController from "../controller/APIController.js";
import interestController from "../controller/interestController.js";
import userInterestController from "../controller/userInterestController.js";
import availabilityController from "../controller/availabilityController.js";
import transcriptController from "../controller/transcriptController.js";
import chatController from "../controller/chatController.js";
import * as assistantController from "../controller/assistantController.js";
import * as aiAssistantController from "../controller/aiAssistantController.js";


let router = express.Router();

//TOWNSHEND: added an additional router to get user names
const initAPIRoute = (app) => { 
    router.get('/users', APIController.getAllUsers); // method get
    router.post('/create-user', APIController.createNewUser); // method post
    router.put('/update-user', APIController.updateUser); // method put
    router.delete('/delete-user/:id', APIController.deleteUser); // method delete
    router.get('/user-names', APIController.getUserNames); // GET method to fetch user names
    router.get('/user-preferences', APIController.getUserPreferences);
    router.post('/addFriend', APIController.addFriend);
    router.get('/getUserProfile/:userId', APIController.getUserProfile);
    router.post('/update-rating', APIController.updateRating);
    router.post('/update-proficiency', APIController.updateProficiency);
    router.post('/add-comment', APIController.addComment);
    router.get('/getUserProficiencyAndRating/:userId', APIController.getUserProficiencyAndRating);
    router.post('/addToFriendsList', APIController.addToFriendsList);
    router.get('/getFriendsList', APIController.getFriendsList);

    router.post('/addTrueFriend', APIController.addTrueFriend);
    router.delete('/removeTrueFriend', APIController.removeTrueFriend);
    router.get('/friends/:userId', APIController.getTrueFriendsList);

    router.get('/interests', interestController.listInterests);
    router.post('/interests', interestController.createInterest);

    router.get('/users/:userId/interests', userInterestController.getUserInterests);
    router.post('/users/:userId/interests', userInterestController.addUserInterest);
    router.delete('/users/:userId/interests/:interestId', userInterestController.removeUserInterest);
    router.put('/users/:userId/interests', userInterestController.replaceUserInterests);

    router.get('/users/:userId/availability', availabilityController.getAvailability);
    router.post('/users/:userId/availability', availabilityController.addAvailability);
    router.delete('/users/:userId/availability/:id', availabilityController.removeAvailability);
    router.put('/users/:userId/availability', availabilityController.replaceAvailability);

    router.get('/transcript/:filename', transcriptController.generateTranscript);
    router.post('/transcript/:filename', transcriptController.generateTranscript);
  
    router.put('/chats/:chatId/privacy', chatController.updatePrivacy);

    router.post('/assistant/parse/:chatId', assistantController.parseConversation);

    // AI routes
    router.post('/ai-assistant/chat', aiAssistantController.chatWithAssistant);
    router.post('/ai-assistant/save', aiAssistantController.saveConversation);
    router.post('/ai-assistant/clear', aiAssistantController.clearConversation);
    router.get('/ai-assistant/conversation/:userId', aiAssistantController.getConversation);

    return app.use('/api/v1/', router)
}

export default initAPIRoute;
