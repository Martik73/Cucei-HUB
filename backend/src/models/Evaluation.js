const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const EvaluationSchema = new Schema({
  professorId: { type: Schema.Types.ObjectId, ref: 'Professor', required: true },
  subjectId:   { type: Schema.Types.ObjectId, ref: 'Subject',   required: true },
  studentId:   { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, default: '' },
  semestre:    { type: Number, required: true },
}, { timestamps: true });

EvaluationSchema.index({ professorId: 1, subjectId: 1, studentId: 1 }, { unique: true });
EvaluationSchema.index({ professorId: 1 });
EvaluationSchema.index({ studentId: 1 });
EvaluationSchema.index({ subjectId: 1 });

EvaluationSchema.statics.findByProfessor = async function ({ professorId, subjectId = null, semestre = null, page = 1, limit = 20 }) {
  const match = { professorId: new ObjectId(professorId) };
  if (subjectId) match.subjectId = new ObjectId(subjectId);
  if (semestre)  match.semestre  = Number(semestre);

  const offset = (page - 1) * limit;
  const [total, evaluations] = await Promise.all([
    this.countDocuments(match),
    this.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      { $lookup: { from: 'users',    localField: 'studentId', foreignField: '_id', as: 'studentDoc' } },
      { $unwind: '$studentDoc' },
      { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subjectDoc' } },
      { $unwind: '$subjectDoc' },
      { $addFields: {
        id:            { $toString: '$_id' },
        professorId:   { $toString: '$professorId' },
        subjectId:     { $toString: '$subjectId' },
        studentId:     { $toString: '$studentId' },
        studentNombre: '$studentDoc.nombre',
        subjectNombre: '$subjectDoc.nombre',
      }},
      { $project: { _id: 0, __v: 0, studentDoc: 0, subjectDoc: 0 } },
    ]),
  ]);
  return { evaluations, total, page, totalPages: Math.ceil(total / limit) };
};

EvaluationSchema.statics.create = async function ({ professorId, subjectId, studentId, rating, comment, semestre }) {
  try {
    const doc = await new this({ professorId, subjectId, studentId, rating, comment: comment || '', semestre }).save();
    const [result] = await this.aggregate([
      { $match: { _id: doc._id } },
      { $lookup: { from: 'users',    localField: 'studentId', foreignField: '_id', as: 'studentDoc' } },
      { $unwind: '$studentDoc' },
      { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subjectDoc' } },
      { $unwind: '$subjectDoc' },
      { $addFields: {
        id:            { $toString: '$_id' },
        professorId:   { $toString: '$professorId' },
        subjectId:     { $toString: '$subjectId' },
        studentId:     { $toString: '$studentId' },
        studentNombre: '$studentDoc.nombre',
        subjectNombre: '$subjectDoc.nombre',
      }},
      { $project: { _id: 0, __v: 0, studentDoc: 0, subjectDoc: 0 } },
    ]);
    return result;
  } catch (err) {
    if (err.code === 11000) {
      const dup = new Error('Ya evaluaste a este profesor en esta materia');
      dup.code = 'DUPLICATE';
      throw dup;
    }
    throw err;
  }
};

module.exports = mongoose.model('Evaluation', EvaluationSchema);
