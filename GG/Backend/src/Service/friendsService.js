const db = require('../models');
const { Op } = require('sequelize');

function normalizePair(a, b) {
  a = Number(a); b = Number(b);
  if (!a || !b) throw new Error('Missing user ids');
  if (a === b) throw new Error('Cannot friend yourself');
  return a < b ? [a, b] : [b, a];
}

module.exports = {
  // create (was handleFriendsModel)
  async handleFriendsModel(user1_ID, user2_ID) {
    const message = {};
    const [u1, u2] = normalizePair(user1_ID, user2_ID);

    try {
      const friendship = await db.Friendship.create({
        user_id_1: u1,
        user_id_2: u2,
        status: 'accepted'
      });
      message.errMessage = 'Friends Model Successfully Created!';
      message.data = friendship;
      return message;
    } catch (e) {
      // handle duplicate pair gracefully
      if (e.name === 'SequelizeUniqueConstraintError') {
        message.errMessage = 'Friendship already exists';
        message.data = null;
        return message;
      }
      throw e;
    }
  },

  // list all friends for a user (was handleFindFriends)
  async handleFindFriends(userId) {
    const id = Number(userId);
    const out = {};

    const rows = await db.Friendship.findAll({
      where: {
        [Op.or]: [{ user_id_1: id }, { user_id_2: id }],
        status: 'accepted'
      },
      attributes: ['user_id_1', 'user_id_2']
    });

    const friendIds = rows.map(r => (r.user_id_1 === id ? r.user_id_2 : r.user_id_1));
    out.errMessage = 'Friends found!';
    out.data = friendIds;
    return out;
  },

  // check if two users are friends (was handleFindFriend)
  async handleFindFriend(user1_ID, user2_ID) {
    const [u1, u2] = normalizePair(user1_ID, user2_ID);

    const row = await db.Friendship.findOne({
      where: { user_id_1: u1, user_id_2: u2 }
    });

    return {
      errMessage: 'Find friends of a specific sender & receiver',
      data: row || null
    };
  },

  // optional: createFriend matching your addFriend controller
  async createFriend(user_id_1, _fn1, _ln1, user_id_2, _fn2, _ln2) {
    const [u1, u2] = normalizePair(user_id_1, user_id_2);
    try {
      const row = await db.Friendship.create({ user_id_1: u1, user_id_2: u2, status: 'accepted' });
      return row;
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') return null; // already friends
      throw e;
    }
  }
};