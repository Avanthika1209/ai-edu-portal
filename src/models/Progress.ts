import mongoose from 'mongoose';
const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  stats: [{
    topic: String,
    asked: Number,
    correct: Number,
    updatedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });
export default mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);