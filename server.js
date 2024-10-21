const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const app = express();

app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'auctionbazaar'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Register User API
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const [existingUser] = await db.promise().query(`SELECT * FROM users WHERE email = ?`, [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    await db.promise().query(`INSERT INTO users (email, password, name) VALUES (?, ?, ?)`, [email, hashedPassword, name]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




// Login User API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    try {
      // Check if user exists
      const [user] = await db.promise().query(`SELECT * FROM users WHERE email = ?`, [email]);
      if (user.length === 0) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      const validPassword = await bcrypt.compare(password, user[0].password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Invalid password' });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: user[0].id, email: user[0].email, role: user[0].role }, 'your_jwt_secret', { expiresIn: '1h' });
  
      res.status(200).json({ token, message: 'Login successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  


  // Create Auction API
app.post('/api/auctions', async (req, res) => {
    const { title, description, start_price, end_time, seller_id } = req.body;
    
    if (!title || !description || !start_price || !end_time || !seller_id) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    try {
      await db.promise().query(
        `INSERT INTO auctions (title, description, start_price, seller_id, end_time) VALUES (?, ?, ?, ?, ?)`,
        [title, description, start_price, seller_id, end_time]
      );
      res.status(201).json({ message: 'Auction created successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  


  // Get All Auctions API
app.get('/api/auctions', async (req, res) => {
    try {
      const [auctions] = await db.promise().query(`SELECT * FROM auctions`);
      res.status(200).json(auctions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  



// Place Bid API
app.post('/api/auctions/:auctionId/bids', async (req, res) => {
    const { auctionId } = req.params;
    const { bidder_id, amount } = req.body;
  
    if (!bidder_id || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    try {
      // Check if auction exists and has not ended
      const [auction] = await db.promise().query(`SELECT * FROM auctions WHERE id = ?`, [auctionId]);
      if (auction.length === 0) {
        return res.status(404).json({ message: 'Auction not found' });
      }
  
      const auctionEndTime = new Date(auction[0].end_time);
      const currentTime = new Date();
      if (currentTime > auctionEndTime) {
        return res.status(400).json({ message: 'Auction has ended' });
      }
  
      // Check if bid amount is higher than current price
      const currentPrice = auction[0].current_price || auction[0].start_price;
      if (amount <= currentPrice) {
        return res.status(400).json({ message: 'Bid amount must be higher than current price' });
      }
  
      // Insert bid and update auction current price
      await db.promise().query(`INSERT INTO bids (auction_id, bidder_id, amount) VALUES (?, ?, ?)`, [auctionId, bidder_id, amount]);
      await db.promise().query(`UPDATE auctions SET current_price = ? WHERE id = ?`, [amount, auctionId]);
  
      res.status(201).json({ message: 'Bid placed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  


  const multer = require('multer');

// Set up Multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Modify Auction Creation API to handle image upload
app.post('/api/auctions', upload.single('image'), async (req, res) => {
  const { title, description, start_price, end_time, seller_id } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !description || !start_price || !end_time || !seller_id) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    await db.promise().query(
      `INSERT INTO auctions (title, description, start_price, seller_id, end_time, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, start_price, seller_id, end_time, image_url]
    );
    res.status(201).json({ message: 'Auction created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
