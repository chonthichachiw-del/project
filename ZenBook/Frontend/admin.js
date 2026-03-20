// ==========================================
// 1. ระบบรักษาความปลอดภัย (เช็คสิทธิ์ Admin)
// ==========================================
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || role !== 'admin') {
    // เปลี่ยนจาก alert เป็น SweetAlert
    Swal.fire({
        icon: 'error',
        title: 'ปฏิเสธการเข้าถึง',
        text: 'ขออภัย หน้าเพจนี้สำหรับผู้ดูแลระบบเท่านั้น!',
        showConfirmButton: false,
        timer: 2000
    }).then(() => {
        window.location.href = 'index.html';
    });
} else {
    // โหลดชื่อ Admin มาแสดงถ้าผ่านการเช็คสิทธิ์
    const firstname = localStorage.getItem('firstname');
    if (firstname) {
        document.getElementById('adminName').textContent = `สวัสดี, คุณ ${firstname} Admin`;
    }
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
    fetchAllRooms(); 
});

menuAllBookings.addEventListener('click', () => {
    sectionAddRoom.style.display = 'none';
    sectionAllBookings.style.display = 'block';
    menuAllBookings.className = 'btn-primary';
    menuAddRoom.className = 'btn-outline';
    fetchAllBookings();
});

// ==========================================
// 3. API - จัดการห้องประชุม (เพิ่ม/แสดง/ลบ/แก้ไข)
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
            
            Swal.fire({
                position: "center",
                icon: "success",
                title: "เพิ่มห้องประชุมสำเร็จ",
                text: data.message,
                showConfirmButton: false,
                timer: 1500
            });
            document.getElementById('addRoomForm').reset();
            fetchAllRooms(); 
        } else {
            Swal.fire('เพิ่มไม่สำเร็จ', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ', 'error');
    }
});

// ดึงรายชื่อห้องมาโชว์ในตาราง (รวมปุ่มแก้ไขและลบไว้ด้วยกัน)
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
                    <td>
                        <button class="btn-primary" onclick="openEditModal(${room.id}, '${room.name}', ${room.capacity}, '${room.description || ''}')">แก้ไข</button>
                        <button class="btn-cancel" onclick="deleteRoom(${room.id})">ลบ</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error(error); }
}

// ลบห้องประชุม
async function deleteRoom(roomId) {
   
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "คุณต้องการลบห้องประชุมนี้ใช่หรือไม่? (ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้)",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:8000/api/admin/rooms/${roomId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "ลบเรียบร้อย",
                        showConfirmButton: false,
                        timer: 1500
                    });
                    fetchAllRooms();
                } else {
                    Swal.fire('ลบไม่สำเร็จ', 'ไม่สามารถลบห้องนี้ได้', 'error');
                }
            } catch (error) { 
                Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ', 'error');
            }
        }
    });
}

// 1. ฟังก์ชันเปิดหน้าต่างแก้ไข (เด้งฟอร์มขึ้นมา)
function openEditModal(id, name, cap, desc) {
    document.getElementById('editRoomId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editCapacity').value = cap;
    document.getElementById('editDesc').value = desc !== 'null' ? desc : '';
    document.getElementById('editModal').style.display = 'block';
}

// 2. ฟังก์ชันบันทึกข้อมูลแก้ไข (ส่งไปที่ API)
async function saveEdit() {
    const roomId = document.getElementById('editRoomId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('editName').value);
    formData.append('capacity', document.getElementById('editCapacity').value);
    formData.append('description', document.getElementById('editDesc').value);
    
    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
        const response = await fetch(`http://localhost:8000/api/admin/rooms/${roomId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            //  แจ้งเตือนสำเร็จและปิดหน้าต่างอัตโนมัติ
            Swal.fire({
                position: "center",
                icon: "success",
                title: "แก้ไขข้อมูลเรียบร้อย",
                showConfirmButton: false,
                timer: 1500
            });
            document.getElementById('editModal').style.display = 'none';
            fetchAllRooms(); 
        } else {
            Swal.fire('แก้ไขไม่สำเร็จ', 'ตรวจสอบข้อมูลอีกครั้ง', 'error');
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ', 'error');
    }
}

// ==========================================
// 4. API - ดึงรายการจองของทุกคนในระบบ
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

        listContainer.innerHTML = ''; 

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
    Swal.fire({
        position: "center",
        icon: "success",
        title: "ออกจากระบบสำเร็จ",
        showConfirmButton: false,
        timer: 1000
    }).then(() => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});

fetchAllRooms();