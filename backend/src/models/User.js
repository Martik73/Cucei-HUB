const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CARRERAS } = require('../utils/validators');

const toPlain = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.id = (o._id || o.id)?.toString();
  delete o._id;
  delete o.__v;
  for (const k of Object.keys(o)) {
    if (o[k] instanceof mongoose.Types.ObjectId) o[k] = o[k].toString();
  }
  return o;
};

const UserSchema = new Schema({
  firebaseUid:    { type: String, unique: true, required: true },
  email:          { type: String, unique: true, required: true, lowercase: true },
  password:       { type: String, required: true },
  nombre:         { type: String, required: true, trim: true },
  carrera:        { type: String, required: true },
  semestre:       { type: Number, required: true },
  bio:            { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  rol:            { type: String, enum: ['student', 'admin'], default: 'student' },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.statics.create = async function (data) {
  const doc = await new this(data).save();
  return toPlain(doc);
};

UserSchema.statics.findById = async function (id) {
  const doc = await this.findOne({ _id: id });
  return toPlain(doc);
};

UserSchema.statics.findByEmail = async function (email) {
  const doc = await this.findOne({ email: email.toLowerCase() });
  return toPlain(doc);
};

UserSchema.statics.findByFirebaseUid = async function (uid) {
  const doc = await this.findOne({ firebaseUid: uid });
  return toPlain(doc);
};

UserSchema.statics.search = async function (query, excludeUserId, limit = 20) {
  const regex = new RegExp(query, 'i');
  const docs = await this.find({
    _id: { $ne: excludeUserId },
    isActive: true,
    $or: [{ nombre: regex }, { email: regex }],
  }).select('nombre carrera email').sort({ nombre: 1 }).limit(limit).lean();
  return docs.map((o) => {
    o.id = o._id.toString();
    delete o._id;
    delete o.__v;
    return o;
  });
};

UserSchema.statics.findPublicById = async function (id) {
  const doc = await this.findOne({ _id: id, isActive: true })
    .select('nombre email carrera semestre bio profilePicture createdAt');
  return toPlain(doc);
};

UserSchema.statics.update = async function (id, data) {
  const doc = await this.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return toPlain(doc);
};

UserSchema.statics.toPublic = function (user) {
  if (!user) return null;
  const obj = toPlain(user);
  const { password, ...pub } = obj;
  return pub;
};

UserSchema.statics.CARRERAS = CARRERAS;

const User = mongoose.model('User', UserSchema);
User.CARRERAS = CARRERAS;

module.exports = User;
