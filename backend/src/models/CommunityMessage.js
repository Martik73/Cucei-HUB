const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const CommunityMessageSchema = new Schema({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  userId:      { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  content:     { type: String, required: true },
}, { timestamps: true, collection: 'communitymessages' });

CommunityMessageSchema.index({ communityId: 1 });

const msgWithUser = (extra = []) => [
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDoc' } },
  { $unwind: '$userDoc' },
  ...extra,
  { $addFields: {
    id:          { $toString: '$_id' },
    communityId: { $toString: '$communityId' },
    userId:      { $toString: '$userId' },
    userNombre:  '$userDoc.nombre',
    userPicture: '$userDoc.profilePicture',
  }},
  { $project: { _id: 0, __v: 0, userDoc: 0 } },
];

CommunityMessageSchema.statics.create = async function ({ communityId, userId, content }) {
  const doc = await new this({ communityId, userId, content: content.trim() }).save();
  const [result] = await this.aggregate([
    { $match: { _id: doc._id } },
    ...msgWithUser(),
  ]);
  return result;
};

CommunityMessageSchema.statics.findByCommunity = async function (communityId, { page = 1, limit = 50 } = {}) {
  const match = { communityId: new ObjectId(communityId) };
  const offset = (page - 1) * limit;
  const [total, messages] = await Promise.all([
    this.countDocuments(match),
    this.aggregate([
      { $match: match },
      { $sort: { createdAt: 1 } },
      { $skip: offset },
      { $limit: limit },
      ...msgWithUser(),
    ]),
  ]);
  return { messages, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = mongoose.model('CommunityMessage', CommunityMessageSchema, 'communitymessages');
