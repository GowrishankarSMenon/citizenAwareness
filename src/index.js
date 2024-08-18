const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('./config'); // Import the User model

const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Login-tut', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('Error connecting to MongoDB:', error));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware to serve static files (if any)
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to render the login page
app.get("/", (req, res) => {
    res.render("login");
});

// Route to render the signup page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ name: email });
        if (user && await bcrypt.compare(password, user.password)) {
            res.redirect('/'); // Redirect on successful login
        } else {
            res.send('Invalid email or password');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Error during login');
    }
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ name: email });
        if (existingUser) {
            return res.send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: email,
            password: hashedPassword
        });
        await newUser.save();
        res.redirect('/'); // Redirect on successful signup
    } catch (error) {
        console.error('Error during signup:', error);
        res.send('Error during signup');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
