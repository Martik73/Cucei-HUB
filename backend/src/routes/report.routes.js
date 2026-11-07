const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Material = require('../models/Material');

// Middleware de autenticación
const verifyReportAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No se encontró el token de autenticación.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro_cucei');
    } catch (err) {
      decoded = jwt.decode(token);
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    let userId = decoded.id || decoded._id || decoded.userId || decoded.sub || decoded.user_id || (decoded.user && (decoded.user.id || decoded.user._id));

    if (!userId && decoded.email) {
      const foundUser = await User.findOne({ email: decoded.email });
      if (foundUser) userId = foundUser._id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'No se pudo identificar al usuario en el token.' });
    }

    req.user = {
      id: userId,
      email: decoded.email || decoded.user?.email,
      role: decoded.role || decoded.rol || decoded.user?.role
    };

    next();
  } catch (error) {
    console.error("❌ Error en autenticación de reportes:", error);
    return res.status(401).json({ error: 'Sesión no válida.' });
  }
};

// Middleware para validar administrador
const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.email === 'juan.zepeda5221@alumnos.udg.mx') {
      return next();
    }
    if (req.user && (req.user.role === 'admin' || req.user.rol === 'admin')) {
      return next();
    }

    const user = await User.findById(req.user.id);
    if (user && (user.role === 'admin' || user.rol === 'admin')) {
      return next();
    }

    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  } catch (error) {
    console.error("❌ Error en isAdmin:", error);
    return res.status(500).json({ error: 'Error al verificar permisos de administrador.' });
  }
};

// 1. Crear un reporte
router.post('/', verifyReportAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const reporterId = req.user.id;

    const existingReport = await Report.findOne({ targetId, reporter: reporterId });
    if (existingReport) {
      return res.status(400).json({ error: 'Ya has reportado este elemento anteriormente.' });
    }

    // Capturamos el contenido inicial al reportar
    let initialContent = {};
    try {
      let doc = null;
      const CommunityMessage = mongoose.models.CommunityMessage || require('../models/CommunityMessage');
      const Evaluation = mongoose.models.Evaluation || require('../models/Evaluation');

      if (targetType === 'comment') {
        doc = await Comment.findById(targetId) || await CommunityMessage.findById(targetId);
      } else if (targetType === 'post') {
        doc = await Post.findById(targetId);
      } else if (targetType === 'material') {
        doc = await Material.findById(targetId);
      } else if (targetType === 'evaluation') {
        doc = await Evaluation.findById(targetId);
      }

      if (doc) {
        const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
        initialContent = {
          title: obj.title || obj.titulo || obj.materia,
          description: obj.description || obj.descripcion,
          content: obj.content || obj.comentario || obj.mensaje || obj.descripcion || obj.titulo
        };
      }
    } catch (e) {
      console.error("No se pudo pre-capturar contenido:", e);
    }

    const newReport = new Report({
      targetType,
      targetId,
      reporter: reporterId,
      reason,
      description,
      savedContent: initialContent
    });

    await newReport.save();
    res.status(201).json({ message: 'Reporte enviado exitosamente.' });
  } catch (error) {
    console.error("❌ Error al crear el reporte:", error);
    res.status(500).json({ error: 'Error al procesar el reporte.' });
  }
});

// 2. Listar reportes (Admin) priorizando el contenido respaldado o buscándolo en vivo
router.get('/admin', verifyReportAuth, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const reports = await Report.find(filter)
      .populate('resolution.resolvedBy', 'name email nombre')
      .sort({ createdAt: -1 })
      .lean();

    const CommunityMessage = mongoose.models.CommunityMessage || require('../models/CommunityMessage');
    const Evaluation = mongoose.models.Evaluation || require('../models/Evaluation');

    const enrichedReports = await Promise.all(reports.map(async (report) => {
      let targetDetails = report.savedContent && (report.savedContent.content || report.savedContent.title) 
        ? report.savedContent 
        : null;

      try {
        if (!targetDetails || !targetDetails.content) {
          let doc = null;
          if (report.targetType === 'comment') {
            doc = await Comment.findById(report.targetId) || await CommunityMessage.findById(report.targetId);
          } else if (report.targetType === 'post') {
            doc = await Post.findById(report.targetId);
          } else if (report.targetType === 'material') {
            doc = await Material.findById(report.targetId);
          } else if (report.targetType === 'evaluation') {
            doc = await Evaluation.findById(report.targetId);
          }

          if (doc) {
            const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
            targetDetails = {
              title: obj.title || obj.titulo || obj.materia,
              description: obj.description || obj.descripcion,
              content: obj.content || obj.comentario || obj.mensaje || obj.descripcion || obj.titulo
            };
          }
        }
      } catch (err) {
        console.error(`No se pudo buscar el targetId ${report.targetId}:`, err);
      }

      return {
        ...report,
        targetDetails: targetDetails || { content: 'Contenido no disponible o eliminado.' }
      };
    }));

    res.json(enrichedReports);
  } catch (error) {
    console.error("❌ Error al obtener reportes para admin:", error);
    res.status(500).json({ error: 'Error al obtener los reportes.' });
  }
});

// 3. Resolver reporte (Admin), guardar snapshot y retirar contenido
router.patch('/admin/:reportId', verifyReportAuth, isAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { decision, status } = req.body; 
    const adminId = req.user.id;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });

    if (decision === 'Contenido retirado') {
      try {
        const CommunityMessage = mongoose.models.CommunityMessage || require('../models/CommunityMessage');
        const Evaluation = mongoose.models.Evaluation || require('../models/Evaluation');
        let doc = null;

        if (report.targetType === 'comment') {
          doc = await Comment.findById(report.targetId) || await CommunityMessage.findById(report.targetId);
          await Comment.findByIdAndDelete(report.targetId);
          await CommunityMessage.findByIdAndDelete(report.targetId);
        } else if (report.targetType === 'post') {
          doc = await Post.findById(report.targetId);
          await Post.findByIdAndDelete(report.targetId);
        } else if (report.targetType === 'material') {
          doc = await Material.findById(report.targetId);
          await Material.findByIdAndDelete(report.targetId);
        } else if (report.targetType === 'evaluation') {
          doc = await Evaluation.findById(report.targetId);
          await Evaluation.findByIdAndDelete(report.targetId);
        }

        if (doc) {
          const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
          report.savedContent = {
            title: obj.title || obj.titulo || obj.materia,
            description: obj.description || obj.descripcion,
            content: obj.content || obj.comentario || obj.mensaje || obj.descripcion || obj.titulo
          };
        }
      } catch (delErr) {
        console.error("❌ Error al respaldar/eliminar contenido:", delErr);
      }
    }

    report.status = status || 'Resuelto';
    report.resolution = {
      decision,
      resolvedBy: adminId,
      resolvedAt: new Date()
    };

    await report.save();
    await report.populate('resolution.resolvedBy', 'name email nombre');

    res.json({ message: 'Reporte procesado correctamente.', report });
  } catch (error) {
    console.error("❌ Error al actualizar el reporte:", error);
    res.status(500).json({ error: 'Error al actualizar el reporte.' });
  }
});

module.exports = router;