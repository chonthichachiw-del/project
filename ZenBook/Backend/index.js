require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();


app.use(cors());
app.use(express.json());

// ให้ Frontend เข้าถึงไฟล์รูปภาพในโฟลเดอร์ uploads ได้
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const userRoutes = require('./routes/user');
const roomRoutes = require('./routes/room');
const bookingRoutes = require('./routes/booking');

// ผูก Routes เข้ากับ /api
app.use('/api', userRoutes);
app.use('/api', roomRoutes);
app.use('/api', bookingRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Backend is running on port ${PORT} `));