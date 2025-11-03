import db from '../models/index.js';

let getUserInterests = (user_id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await db.UserProfile.findOne({
                where: { id: user_id },
                include: [{ model: db.Interest, as: 'Interests', through: { attributes: [] } }]
            });
            resolve(user ? user.Interests : []);
        } catch (e) {
            console.error('Error in getUserInterests service:', e);
            reject(e);
        }
    })
}

let addUserInterest = async (user_id, interest_name_or_id) => {
    const isId = typeof interest_name_or_id === 'number';
    let interest = null;
    if (isId) {
        interest = await db.Interest.findByPk(interest_name_or_id);
    } else {
        const [rec] = await db.Interest.findOrCreate({ where: { interest_name: interest_name_or_id } });
        interest = rec;
    }
    await db.UserInterest.findOrCreate({ where: { user_id, interest_id: interest.id } });
    return interest;
}

let removeUserInterest = async (user_id, interest_id) => {
    await db.UserInterest.destroy({ where: { user_id, interest_id } });
}

let replaceUserInterests = async (user_id, interest_ids) => {
    await db.UserInterest.destroy({ where: { user_id } });
    for (const interest_id of interest_ids) {
        await db.UserInterest.create({ user_id, interest_id });
    }
}

const userInterestService = { getUserInterests, addUserInterest, removeUserInterest, replaceUserInterests };
export default userInterestService;


