const mongoose = require('mongoose');

/**
 * @typedef {Object} IPost
 * @property {mongoose.Types.ObjectId} author - Referencia al User autor
 * @property {string} content                 - Texto de la publicación
 * @property {'general'|'carrera'} type       - Alcance del post
 * @property {string} [carrera]               - Carrera destino (si type='carrera')
 * @property {string[]} mediaUrls             - URLs de imágenes/archivos adjuntos
 * @property {mongoose.Types.ObjectId[]} likes- IDs de usuarios que dieron like
 * @property {IComment[]} comments            - Comentarios embebidos
 * @property {boolean} isActive               - Visible / no eliminado
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/** Esquema embebido de comentarios */
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['general', 'carrera'],
      default: 'general',
    },
    carrera: {
      type: String,
      default: null,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índice para feed por carrera
postSchema.index({ type: 1, carrera: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
