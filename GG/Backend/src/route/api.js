import express from "express";
import APIController from "../controller/APIController";
import interestController from "../controller/interestController";
import userInterestController from "../controller/userInterestController";
import availabilityController from "../controller/availabilityController";
//import userController from "../controller/userController.js";//added this

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

    router.post('/addTrueFriend', APIController.addTrueFriend);
    router.delete('/removeTrueFriend', APIController.removeTrueFriend);

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

  
    return app.use('/api/v1/', router)
}

export default initAPIRoute;