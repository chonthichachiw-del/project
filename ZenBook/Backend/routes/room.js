const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตั้งค่า Upload ภาพในไฟล์นี้
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'room-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET ดึงห้องประชุมทั้งหมด
router.get('/rooms', async (req, res) => {
    try {
        const sql = `SELECT r.*, IF(EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.status = 'confirmed'), false, true) AS is_available FROM rooms r`;
        const [rooms] = await db.query(sql);
        res.json(rooms.map(room => ({ ...room, is_available: room.is_available === 1 || room.is_available === true })));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET ดึงห้องประชุมตาม ID
router.get('/rooms/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบห้องประชุมนี้' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST Admin เพิ่มห้อง
router.post('/admin/rooms', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะ Admin' });
        const { name, capacity, description } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        await db.query(`INSERT INTO rooms (name, capacity, description, image_url) VALUES (?, ?, ?, ?)`, [name, capacity, description, image_url]);
        res.status(201).json({ message: 'เพิ่มห้องสำเร็จ' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT Admin แก้ไขห้อง
router.put('/admin/rooms/:id', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะ Admin' });
        const { name, capacity, description } = req.body;
        let query = 'UPDATE rooms SET name = ?, capacity = ?, description = ?';
        let params = [name, capacity, description];
        if (req.file) { query += ', image_url = ?'; params.push(`/uploads/${req.file.filename}`); }
        query += ' WHERE id = ?'; params.push(req.params.id);
        await db.query(query, params);
        res.json({ message: 'แก้ไขห้องสำเร็จ' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE Admin ลบห้อง
router.delete('/admin/rooms/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'เฉพาะ Admin' });
        await db.query("DELETE FROM rooms WHERE id = ?", [req.params.id]);
        res.json({ message: "ลบห้องสำเร็จ" });
    } catch (error) { res.status(500).json({ error: "ลบไม่สำเร็จ" }); }
});

module.exports = router;