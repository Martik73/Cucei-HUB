const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1, fields: 4, fieldSize: 2048 } }).single('photo');

module.exports = (req, res, next) => {
  upload(req, res, error => {
    if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'La foto no debe superar 1 MB' : 'No se pudo recibir la foto de perfil' });
    if (req.file) {
      const b = req.file.buffer;
      let type;
      if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) type = 'image/png';
      else if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) type = 'image/jpeg';
      else if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') type = 'image/webp';
      if (!type) return res.status(400).json({ message: 'Selecciona una imagen JPG, PNG o WebP válida' });
      req.profilePicture = `data:${type};base64,${b.toString('base64')}`;
    }
    next();
  });
};
