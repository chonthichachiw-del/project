SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- 1. ตาราง users (เก็บข้อมูลผู้ใช้และสิทธิ์)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE, -- ใช้ email ในการ login
  `password` varchar(255) NOT NULL,     -- รหัสผ่าน (ต้อง hash ในอนาคต)
  `role` enum('user','admin') DEFAULT 'user',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ตาราง rooms (เก็บข้อมูลห้อง)
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL,
  `description` text,
  `image_url` varchar(255) DEFAULT NULL, -- สำหรับโชว์รูปห้อง (ประยุกต์ File Upload)
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ตาราง bookings (เก็บประวัติการจอง)
-- ความสัมพันธ์: users (1) ──< (many) bookings, rooms (1) ──< (many) bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('confirmed','cancelled') DEFAULT 'confirmed',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ข้อมูลตัวอย่างสำหรับ Demo
INSERT INTO `users` (`firstname`, `lastname`, `email`, `password`, `role`) VALUES
('Somchai', 'Jaidee', 'admin@meetspace.com', '123456', 'admin'),
('Somying', 'Rakrian', 'user@meetspace.com', '123456', 'user');

INSERT INTO `rooms` (`name`, `capacity`, `description`) VALUES
('Sakura Room', 5, 'ห้องประชุมมินิมอลขนาดเล็ก สำหรับคุยงาน 2-5 คน'),
('Komorebi Hall', 20, 'ห้องประชุมใหญ่ บรรยากาศอบอุ่น แสงธรรมชาติเข้าถึง'),
('Zen Lounge', 10, 'พื้นที่ส่วนกลางสำหรับนั่งทำงานและประชุมกลุ่ม');

COMMIT;