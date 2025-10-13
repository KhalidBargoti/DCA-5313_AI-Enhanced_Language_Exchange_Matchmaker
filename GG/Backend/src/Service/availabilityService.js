import db from '../models/index';

let getAvailability = (user_id) => {
    return db.UserAvailability.findAll({ where: { user_id }, order: [['day_of_week', 'ASC'], ['start_time', 'ASC']] });
}

let addAvailability = async (user_id, slots) => {
    // slots: array of { day_of_week, start_time, end_time }
    const created = [];
    for (const s of (Array.isArray(slots) ? slots : [slots])) {
        const rec = await db.UserAvailability.create({ user_id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time });
        created.push(rec);
    }
    return created;
}

let removeAvailability = (id) => {
    return db.UserAvailability.destroy({ where: { id } });
}

let replaceAvailability = async (user_id, slots) => {
    await db.UserAvailability.destroy({ where: { user_id } });
    return addAvailability(user_id, slots);
}

module.exports = { getAvailability, addAvailability, removeAvailability, replaceAvailability }


