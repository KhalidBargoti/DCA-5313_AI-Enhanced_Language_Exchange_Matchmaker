import express from "express";
import APIController from "../controller/APIController.js";
import interestController from "../controller/interestController.js";
import userInterestController from "../controller/userInterestController.js";
import availabilityController from "../controller/availabilityController.js";
//import userController from "../controller/userController.js";//added this
import chatController from "../controller/chatController.js";
import * as assistantController from "../controller/assistantController.js";
import db from "../models/index.js";

let router = express.Router();

//TOWNSHEND: added an additional router to get user names
const initAPIRoute = (app) => { 
    router.get('/users', APIController.getAllUsers); // method get
    router.post('/create-user', APIController.createNewUser); // method post
    router.put('/update-user', APIController.updateUser); // method put
    //router.post('/update-profile', userController.handleUpdateUser);//added this
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

    router.put('/chats/:chatId/privacy', chatController.updatePrivacy);

    router.post('/assistant/parse/:chatId', assistantController.parseConversation);
    
    router.get('/chats/:chatId', async (req, res) => {
    try {
        const chat = await db.ChatModel.findByPk(req.params.chatId, {
        attributes: ['id', 'senderId', 'receiverId', 'aiAccessAllowed']
        });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        return res.json({ data: chat });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
    });

    router.put('/chats/:chatId/privacy', async (req, res) => {
    try {
        const { userId, aiAccessAllowed } = req.body;
        const chat = await db.ChatModel.findByPk(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Optional safety: only participants may toggle
        if (userId && ![String(chat.senderId), String(chat.receiverId)].includes(String(userId))) {
        return res.status(403).json({ message: 'Forbidden: not a participant' });
        }

        chat.aiAccessAllowed = !!aiAccessAllowed;
        await chat.save();
        return res.json({ message: 'ok', data: { aiAccessAllowed: chat.aiAccessAllowed } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
    });

    return app.use('/api/v1/', router)
}

export default initAPIRoute;