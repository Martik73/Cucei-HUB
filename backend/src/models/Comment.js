const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const CommentSchema = new Schema({
  postId:   { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true },
}, { timestamps: true });

CommentSchema.index({ postId: 1 });

CommentSchema.statics.create = async function ({ postId, authorId, content }) {
  const doc = await new this({ postId, authorId, content: content.trim() }).save();
  const [result] = await this.aggregate([
    { $match: { _id: doc._id } },
    { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'authorDoc' } },
    { $unwind: '$authorDoc' },
    { $addFields: {
      id:            { $toString: '$_id' },
      postId:        { $toString: '$postId' },
      authorId:      { $toString: '$authorId' },
      authorNombre:  '$authorDoc.nombre',
      authorPicture: '$authorDoc.profilePicture',
    }},
    { $project: { _id: 0, __v: 0, authorDoc: 0 } },
  ]);
  return result;
};

CommentSchema.statics.findByPost = async function (postId, page = 1, limit = 20) {
  const match = { postId: new ObjectId(postId) };
  const offset = (page - 1) * limit;
  const [total, comments] = await Promise.all([
    this.countDocuments(match),
    this.aggregate([
      { $match: match },
      { $sort: { createdAt: 1 } },
      { $skip: offset },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'authorDoc' } },
      { $unwind: '$authorDoc' },
      { $addFields: {
        id:            { $toString: '$_id' },
        postId:        { $toString: '$postId' },
        authorId:      { $toString: '$authorId' },
        authorNombre:  '$authorDoc.nombre',
        authorPicture: '$authorDoc.profilePicture',
      }},
      { $project: { _id: 0, __v: 0, authorDoc: 0 } },
    ]),
  ]);
  return { comments, total };
};

module.exports = mongoose.model('Comment', CommentSchema);
