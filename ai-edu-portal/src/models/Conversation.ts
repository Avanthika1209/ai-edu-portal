import mongoose from 'mongoose';
const MessageSchema = new mongoose.Schema({ role: String, text: String });
const ConversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  messages: [MessageSchema],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);