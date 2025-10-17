import { pool } from '../config/connectDB'; //TOWNSHEND: this was formally connected to sequelize...
//but the methods were using .execute method, so I changed the import to the pool object

const normalizePair = (a, b) => {
  a = Number(a); b = Number(b);
  if (!a || !b) throw new Error('Missing user ids');
  if (a === b) throw new Error('Cannot friend yourself');
  return a < b ? [a, b] : [b, a];
};

//TOWNSHEND: getAllUsers may be the best way to sort users on a page since all data on a UserAccount is attached to the user
// I can explore this more
let getAllUsers = async (req, res) => {
    const [rows, fields] = await pool.execute(`SELECT * FROM UserAccount`);
    return res.status(200).json({
        message: 'ok',
        data: rows
    })
}

let createNewUser = async (req, res) => { //POST function
    let { firstName, lastName, email, address } = req.body;
    if (!firstName || !lastName || !email || !address) {
        return res.status(200).json({
            message: 'missing @params'
        })
    }
    await pool.execute('insert into UserAccount(firstName, lastName, email, address) values(?, ?, ?, ?)', [firstName, lastName, email, address]);
    return res.status(200).json({
        message: 'ok'
    })
}

let updateUser = async (req, res) => { // PUT function
    let { firstName, lastName, email, address, id } = req.body;
    if (!firstName || !lastName || !email || !address || !id) {
        return res.status(200).json({
            message: 'missing @params'
        })
    }

    await pool.execute('update UserAccount set firstName = ?, lastName= ?, email = ?, address= ? WHERE id = ?',
        [firstName, lastName, email, address, id]);
    return res.status(200).json({
        message: 'ok'
    })
    
}

let deleteUser = async (req, res) => { // DELETE function
     let userId = req.params.id;
     if (!userId) { 
        return res.status(200).json({
            message: 'missing @params'
        })
    }

    await pool.execute('delete from UserAccount where id = ?', [userId])
      return res.status(200).json({
        message: 'ok'
    })
}
const getUserPreferences = async (req , res) => {
  try {
    const [userPreferences] = await pool.execute(`SELECT * FROM UserProfile`); 
    res.status(200).json({
      message: 'ok',
      data: userPreferences
    });
  } catch (error) {
    console.error('Error retrieving user names:', error); // Log error details
    res.status(500).json({
      message: 'Error retrieving preferences',
      error: error.message
    });
  }
}
//TOWNSHEND: I created a simpler function that isolated the user firstName and lastName
// but may not be good for sorting.
const getUserNames = async (req, res) => {
    try {
      const [users] = await pool.execute(`SELECT * FROM UserAccount`); // uses mysql2 function to access database
      res.status(200).json({
        message: 'ok',
        data: users
      });
    } catch (error) {
      console.error('Error retrieving user names:', error); // Log error details
      res.status(500).json({
        message: 'Error retrieving user names',
        error: error.message
      });
    }
};
let addFriend = async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    const normalizePair = (a,b) => { a=+a; b=+b; if(!a||!b) throw new Error('Missing user ids'); if(a===b) throw new Error('Cannot friend yourself'); return a<b?[a,b]:[b,a]; };
    const [u1, u2] = normalizePair(userId, targetId);

    const [result] = await pool.execute(
      `INSERT INTO Friendship (user_id_1, user_id_2, status)
       VALUES (?, ?, 'accepted')
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [u1, u2]
    );

    return res.status(201).json({
      message: 'Friend added successfully',
      sql: { affectedRows: result.affectedRows, insertId: result.insertId }
    });
  } catch (error) {
    console.error('[addFriend] error:', error);
    return res.status(400).json({ message: error?.message || 'Error adding friend' });
  }
};

let getUserProfile = async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({
            message: 'Missing userId parameter'
        });
    }
    try {
        const [rows] = await pool.execute('SELECT * FROM UserProfile WHERE id = ?', [userId]);
        if (rows.length > 0) {
            return res.status(200).json({
                message: 'ok',
                data: rows[0]
            });
        } else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Error retrieving user profile:', error);
        return res.status(500).json({
            message: 'Error retrieving user profile',
            error: error.message
        });
    }
};

let updateRating = async (req, res) => {
    const { rating, user_id } = req.body;

    if (rating === undefined || user_id === undefined) {
        return res.status(400).json({ message: 'Missing rating or user_id parameter' });
    }

    try {
        const query = 'UPDATE UserProfile SET rating = ? WHERE id = ?';
        await pool.execute(query, [rating, user_id]);
        return res.status(200).json({ message: 'Rating updated successfully!' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update rating', error });
    }
};

let updateProficiency = async (req, res) => {
    const { proficiency, user_id } = req.body;

    if (proficiency === undefined || user_id === undefined) {
        return res.status(400).json({ message: 'Missing proficiency or user_id parameter' });
    }

    try {
        const query = 'UPDATE UserProfile SET proficiency = ? WHERE id = ?';
        await pool.execute(query, [proficiency, user_id]);
        return res.status(200).json({ message: 'Proficiency updated successfully!' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update proficiency', error });
    }
};

const addComment = async (req, res) => {
    const { comment, user_id } = req.body;

    if (!comment || !user_id) {
        return res.status(400).json({ message: 'Missing comment or user_id parameter' });
    }

    try {
        const query = 'UPDATE UserProfile SET comments = ? WHERE id = ?';
        await pool.execute(query, [String(comment), user_id]);  // Explicitly cast comment to string
        return res.status(200).json({ message: 'Comment added successfully!' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to add comment', error });
    }
};

let getUserProficiencyAndRating = async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({
            message: 'Missing userId parameter'
        });
    }
    try {
        const [rows] = await pool.execute('SELECT proficiency, rating FROM UserProfile WHERE id = ?', [userId]);
        if (rows.length > 0) {
            return res.status(200).json({
                message: 'ok',
                data: rows[0]
            });
        } else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Error retrieving user proficiency and rating:', error);
        return res.status(500).json({
            message: 'Error retrieving user proficiency and rating',
            error: error.message
        });
    }
};

let addToFriendsList = async (req, res) => {
    let { userId, friendsList } = req.body; // Expecting friendsList as an array or a string
    if (!userId || !friendsList) {
        return res.status(400).json({
            message: 'Missing userId or friendsList'
        });
    }

    try {
        // Update logic
        await pool.execute('UPDATE UserProfile SET friends_list = ? WHERE id = ?', [
            friendsList.join(', '), // Ensure this is a string
            userId,
        ]);

        return res.status(200).json({
            message: 'Friends list updated successfully',
        });
    } catch (error) {
        console.error('Error updating friends list:', error);
        return res.status(500).json({
            message: 'Error updating friends list',
            error: error.message,
        });
    }
};

let getFriendsList = async (req, res) => {
  const userId = Number(req.params.id);
  const details = req.query.details === '1' || req.query.details === 'true';
  if (!userId) return res.status(400).json({ message: 'Missing user ID' });

  try {
    if (details) {
      const [rows] = await pool.execute(
        `SELECT u.id, u.firstName, u.lastName, u.email
           FROM Friendship f
           JOIN UserProfile u
             ON u.id = CASE WHEN f.user_id_1 = ? THEN f.user_id_2 ELSE f.user_id_1 END
          WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND f.status = 'accepted'
          ORDER BY u.firstName, u.lastName`,
        [userId, userId, userId]
      );
      return res.status(200).json({ message: 'ok', friends: rows });
    } else {
      const [rows] = await pool.execute(
        `SELECT CASE WHEN user_id_1=? THEN user_id_2 ELSE user_id_1 END AS friend_id
           FROM Friendship
          WHERE (user_id_1=? OR user_id_2=?) AND status='accepted'`,
        [userId, userId, userId]
      );
      return res.status(200).json({ message: 'ok', friends: rows.map(r => r.friend_id) });
    }
  } catch (error) {
    console.error('[getFriendsList] error:', error);
    return res.status(500).json({ message: 'Error fetching friends list' });
  }
};

let findFriends = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const [rows] = await pool.execute(
      `SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END AS friend_id
         FROM Friendship
        WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'`,
      [id, id, id]
    );

    const friendIds = rows.map(r => r.friend_id);
    return res.status(200).json({ message: 'ok', friends: friendIds });
  } catch (error) {
    console.error('Error finding friends:', error);
    return res.status(500).json({ message: 'Failed to fetch friends' });
  }
};

module.exports = { 
    addFriend, findFriends, getAllUsers, createNewUser, updateUser, deleteUser, getUserNames, getUserPreferences, getUserProfile, updateRating, updateProficiency, addComment, getUserProficiencyAndRating, addToFriendsList, getFriendsList // added getUserNames as an export
}