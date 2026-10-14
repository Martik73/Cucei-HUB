const mongoose = require('mongoose');

const connectMongoDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cucei-hub';
  await mongoose.connect(uri);
  console.log(`✅ MongoDB conectado: ${mongoose.connection.host}`);
};

module.exports = { connectMongoDB };
