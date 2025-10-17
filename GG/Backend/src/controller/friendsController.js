import FriendsModel from'../models/FriendsModel';
import friendsService from'../Service/friendsService';
let createFriends = async (req, res) => {
    let user1_ID = req.body.user1_ID;
    let user2_ID = req.body.user2_ID;
    let message = await friendsService.handleFriendsModel(user1_ID, user2_ID)
     return res.status(200).json({
             message: message.errMessage,
             messageData: message.data? message.data : {}
     })
}


let findFriends = async (req, res) => {
  try {
    const userId = req.params.id;            // <-- key change
    if (!userId) return res.status(400).json({ message: 'Missing user id' });

    const result = await friendsService.handleFindFriends(userId);
    return res.status(200).json({
      message: result.errMessage,
      chatsData: result.data ?? []
    });
  } catch (err) {
    console.error('findFriends error:', err);
    return res.status(500).json({ message: 'Failed to fetch friends' });
  }
};

let findFriend = async (req, res) => {
    let user1_ID = req.params.user1_ID
    let user2_ID = req.params.user2_ID

    //console.log("check if two users are friends >>>>", user1_ID, user2_ID)
    let messageData = await friendsService.handleFindFriend(user1_ID, user2_ID)
    return res.status(200).json({
        message: messageData.errMessage,
        chatsData: messageData.data? messageData.data : {}
    })
}
let addFriend = async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    const response = await friendsService.createFriend(userId, null, null, targetId, null, null);
    return res.status(201).json({ message: 'Friend added successfully', data: response });
  } catch (error) {
    console.error('Error adding friend:', error);
    return res.status(500).json({ message: 'Error adding friend' });
  }
};

module.exports = {
    createFriends: createFriends,
    findFriends: findFriends,
    findFriend: findFriend,
    addFriend: addFriend
}