const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const PostSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true },
  type:     { type: String, enum: ['general', 'carrera'], default: 'general' },
  category: { type: String, enum: ['duda', 'evento', 'trabajo', 'general'], default: 'general' },
  carrera:  { type: String, default: null },
}, { timestamps: true });

PostSchema.index({ type: 1 });
PostSchema.index({ carrera: 1 });
PostSchema.index({ authorId: 1 });
PostSchema.index({ createdAt: -1 });

const feedPipeline = (matchCond, userId, skip, limit) => [
  { $match: matchCond },
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit },
  { $lookup: { from: 'users',     localField: 'authorId', foreignField: '_id', as: 'authorDoc' } },
  { $unwind: '$authorDoc' },
  { $lookup: { from: 'reactions', localField: '_id', foreignField: 'postId', as: 'reacts' } },
  { $lookup: { from: 'comments',  localField: '_id', foreignField: 'postId', as: 'comms'  } },
  { $addFields: {
    id:            { $toString: '$_id' },
    authorId:      { $toString: '$authorId' },
    authorNombre:  '$authorDoc.nombre',
    authorCarrera: '$authorDoc.carrera',
    authorPicture: '$authorDoc.profilePicture',
    reactionCount: { $size: '$reacts' },
    commentCount:  { $size: '$comms' },
    userReaction: {
      $let: {
        vars: { ur: { $filter: { input: '$reacts', as: 'r', cond: { $eq: ['$$r.userId', new ObjectId(userId)] } } } },
        in:   { $arrayElemAt: ['$$ur.type', 0] },
      },
    },
  }},
  { $project: { _id: 0, __v: 0, authorDoc: 0, reacts: 0, comms: 0 } },
];

PostSchema.statics.create = async function ({ authorId, content, type, category, carrera }) {
  const doc = await new this({ authorId, content: content.trim(), type, category, carrera }).save();
  const plain = doc.toObject();
  plain.id = plain._id.toString();
  plain.authorId = plain.authorId.toString();
  delete plain._id;
  delete plain.__v;
  return plain;
};

PostSchema.statics.findById = async function (id) {
  const doc = await this.findOne({ _id: id }).lean();
  if (!doc) return null;
  doc.id = doc._id.toString();
  doc.authorId = doc.authorId?.toString();
  delete doc._id;
  delete doc.__v;
  return doc;
};

PostSchema.statics.findWithDetails = async function (id, userId) {
  const [post] = await this.aggregate([
    { $match: { _id: new ObjectId(id) } },
    { $lookup: { from: 'users',     localField: 'authorId', foreignField: '_id', as: 'authorDoc' } },
    { $unwind: '$authorDoc' },
    { $lookup: { from: 'reactions', localField: '_id', foreignField: 'postId', as: 'allReacts' } },
    { $lookup: { from: 'comments',  localField: '_id', foreignField: 'postId', as: 'allComms'  } },
    { $addFields: {
      id:            { $toString: '$_id' },
      authorId:      { $toString: '$authorId' },
      authorNombre:  '$authorDoc.nombre',
      authorCarrera: '$authorDoc.carrera',
      authorPicture: '$authorDoc.profilePicture',
      totalReactions: { $size: '$allReacts' },
      commentCount:   { $size: '$allComms' },
      userReaction: {
        $let: {
          vars: { ur: { $filter: { input: '$allReacts', as: 'r', cond: { $eq: ['$$r.userId', new ObjectId(userId)] } } } },
          in:   { $arrayElemAt: ['$$ur.type', 0] },
        },
      },
    }},
    { $project: { _id: 0, __v: 0, authorDoc: 0, allReacts: 0, allComms: 0 } },
  ]);
  return post || null;
};

PostSchema.statics.findFeed = async function ({ userId, userCarrera, type = null, category = null, page = 1, limit = 20 }) {
  const base = { $or: [{ type: 'general' }, { type: 'carrera', carrera: userCarrera }] };
  const extra = [];
  if (type)     extra.push({ type });
  if (category) extra.push({ category });
  const matchCond = extra.length ? { $and: [base, ...extra] } : base;

  const offset = (page - 1) * limit;
  const [total, posts] = await Promise.all([
    this.countDocuments(matchCond),
    this.aggregate(feedPipeline(matchCond, userId, offset, limit)),
  ]);
  return { posts, total };
};

PostSchema.statics.findByUser = async function ({ authorId, currentUserId, currentUserCarrera, page = 1, limit = 20 }) {
  const matchCond = {
    $and: [
      { authorId: new ObjectId(authorId) },
      { $or: [{ type: 'general' }, { type: 'carrera', carrera: currentUserCarrera }] },
    ],
  };
  const offset = (page - 1) * limit;
  const [total, posts] = await Promise.all([
    this.countDocuments(matchCond),
    this.aggregate(feedPipeline(matchCond, currentUserId, offset, limit)),
  ]);
  return { posts, total, page, totalPages: Math.ceil(total / limit) };
};

PostSchema.statics.update = async function (id, { content, category }) {
  const updates = {};
  if (content  !== undefined) updates.content  = content.trim();
  if (category !== undefined) updates.category = category;
  const doc = await this.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!doc) return null;
  doc.id = doc._id.toString();
  doc.authorId = doc.authorId?.toString();
  delete doc._id;
  delete doc.__v;
  return doc;
};

PostSchema.statics.delete = async function (id) {
  await this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Post', PostSchema);
