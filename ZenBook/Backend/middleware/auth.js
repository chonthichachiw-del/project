///ใช้สำหรับเช็คสิทธิ์การเข้าถึง
const jwt = require('jsonwebtoken');
require('dotenv').config();

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

module.exports = verifyToken;
