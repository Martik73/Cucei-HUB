const path = require('path');
const fs   = require('fs');
const { Types } = require('mongoose');
const Community        = require('../models/Community');
const Material         = require('../models/Material');
const CommunityMessage = require('../models/CommunityMessage');

const parseId = (raw) => Types.ObjectId.isValid(raw) ? raw : null;

const listCommunities = async (req, res) => {
  try {
    const { search = '', materia = '', carrera = '' } = req.query;
    const communities = await Community.findAll({ search, materia, carrera });
    res.json({ communities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener comunidades' });
  }
};

const createCommunity = async (req, res) => {
  const { nombre, descripcion, materia, tema, carrera } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
  try {
    const community = await Community.create({
      nombre, descripcion, materia, tema, carrera, creatorId: req.user.uid,
    });
    await Community.join(community.id, req.user.uid);
    res.status(201).json({ message: 'Comunidad creada', community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear comunidad' });
  }
};

const getCommunity = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const community = await Community.findById(id, req.user.uid);
    if (!community) return res.status(404).json({ message: 'Comunidad no encontrada' });
    res.json({ community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener comunidad' });
  }
};

const joinCommunity = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ message: 'Comunidad no encontrada' });
    await Community.join(id, req.user.uid);
    res.json({ message: 'Te uniste a la comunidad' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al unirse a la comunidad' });
  }
};

const leaveCommunity = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    await Community.leave(id, req.user.uid);
    res.json({ message: 'Saliste de la comunidad' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al salir de la comunidad' });
  }
};

const getMaterials = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const materials = await Material.findByCommunity(id);
    res.json({ materials });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener materiales' });
  }
};

const uploadMaterial = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const isMember = await Community.isMember(id, req.user.uid);
    if (!isMember) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Solo los miembros pueden subir material' });
    }

    const { titulo, descripcion, tipo, youtubeUrl } = req.body;
    if (!titulo?.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'El título es obligatorio' });
    }

    if (tipo === 'pdf') {
      if (!req.file) return res.status(400).json({ message: 'Se requiere un archivo PDF' });
      const fileUrl = `/uploads/materials/${req.file.filename}`;
      const material = await Material.create({
        communityId: id, uploaderId: req.user.uid,
        titulo, descripcion, tipo: 'pdf', fileUrl, youtubeUrl: null,
      });
      return res.status(201).json({ message: 'Material subido', material });
    }

    if (tipo === 'youtube') {
      if (!youtubeUrl?.trim()) return res.status(400).json({ message: 'Se requiere la URL de YouTube' });
      const material = await Material.create({
        communityId: id, uploaderId: req.user.uid,
        titulo, descripcion, tipo: 'youtube', fileUrl: null, youtubeUrl: youtubeUrl.trim(),
      });
      return res.status(201).json({ message: 'Video agregado', material });
    }

    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Tipo de material inválido (pdf o youtube)' });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    console.error(err);
    res.status(500).json({ message: 'Error al subir material' });
  }
};

const deleteMaterial = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ message: 'Material no encontrado' });
    if (material.uploaderId !== req.user.uid)
      return res.status(403).json({ message: 'Solo el autor puede eliminar este material' });
    if (material.tipo === 'pdf' && material.fileUrl) {
      const filePath = path.join(__dirname, '../../', material.fileUrl);
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    await Material.delete(id);
    res.json({ message: 'Material eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar material' });
  }
};

const getMessages = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await CommunityMessage.findByCommunity(id, { page, limit });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
};

const sendMessage = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
  try {
    const isMember = await Community.isMember(id, req.user.uid);
    if (!isMember) return res.status(403).json({ message: 'Solo los miembros pueden escribir en la discusión' });
    const message = await CommunityMessage.create({ communityId: id, userId: req.user.uid, content });
    res.status(201).json({ message: 'Mensaje enviado', data: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};

module.exports = {
  listCommunities, createCommunity, getCommunity,
  joinCommunity, leaveCommunity,
  getMaterials, uploadMaterial, deleteMaterial,
  getMessages, sendMessage,
};
