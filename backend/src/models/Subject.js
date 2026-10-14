const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubjectSchema = new Schema({
  nombre:  { type: String, required: true, trim: true },
  carrera: { type: String, default: '' },
});

const toPlain = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.id = o._id?.toString();
  delete o._id;
  delete o.__v;
  return o;
};

SubjectSchema.statics.findAll = async function (carrera = null) {
  const match = carrera ? { carrera } : {};
  const docs = await this.find(match).sort({ nombre: 1 }).lean();
  return docs.map((o) => { o.id = o._id.toString(); delete o._id; delete o.__v; return o; });
};

SubjectSchema.statics.create = async function ({ nombre, carrera = '' }) {
  const doc = await new this({ nombre: nombre.trim(), carrera }).save();
  return toPlain(doc);
};

module.exports = mongoose.model('Subject', SubjectSchema);
