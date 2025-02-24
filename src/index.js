const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const User = require('./config'); // Import the User model
const Post = require('./postModel'); // Import the Post model

const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Login-tut', {
    // Removed deprecated options
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('Error connecting to MongoDB:', error));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware to parse the body of POST requests
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to serve static files (including uploaded images)
app.use(express.static(path.join(__dirname, 'public')));

// Configure session middleware
app.use(session({
    secret: '952688486969gowriakshayjayadev', // Change this to a secure, random secret key
    resave: false,
    saveUninitialized: false,
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Directory for storing uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});
const upload = multer({ storage });

// POST route to handle comment submission
app.post('/comment-post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { comment } = req.body;

        // Validate input
        if (!comment || !postId) {
            return res.status(400).send('Comment or Post ID is missing');
        }

        // Find the post by ID
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Add the new comment to the post's comments array
        post.comments.push({
            author: req.session.user ? req.session.user.name : 'Anonymous', // Change based on your user info
            text: comment,
            date: new Date()
        });

        // Save the post with the new comment
        await post.save();

        // Redirect back to the feed or post view
        res.redirect('/feed'); // Adjust as necessary
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to render the login page
app.get("/", (req, res) => {
    res.render("login", { message: req.query.message });
});

// Route to render the signup page
app.get("/signup", (req, res) => {
    res.render("signup", { message: req.query.message });
});

// Route to render the create post page
app.get('/create-post', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.render('createPost');
});

// Route to render the feed page
app.get('/feed', async (req, res) => {
    const userLatitude = parseFloat(req.query.latitude) || 0; // User's latitude
    const userLongitude = parseFloat(req.query.longitude) || 0; // User's longitude
    const sortByLocation = req.query.sortByLocation === 'on'; // Whether to sort by location
    const radius = req.query.radius || ''; // Radius for location-based filtering

    let filter = {};
    if (sortByLocation && radius) {
        filter = {
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [userLongitude, userLatitude],
                        parseFloat(radius) / 6378.1 // Radius in radians
                    ]
                }
            }
        };
    }

    try {
        const posts = await Post.find(filter).sort({ date: -1 }); // Adjust sorting as needed
        const groupedPosts = posts.reduce((acc, post) => {
            acc[post.priority].push(post);
            return acc;
        }, { high: [], medium: [], low: [] });

        res.render('feed', { 
            groupedPosts, 
            sortByLocation, 
            radius, 
            user: { latitude: userLatitude, longitude: userLongitude } // Assuming user location is available
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});





// Route to render user-specific posts
app.get('/my-posts', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    try {
        const posts = await Post.find({ author: req.session.user.name });
        res.render('myPosts', { posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.send('Error loading posts');
    }
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ name: email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user; // Save user info in session
            res.redirect('/feed?message=Login successful');
        } else {
            res.redirect('/?message=Invalid email or password');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.redirect('/?message=Error during login');
    }
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ name: email });
        if (existingUser) {
            return res.redirect('/signup?message=User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: email,
            password: hashedPassword
        });
        await newUser.save();
        res.redirect('/?message=Signup successful');
    } catch (error) {
        console.error('Error during signup:', error);
        res.redirect('/signup?message=Error during signup');
    }
});

// Handle post creation
app.post('/create-post', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    const { title, description, priority, latitude, longitude } = req.body;
    const imageUrl = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
    const videoUrl = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;

    try {
        const newPost = new Post({
            author: req.session.user.name,
            title,
            description,
            imageUrl,
            videoUrl, // Include videoUrl
            priority,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            }
        });
        await newPost.save();
        res.redirect('/feed?message=Post created successfully');
    } catch (error) {
        console.error('Error creating post:', error);
        res.redirect('/create-post?message=Error creating post');
    }
});

// Handle comment submission
app.post('/comment-post/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    const { comment } = req.body;

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        post.comments.push({
            author: req.session.user.name,
            text: comment,
        });

        await post.save();
        res.redirect('/feed?message=Comment added successfully');
    } catch (error) {
        console.error('Error adding comment:', error);
        res.redirect('/feed?message=Error adding comment');
    }
});



// Handle deleting a post
app.post('/delete-post/:id', async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.redirect('/my-posts?message=Post deleted successfully');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.redirect('/my-posts?message=Error deleting post');
    }
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/feed?message=Error during logout');
        }
        res.redirect('/');
    });
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
