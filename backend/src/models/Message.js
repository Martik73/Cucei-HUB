const mongoose = require('mongoose');

/**
 * @typedef {Object} IMessage
 * @property {mongoose.Types.ObjectId} sender   - Usuario que envía
 * @property {mongoose.Types.ObjectId} receiver - Usuario que recibe
 * @property {string} content                   - Contenido del mensaje
 * @property {boolean} read                     - Si el receptor lo leyó
 * @property {Date} createdAt
 */

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Índice para obtener conversaciones entre dos usuarios eficientemente
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
