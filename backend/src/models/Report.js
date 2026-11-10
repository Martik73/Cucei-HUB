const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['post', 'comment', 'material', 'evaluation'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pendiente', 'En revisión', 'Resuelto'],
    default: 'Pendiente'
  },
  // Respaldo histórico del contenido para que no desaparezca al eliminarlo
  savedContent: {
    title: String,
    description: String,
    content: String
  },
  resolution: {
    decision: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);