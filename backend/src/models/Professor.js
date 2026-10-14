const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

// Registrar Evaluation para que mongoose.model('Evaluation') funcione en las statics
require('./Evaluation');

const ProfessorSchema = new Schema({
  nombre:           { type: String, required: true, trim: true },
  departamento:     { type: String, default: '' },
  subjects:         [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
  avgRating:        { type: Number, default: 0 },
  totalEvaluations: { type: Number, default: 0 },
}, { timestamps: true });

ProfessorSchema.index({ nombre: 1 });

const toPlain = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.id = o._id?.toString();
  delete o._id;
  delete o.__v;
  if (Array.isArray(o.subjects)) {
    o.subjects = o.subjects.map((s) =>
      s instanceof ObjectId ? s.toString() : (s._id ? { ...s, id: s._id.toString(), _id: undefined } : s)
    );
  }
  return o;
};

ProfessorSchema.statics.findAll = async function ({ search = '', subjectId = null, semestre = null } = {}) {
  const match = {};
  if (search.trim()) match.nombre = { $regex: search.trim(), $options: 'i' };
  if (subjectId)     match.subjects = new ObjectId(subjectId);

  if (semestre) {
    const Evaluation = mongoose.model('Evaluation');
    const profIds = await Evaluation.find({ semestre: Number(semestre) }).distinct('professorId');
    match._id = { $in: profIds };
  }

  const docs = await this.find(match).sort({ nombre: 1 }).lean();
  return docs.map((o) => {
    o.id = o._id.toString();
    delete o._id;
    delete o.__v;
    if (Array.isArray(o.subjects)) o.subjects = o.subjects.map((s) => s.toString());
    return o;
  });
};

ProfessorSchema.statics.findById = async function (id) {
  const doc = await this.findOne({ _id: id }).populate('subjects', 'nombre carrera').lean();
  if (!doc) return null;
  const o = { ...doc };
  o.id = o._id.toString();
  delete o._id;
  delete o.__v;
  o.subjects = (o.subjects || []).map((s) => ({
    id:      s._id.toString(),
    nombre:  s.nombre,
    carrera: s.carrera,
  }));
  return o;
};

ProfessorSchema.statics.create = async function ({ nombre, departamento }) {
  const doc = await new this({ nombre: nombre.trim(), departamento: (departamento || '').trim() }).save();
  return toPlain(doc);
};

ProfessorSchema.statics.linkSubjects = async function (professorId, subjectIds) {
  if (!subjectIds.length) return;
  const oids = subjectIds.map((s) => new ObjectId(s));
  await this.updateOne({ _id: professorId }, { $addToSet: { subjects: { $each: oids } } });
};

ProfessorSchema.statics.teachesSubject = async function (professorId, subjectId) {
  const doc = await this.findOne({ _id: professorId, subjects: new ObjectId(subjectId) }).lean();
  return !!doc;
};

ProfessorSchema.statics.updateStats = async function (professorId) {
  const Evaluation = mongoose.model('Evaluation');
  const stats = await Evaluation.aggregate([
    { $match: { professorId: new ObjectId(professorId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } },
  ]);
  const avgRating        = stats.length ? parseFloat(stats[0].avg.toFixed(2)) : 0;
  const totalEvaluations = stats.length ? stats[0].total : 0;
  await this.updateOne({ _id: professorId }, { avgRating, totalEvaluations });
  return { avgRating, totalEvaluations };
};

module.exports = mongoose.model('Professor', ProfessorSchema);
