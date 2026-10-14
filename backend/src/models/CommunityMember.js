const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommunityMemberSchema = new Schema({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  userId:      { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  joinedAt:    { type: Date, default: Date.now },
}, { collection: 'communitymembers' });

CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
CommunityMemberSchema.index({ communityId: 1 });
CommunityMemberSchema.index({ userId: 1 });

module.exports = mongoose.model('CommunityMember', CommunityMemberSchema, 'communitymembers');
