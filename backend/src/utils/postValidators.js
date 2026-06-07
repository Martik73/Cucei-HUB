/**
 * Constantes y validadores para el módulo de publicaciones.
 * Constants and validators for the posts module.
 */

const POST_TYPES = ['general', 'carrera'];
const POST_CATEGORIES = ['duda', 'evento', 'trabajo', 'general'];
const REACTION_TYPES = ['like', 'love', 'celebrate'];

const validatePostType     = (t) => POST_TYPES.includes(t);
const validatePostCategory = (c) => POST_CATEGORIES.includes(c);
const validateReactionType = (r) => REACTION_TYPES.includes(r);

module.exports = {
  POST_TYPES,
  POST_CATEGORIES,
  REACTION_TYPES,
  validatePostType,
  validatePostCategory,
  validateReactionType,
};
