// ==========================================
// 1. ระบบรักษาความปลอดภัย (เช็คสิทธิ์ Admin)
// ==========================================
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || role !== 'admin') {
    alert('⛔ ขออภัย หน้าเพจนี้สำหรับผู้ดูแลระบบเท่านั้น');
    window.location.href = 'index.html';
}

const firstname = localStorage.getItem('firstname');
if (firstname) {
    document.getElementById('adminName').textContent = `สวัสดี, คุณ ${firstname} 👑`;
}

// ==========================================
// 2. ระบบสลับหน้าต่าง (Tabs)
// ==========================================
const sectionAddRoom = document.getElementById('sectionAddRoom');
const sectionAllBookings = document.getElementById('sectionAllBookings');
const menuAddRoom = document.getElementById('menuAddRoom');
const menuAllBookings = document.getElementById('menuAllBookings');

menuAddRoom.addEventListener('click', () => {
    sectionAddRoom.style.display = 'block';
    sectionAllBookings.style.display = 'none';
    menuAddRoom.className = 'btn-primary';
    menuAllBookings.className = 'btn-outline';
    fetchAllRooms(); // ดึงรายชื่อห้องมาโชว์เมื่อกดหน้านี้
});

menuAllBookings.addEventListener('click', () => {
    sectionAddRoom.style.display = 'none';
    sectionAllBookings.style.display = 'block';
    menuAllBookings.className = 'btn-primary';
    menuAddRoom.className = 'btn-outline';
    fetchAllBookings();
});

// ==========================================
// 3. API - จัดการห้องประชุม (เพิ่ม/แสดง/ลบ)
// ==========================================

// เพิ่มห้องใหม่
document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', document.getElementById('roomName').value);
    formData.append('capacity', document.getElementById('roomCapacity').value);
    formData.append('description', document.getElementById('roomDesc').value);
    const imageFile = document.getElementById('roomImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
        const response = await fetch('http://localhost:8000/api/admin/rooms', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            alert('✅ ' + data.message);
            document.getElementById('addRoomForm').reset();
            fetchAllRooms(); // รีเฟรชรายชื่อห้อง
        } else {
            alert('❌ เพิ่มไม่สำเร็จ: ' + data.message);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาด');
    }
});

// ดึงรายชื่อห้องมาโชว์ในตาราง
async function fetchAllRooms() {
    try {
        const response = await fetch('http://localhost:8000/api/rooms');
        const rooms = await response.json();
        const container = document.getElementById('adminRoomList');
        if (!container) return;
        container.innerHTML = '';
        rooms.forEach(room => {
            container.innerHTML += `
                <tr>
                    <td>${room.name}</td>
                    <td>${room.capacity} คน</td>
                    <td><button class="btn-cancel" onclick="deleteRoom(${room.id})">ลบ</button></td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}

// ลบห้องประชุม
async function deleteRoom(roomId) {
    if (!confirm('ยืนยันการลบห้องประชุมนี้?')) return;
    try {
        const response = await fetch(`http://localhost:8000/api/admin/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert('✅ ลบเรียบร้อย');
            fetchAllRooms();
        } else {
            alert('❌ ลบไม่สำเร็จ');
        }
    } catch (error) { alert('เกิดข้อผิดพลาด'); }
}

// ==========================================
// 4. API - ดึงรายการจองของทุกคนในระบบ (ใส่โค้ดนี้แทนที่อันเดิม)
// ==========================================
async function fetchAllBookings() {
    const listContainer = document.getElementById('allBookingsList');
    listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const response = await fetch('http://localhost:8000/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const bookings = await response.json();

        if (bookings.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">ยังไม่มีประวัติการจองในระบบ</td></tr>';
            return;
        }

        listContainer.innerHTML = ''; // เคลียร์ Loading ออก

        // วนลูปสร้างแถวในตาราง
        bookings.forEach(b => {
            const startDate = new Date(b.start_time).toLocaleString('th-TH');
            const endDate = new Date(b.end_time).toLocaleString('th-TH');
            const isCancelled = b.status === 'cancelled';
            const statusBadge = isCancelled
                ? '<span style="color: red; font-weight: 500;">❌ ยกเลิกแล้ว</span>'
                : '<span style="color: green; font-weight: 500;">✅ ยืนยันการจอง</span>';

            const userName = `${b.firstname} ${b.lastname || ''}`;

            listContainer.innerHTML += `
                <tr>
                    <td><strong>${b.title}</strong></td>
                    <td>👤 ${userName.trim()}</td>
                    <td>🚪 ${b.room_name}</td>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</td></tr>';
    }
}


// ==========================================
// 5. Logout
// ==========================================
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ดึงรายชื่อห้องมาโชว์ในตาราง (เวอร์ชันที่มีปุ่มแก้ไข)
async function fetchAllRooms() {
    try {
        const response = await fetch('http://localhost:8000/api/rooms');
        const rooms = await response.json();
        const container = document.getElementById('adminRoomList');
        if (!container) return;
        
        container.innerHTML = '';
        rooms.forEach(room => {
            // สังเกตตรงนี้ครับ ผมเพิ่มปุ่ม "แก้ไข" เข้าไปให้แล้ว
            container.innerHTML += `
                <tr>
                    <td>${room.name}</td>
                    <td>${room.capacity} คน</td>
                    <td>
                        <button class="btn-primary" onclick="openEditModal(${room.id}, '${room.name}', ${room.capacity}, '${room.description}')">แก้ไข</button>
                        <button class="btn-cancel" onclick="deleteRoom(${room.id})">ลบ</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}

// 1. ฟังก์ชันเปิดหน้าต่างแก้ไข (เด้งฟอร์มขึ้นมา)
function openEditModal(id, name, cap, desc) {
    // ต้องแน่ใจว่าใน HTML ของคุณมี input ที่มี ID ตามนี้
    document.getElementById('editRoomId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editCapacity').value = cap;
    document.getElementById('editDesc').value = desc;
    document.getElementById('editModal').style.display = 'block';
}

// 2. ฟังก์ชันบันทึกข้อมูล (ส่งไปที่ API)
async function saveEdit() {
    const roomId = document.getElementById('editRoomId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('editName').value);
    formData.append('capacity', document.getElementById('editCapacity').value);
    formData.append('description', document.getElementById('editDesc').value);
    
    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    const response = await fetch(`http://localhost:8000/api/admin/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (response.ok) {
        alert('✅ แก้ไขข้อมูลเรียบร้อย');
        document.getElementById('editModal').style.display = 'none';
        fetchAllRooms(); 
    } else {
        alert('❌ แก้ไขไม่สำเร็จ');
    }
}

// เริ่มต้น: ดึงห้องมาแสดงทันทีที่โหลดหน้า
fetchAllRooms();