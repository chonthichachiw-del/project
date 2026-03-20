const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// [POST] เข้าสู่ระบบ
router.post('/login', async (req, res) => {
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
            res.json({ message: 'ล็อกอินสำเร็จ', token, role: user.role, firstname: user.firstname, lastname: user.lastname });
        } else {
            res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        }
    } catch (error) {
        res.status(500).json({ error: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});

// [POST] สมัครสมาชิก
router.post('/register', async (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    try {
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        await db.query('INSERT INTO users (firstname, lastname, email, password, role) VALUES (?, ?, ?, ?, ?)', [firstname, lastname || '', email, password, 'user']);
        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});

module.exports = router;