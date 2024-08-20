const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: String,
    title: String,
    description: String,
    imageUrl: String,
    videoUrl: String,
    priority: String,
    location: {
        type: { type: String },
        coordinates: [Number],
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: [{
        author: String,
        text: String,
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

postSchema.index({ location: '2dsphere' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
