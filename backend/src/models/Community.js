const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

// Registrar CommunityMember para que mongoose.model('CommunityMember') funcione en las statics
require('./CommunityMember');

const CommunitySchema = new Schema({
  nombre:      { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  materia:     { type: String, default: '' },
  tema:        { type: String, default: '' },
  carrera:     { type: String, default: '' },
  creatorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

CommunitySchema.index({ carrera: 1 });
CommunitySchema.index({ materia: 1 });

const listPipeline = (matchCond, userId) => [
  { $match: matchCond },
  { $sort: { createdAt: -1 } },
  { $lookup: { from: 'users',             localField: 'creatorId',   foreignField: '_id', as: 'creatorDoc'  } },
  { $unwind: '$creatorDoc' },
  { $lookup: { from: 'communitymembers',  localField: '_id',         foreignField: 'communityId', as: 'members'     } },
  { $lookup: { from: 'materials',         localField: '_id',         foreignField: 'communityId', as: 'matsArr'     } },
  { $addFields: {
    id:            { $toString: '$_id' },
    creatorId:     { $toString: '$creatorId' },
    creatorNombre: '$creatorDoc.nombre',
    memberCount:   { $size: '$members' },
    materialCount: { $size: '$matsArr' },
    ...(userId ? {
      isMember: {
        $gt: [{ $size: { $filter: { input: '$members', as: 'm', cond: { $eq: ['$$m.userId', new ObjectId(userId)] } } } }, 0],
      },
    } : { isMember: false }),
  }},
  { $project: { _id: 0, __v: 0, creatorDoc: 0, members: 0, matsArr: 0 } },
];

CommunitySchema.statics.create = async function ({ nombre, descripcion, materia, tema, carrera, creatorId }) {
  const doc = await new this({
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || '',
    materia: materia?.trim() || '',
    tema: tema?.trim() || '',
    carrera: carrera?.trim() || '',
    creatorId,
  }).save();
  const plain = doc.toObject();
  plain.id = plain._id.toString();
  plain.creatorId = plain.creatorId.toString();
  delete plain._id;
  delete plain.__v;
  return plain;
};

CommunitySchema.statics.findAll = async function ({ search = '', materia = '', carrera = '' } = {}) {
  const matchCond = {};
  if (search)  matchCond.$or = [
    { nombre:      { $regex: search, $options: 'i' } },
    { descripcion: { $regex: search, $options: 'i' } },
    { tema:        { $regex: search, $options: 'i' } },
  ];
  if (materia) matchCond.materia = materia;
  if (carrera) matchCond.carrera = carrera;
  return this.aggregate(listPipeline(matchCond, null));
};

CommunitySchema.statics.findById = async function (id, userId = null) {
  const [community] = await this.aggregate(listPipeline({ _id: new ObjectId(id) }, userId));
  return community || null;
};

CommunitySchema.statics.isMember = async function (communityId, userId) {
  const CommunityMember = mongoose.model('CommunityMember');
  const doc = await CommunityMember.findOne({ communityId: new ObjectId(communityId), userId: new ObjectId(userId) }).lean();
  return !!doc;
};

CommunitySchema.statics.join = async function (communityId, userId) {
  const CommunityMember = mongoose.model('CommunityMember');
  await CommunityMember.updateOne(
    { communityId: new ObjectId(communityId), userId: new ObjectId(userId) },
    { $setOnInsert: { joinedAt: new Date() } },
    { upsert: true }
  );
};

CommunitySchema.statics.leave = async function (communityId, userId) {
  const CommunityMember = mongoose.model('CommunityMember');
  await CommunityMember.deleteOne({ communityId: new ObjectId(communityId), userId: new ObjectId(userId) });
};

module.exports = mongoose.model('Community', CommunitySchema);
