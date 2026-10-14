const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const MessageSchema = new Schema({
  senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:    { type: String, required: true },
  read:       { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const withParticipants = (matchCond, skip, limit) => [
  { $match: matchCond },
  { $sort: { createdAt: 1 } },
  { $skip: skip },
  { $limit: limit },
  { $lookup: { from: 'users', localField: 'senderId',   foreignField: '_id', as: 'senderDoc'   } },
  { $unwind: '$senderDoc' },
  { $lookup: { from: 'users', localField: 'receiverId', foreignField: '_id', as: 'receiverDoc' } },
  { $unwind: '$receiverDoc' },
  { $addFields: {
    id:              { $toString: '$_id' },
    senderId:        { $toString: '$senderId' },
    receiverId:      { $toString: '$receiverId' },
    senderNombre:    '$senderDoc.nombre',
    senderPicture:   '$senderDoc.profilePicture',
    receiverNombre:  '$receiverDoc.nombre',
    receiverPicture: '$receiverDoc.profilePicture',
  }},
  { $project: { _id: 0, __v: 0, senderDoc: 0, receiverDoc: 0 } },
];

MessageSchema.statics.create = async function ({ senderId, receiverId, content }) {
  const doc = await new this({ senderId, receiverId, content: content.trim() }).save();
  const plain = doc.toObject();
  plain.id         = plain._id.toString();
  plain.senderId   = plain.senderId.toString();
  plain.receiverId = plain.receiverId.toString();
  delete plain._id;
  delete plain.__v;
  return plain;
};

MessageSchema.statics.findConversation = async function (userAId, userBId, page = 1, limit = 20) {
  const oidA = new ObjectId(userAId);
  const oidB = new ObjectId(userBId);
  const matchCond = {
    $or: [
      { senderId: oidA, receiverId: oidB },
      { senderId: oidB, receiverId: oidA },
    ],
  };
  const offset = (page - 1) * limit;
  const [total, messages] = await Promise.all([
    this.countDocuments(matchCond),
    this.aggregate(withParticipants(matchCond, offset, limit)),
  ]);
  return { messages, total };
};

MessageSchema.statics.markAsRead = async function (senderId, receiverId) {
  const result = await this.updateMany(
    { senderId: new ObjectId(senderId), receiverId: new ObjectId(receiverId), read: false },
    { read: true }
  );
  return { changed: result.modifiedCount };
};

MessageSchema.statics.getConversations = async function (userId) {
  const oid = new ObjectId(userId);
  return this.aggregate([
    { $match: { $or: [{ senderId: oid }, { receiverId: oid }] } },
    { $sort: { createdAt: -1 } },
    { $addFields: {
      partnerId: { $cond: { if: { $eq: ['$senderId', oid] }, then: '$receiverId', else: '$senderId' } },
    }},
    { $group: {
      _id:            '$partnerId',
      lastMessageId:  { $first: '$_id' },
      lastContent:    { $first: '$content' },
      lastSenderId:   { $first: '$senderId' },
      lastRead:       { $first: '$read' },
      lastCreatedAt:  { $first: '$createdAt' },
    }},
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'partnerDoc' } },
    { $unwind: '$partnerDoc' },
    { $lookup: {
      from: 'messages',
      let: { pid: '$_id' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$senderId', '$$pid'] },
          { $eq: ['$receiverId', oid] },
          { $eq: ['$read', false] },
        ] } } },
        { $count: 'n' },
      ],
      as: 'unreadDocs',
    }},
    { $addFields: {
      userId:        { $toString: '$_id' },
      nombre:        '$partnerDoc.nombre',
      email:         '$partnerDoc.email',
      profilePicture:'$partnerDoc.profilePicture',
      carrera:       '$partnerDoc.carrera',
      lastMessageId: { $toString: '$lastMessageId' },
      lastSenderId:  { $toString: '$lastSenderId' },
      unreadCount:   { $ifNull: [{ $arrayElemAt: ['$unreadDocs.n', 0] }, 0] },
    }},
    { $sort: { lastCreatedAt: -1 } },
    { $project: { _id: 0, __v: 0, partnerDoc: 0, unreadDocs: 0 } },
  ]);
};

module.exports = mongoose.model('Message', MessageSchema);
