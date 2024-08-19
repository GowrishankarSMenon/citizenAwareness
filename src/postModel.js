const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    author: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    date: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    locationName: {
        type: String // Optional: name of the location
    }
});

// Create a 2dsphere index for geospatial queries
PostSchema.index({ location: '2dsphere' });

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
