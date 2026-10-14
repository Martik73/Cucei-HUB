const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const MaterialSchema = new Schema({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  uploaderId:  { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  titulo:      { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  tipo:        { type: String, enum: ['pdf', 'youtube'], required: true },
  fileUrl:     { type: String, default: null },
  youtubeUrl:  { type: String, default: null },
}, { timestamps: true });

MaterialSchema.index({ communityId: 1 });

const withUploader = (matchCond) => [
  { $match: matchCond },
  { $sort: { createdAt: -1 } },
  { $lookup: { from: 'users', localField: 'uploaderId', foreignField: '_id', as: 'uploaderDoc' } },
  { $unwind: '$uploaderDoc' },
  { $addFields: {
    id:              { $toString: '$_id' },
    communityId:     { $toString: '$communityId' },
    uploaderId:      { $toString: '$uploaderId' },
    uploaderNombre:  '$uploaderDoc.nombre',
    uploaderPicture: '$uploaderDoc.profilePicture',
  }},
  { $project: { _id: 0, __v: 0, uploaderDoc: 0 } },
];

MaterialSchema.statics.create = async function ({ communityId, uploaderId, titulo, descripcion, tipo, fileUrl, youtubeUrl }) {
  const doc = await new this({
    communityId, uploaderId,
    titulo: titulo.trim(), descripcion: descripcion?.trim() || '',
    tipo, fileUrl: fileUrl || null, youtubeUrl: youtubeUrl || null,
  }).save();
  const [result] = await this.aggregate(withUploader({ _id: doc._id }));
  return result;
};

MaterialSchema.statics.findByCommunity = async function (communityId) {
  return this.aggregate(withUploader({ communityId: new ObjectId(communityId) }));
};

MaterialSchema.statics.findById = async function (id) {
  const doc = await this.findOne({ _id: id }).lean();
  if (!doc) return null;
  doc.id          = doc._id.toString();
  doc.communityId = doc.communityId?.toString();
  doc.uploaderId  = doc.uploaderId?.toString();
  delete doc._id;
  delete doc.__v;
  return doc;
};

MaterialSchema.statics.delete = async function (id) {
  await this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Material', MaterialSchema);
