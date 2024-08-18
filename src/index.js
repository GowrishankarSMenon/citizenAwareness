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
    try {
        const posts = await Post.find();
        res.render('feed', { posts, user: req.session.user });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.send('Error loading posts');
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
app.post('/create-post', upload.single('image'), async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    const { title, description, priority } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`; // URL to access the uploaded image

    try {
        const newPost = new Post({
            author: req.session.user.name,
            title,
            description,
            imageUrl,
            priority
        });
        await newPost.save();
        res.redirect('/feed?message=Post created successfully');
    } catch (error) {
        console.error('Error creating post:', error);
        res.redirect('/create-post?message=Error creating post');
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
