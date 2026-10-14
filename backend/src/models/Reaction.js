const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const ReactionSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:   { type: String, enum: ['like', 'love', 'celebrate'], required: true },
}, { timestamps: true });

ReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
ReactionSchema.index({ postId: 1 });
ReactionSchema.index({ userId: 1 });

const toPlain = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.id     = o._id?.toString();
  o.postId = o.postId?.toString();
  o.userId = o.userId?.toString();
  delete o._id;
  delete o.__v;
  return o;
};

ReactionSchema.statics.findByPostAndUser = async function (postId, userId) {
  const doc = await this.findOne({ postId: new ObjectId(postId), userId: new ObjectId(userId) });
  return toPlain(doc);
};

ReactionSchema.statics.toggle = async function (postId, userId, type) {
  const existing = await this.findOne({ postId: new ObjectId(postId), userId: new ObjectId(userId) });

  if (!existing) {
    const doc = await new this({ postId, userId, type }).save();
    return toPlain(doc);
  }

  if (existing.type === type) {
    await this.findByIdAndDelete(existing._id);
    return null;
  }

  const updated = await this.findByIdAndUpdate(existing._id, { type }, { new: true });
  return toPlain(updated);
};

ReactionSchema.statics.countsByPost = async function (postId) {
  const rows = await this.aggregate([
    { $match: { postId: new ObjectId(postId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const counts = { like: 0, love: 0, celebrate: 0 };
  rows.forEach((r) => {
    if (r._id in counts) counts[r._id] = r.count;
  });
  return counts;
};

module.exports = mongoose.model('Reaction', ReactionSchema);
