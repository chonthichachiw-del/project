const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const nodemailer = require('nodemailer');//*ใช้ส่งเมล์

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const formatThaiTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', { 
        timeZone: 'Asia/Bangkok', 
        dateStyle: 'medium',   
        timeStyle: 'short'
    });
};    

// [POST] จองห้อง
router.post('/bookings', verifyToken, async (req, res) => {
    try {
        const { room_id, title, start_time, end_time } = req.body;
        if (!room_id || !start_time || !end_time) return res.status(400).json({ message: 'ข้อมูลไม่ครบ' });

        const [conflicts] = await db.query(`SELECT id FROM bookings WHERE room_id = ? AND status = 'confirmed' AND (start_time < ? AND end_time > ?)`, [room_id, end_time, start_time]);
        if (conflicts.length > 0) return res.status(400).json({ message: 'ห้องไม่ว่าง' });

        const [result] = await db.query(`INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'confirmed')`, [room_id, req.user.id, title, start_time, end_time]);
        //S
        try {
            await transporter.sendMail({
                from: '"MeetSpace System" <noreply@meetspace.com>',
                to: req.user.email,
                subject: 'ยืนยันการจองห้อง',
                text: `จองสำเร็จ!\nหัวข้อ: ${title}\nเริ่ม: ${start_time}\nสิ้นสุด: ${end_time}`
            });
        } catch (err) { console.error("ส่งเมลไม่สำเร็จ"); }

        res.status(201).json({ message: 'จองสำเร็จ', booking_id: result.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// [GET] ประวัติจองของฉัน
router.get('/my-bookings', verifyToken, async (req, res) => {
    try {
        const [bookings] = await db.query(`SELECT b.*, r.name as room_name FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.user_id = ? ORDER BY b.start_time DESC`, [req.user.id]);
        res.json(bookings);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// [PUT] ยกเลิกจอง
router.put('/bookings/:id/cancel', verifyToken, async (req, res) => {
    try {
        const [booking] = await db.query('SELECT user_id FROM bookings WHERE id = ?', [req.params.id]);
        if (booking.length === 0) return res.status(404).json({ message: 'ไม่พบการจอง' });
        if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });

        await db.query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
        res.json({ message: 'ยกเลิกสำเร็จ' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// [GET] Admin ดูคิวทั้งหมด
router.get('/admin/bookings', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะ Admin' });
        const [bookings] = await db.query(`SELECT b.*, r.name as room_name, u.firstname, u.lastname FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN users u ON b.user_id = u.id ORDER BY b.start_time DESC`);
        res.json(bookings);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;