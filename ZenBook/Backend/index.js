require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ตั้งค่า Transport (ตัวอย่างนี้ใช้ Gmail, ถ้าใช้ Email อื่นให้หา SMTP ของเจ้านั้นๆ)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // อีเมลของคุณ
        pass: process.env.EMAIL_PASS  // รหัสผ่าน (หรือ App Password)
    }
});

// ==========================================
// 1. ตั้งค่าการอัปโหลดไฟล์ (เก็บรูปห้องประชุม)
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'room-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ==========================================
// 2. ตั้งค่าเชื่อมต่อ Database
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// ==========================================
// 3. Middleware ตรวจสอบ Token (Auth)
// ==========================================
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) return res.status(403).json({ message: 'กรุณาล็อกอินก่อนใช้งาน' });

    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        req.user = decoded;
        next();
    });
};

// ==========================================
// 4. API ระบบจองห้องประชุม (MeetSpace)
// ==========================================

// 🔑 [POST] เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

        if (users.length > 0) {
            const user = users[0];
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, firstname: user.firstname },
                process.env.JWT_SECRET,
                { expiresIn: '2h' }
            );
            res.json({
                message: 'ล็อกอินสำเร็จ',
                token: token,
                role: user.role,
                firstname: user.firstname,
                lastname: user.lastname // ดึงนามสกุลมาด้วย
            });
        } else {
            // แก้ไข: เอา else มาครอบเพื่อให้โค้ดทำงานถูกต้องเมื่อไม่พบผู้ใช้
            res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ กรุณาตรวจสอบฐานข้อมูล' });
    }
});

// 📝 [POST] สมัครสมาชิกใหม่ (แก้ไขให้รองรับคอลัมน์ lastname ใน Database)
app.post('/api/register', async (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    try {
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
        }

        await db.query(
            'INSERT INTO users (firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [firstname, lastname || '', email, password, 'user']
        );

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ กรุณาตรวจสอบฐานข้อมูล' });
    }
});

// 🌟 [GET] ดึงข้อมูลห้องประชุมทั้งหมด พร้อมสถานะ ว่าง/ไม่ว่าง ณ ปัจจุบัน
app.get('/api/rooms', async (req, res) => {
    try {
        const sql = `
            SELECT r.*, 
                   IF(
                       EXISTS (
                           SELECT 1 FROM bookings b 
                           WHERE b.room_id = r.id 
                             AND b.status = 'confirmed' -- เช็คแค่ว่ามีการจองที่ยืนยันแล้ว
                       ), 
                       false, -- ถ้ามีคิวจอง (ไม่ว่าง) ส่ง false = จุดแดง
                       true   -- ถ้าไม่มีคิวเลย (ว่าง) ส่ง true = จุดเขียว
                   ) AS is_available
            FROM rooms r
        `;
        const [rooms] = await db.query(sql);

        const formattedRooms = rooms.map(room => ({
            ...room,
            is_available: room.is_available === 1 || room.is_available === true 
        }));

        res.json(formattedRooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📅 [POST] สร้างการจองห้องประชุม (ปรับปรุงเพื่อ Debug ได้ง่ายขึ้น)
app.post('/api/bookings', verifyToken, async (req, res) => {
    // 1. เพิ่ม Log เพื่อดูว่า Frontend ส่งอะไรมา
    console.log("ได้รับข้อมูลการจองจาก Frontend:", req.body);
    
    try {
        const { room_id, title, start_time, end_time } = req.body;
        const user_id = req.user.id;

        // เช็คว่ามีข้อมูลครบไหม
        if (!room_id || !start_time || !end_time) {
            console.error("ข้อมูลไม่ครบ!");
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // 2. เช็ค Conflict เหมือนเดิม
        const checkQuery = `
            SELECT id FROM bookings 
            WHERE room_id = ? AND status = 'confirmed' 
            AND (start_time < ? AND end_time > ?)
        `;
        const [conflicts] = await db.query(checkQuery, [room_id, end_time, start_time]);

        if (conflicts.length > 0) {
            console.error("ห้องไม่ว่างในช่วงเวลานี้");
            return res.status(400).json({ message: 'ขออภัย ห้องประชุมนี้ไม่ว่างในช่วงเวลาที่คุณเลือก' });
        }

        // 3. บันทึกข้อมูล
        const [result] = await db.query(
            `INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'confirmed')`,
            [room_id, user_id, title, start_time, end_time]
        );

        // 4. ส่งเมล (ใส่ Log เพิ่มเติม)
        try {
            console.log("กำลังส่งอีเมลหา:", req.user.email);
            const info = await transporter.sendMail({
                from: '"MeetSpace System" <noreply@meetspace.com>',
                to: req.user.email,
                subject: 'ยืนยันการจองห้องประชุมสำเร็จ',
                text: `คุณได้จองห้องประชุมสำเร็จแล้ว! \nหัวข้อ: ${title} \nเริ่ม: ${start_time} \nสิ้นสุด: ${end_time}`
            });
            console.log("ส่งเมลสำเร็จ:", info.messageId);
        } catch (emailError) {
            console.error("ส่งเมลไม่สำเร็จ (แต่การจองบันทึกแล้ว):", emailError);
        }

        res.status(201).json({ message: 'จองห้องประชุมสำเร็จ', booking_id: result.insertId });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// 📝 [GET] ดึงประวัติการจองของฉัน (สำหรับ User)
app.get('/api/my-bookings', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT b.*, r.name as room_name 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.id 
            WHERE b.user_id = ? 
            ORDER BY b.start_time DESC
        `;
        const [bookings] = await db.query(query, [req.user.id]);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// [GET] - ดึงประวัติการจองของผู้ใช้ที่ล็อกอิน (ซ้ำซ้อนกับด้านบน แต่เก็บไว้ให้ตามเดิมครับ)
app.get('/api/bookings', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [bookings] = await db.query(
            `SELECT bookings.*, rooms.name AS room_name 
             FROM bookings 
             LEFT JOIN rooms ON bookings.room_id = rooms.id 
             WHERE bookings.user_id = ? 
             ORDER BY bookings.start_time DESC`,
            [userId]
        );
        res.status(200).json(bookings);

    } catch (error) {
        console.error('Error in GET /api/bookings:', error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการจอง" });
    }
});

// ❌ [PUT] ยกเลิกการจอง (เปลี่ยนสถานะเป็น cancelled)
app.put('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
    try {
        const [booking] = await db.query('SELECT user_id FROM bookings WHERE id = ?', [req.params.id]);
        if (booking.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลการจอง' });

        if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' });
        }

        await db.query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
        res.json({ message: 'ยกเลิกการจองสำเร็จ' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 5. API สำหรับ Admin เท่านั้น
// ==========================================

// 👑 [POST] เพิ่มห้องประชุมใหม่ (อัปโหลดรูปภาพได้)
app.post('/api/admin/rooms', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });

        const { name, capacity, description } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        await db.query(
            `INSERT INTO rooms (name, capacity, description, image_url) VALUES (?, ?, ?, ?)`,
            [name, capacity, description, image_url]
        );

        res.status(201).json({ message: 'เพิ่มห้องประชุมเรียบร้อยแล้ว' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 👑 [GET] ดูคิวการจองทั้งหมด (Admin)
app.get('/api/admin/bookings', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });

        const query = `
            SELECT b.*, r.name as room_name, u.firstname, u.lastname 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.id 
            JOIN users u ON b.user_id = u.id
            ORDER BY b.start_time DESC
        `;
        const [bookings] = await db.query(query);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 👑 [DELETE] API สำหรับลบห้องประชุม (เฉพาะ Admin)
app.delete('/api/admin/rooms/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบห้องได้' });
        }

        const roomId = req.params.id;
        await db.query("DELETE FROM rooms WHERE id = ?", [roomId]);

        res.json({ message: "ลบห้องประชุมเรียบร้อยแล้ว!" });
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการลบ:", error);
        res.status(500).json({ error: "ลบข้อมูลไม่สำเร็จ" });
    }
});

// [PUT] แก้ไขข้อมูลห้องประชุมและอัปโหลดรูปภาพใหม่ (เฉพาะ Admin)
app.put('/api/admin/rooms/:id', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });

        const { name, capacity, description } = req.body;
        const roomId = req.params.id;
        
        let query = 'UPDATE rooms SET name = ?, capacity = ?, description = ?';
        let params = [name, capacity, description];

        // ถ้ามีการอัปโหลดรูปภาพใหม่เข้ามา ให้เพิ่มคอลัมน์ image_url เข้าไปใน Query
        if (req.file) {
            query += ', image_url = ?';
            params.push(`/uploads/${req.file.filename}`);
        }

        query += ' WHERE id = ?';
        params.push(roomId);

        await db.query(query, params);
        res.json({ message: 'แก้ไขข้อมูลห้องประชุมเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: error.message });
    }
});

// [GET] ดึงข้อมูลห้องประชุมตาม ID (สำหรับหน้าแก้ไข)
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบห้องประชุมนี้' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 6. เริ่มรัน Server
// ==========================================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(` Backend รันอยู่ที่พอร์ต ${PORT}`));