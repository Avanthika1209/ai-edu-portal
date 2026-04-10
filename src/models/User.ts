import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '🧑' },
  profilePic: { type: String, default: '' },
  purpose: { type: String, default: '' },
  streak: { type: Number, default: 0 },
  streakLastDate: { type: Date, default: null },
  streakLastDateKey: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.models.User || mongoose.model('User', UserSchema);
