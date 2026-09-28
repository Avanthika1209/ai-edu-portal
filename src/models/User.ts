import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '🧑' },
  profilePic: { type: String, default: '' },
  purpose: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.models.User || mongoose.model('User', UserSchema);