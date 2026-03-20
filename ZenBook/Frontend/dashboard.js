// หน้าล็อคอินกับข้างในการจองห้อง
document.addEventListener('DOMContentLoaded', () => {
    const firstname = localStorage.getItem('firstname');
    const lastname = localStorage.getItem('lastname');
    const userNameDisplay = document.getElementById('userName');

    if (firstname) {
        userNameDisplay.textContent = `สวัสดี, คุณ ${firstname} ${lastname || ''}`;
    } else {
        window.location.href = 'index.html';
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});

const token = localStorage.getItem('token');
if (!token) {
    Swal.fire({
        icon: 'warning',
        title: 'แจ้งเตือน',
        text: 'กรุณาล็อกอินก่อนเข้าใช้งาน',
        confirmButtonText: 'ตกลง'
    }).then(() => {
        window.location.href = 'index.html';
    });
}

//ฟังก์ชันดึงข้อมูลห้องประชุม 
async function fetchRooms() {
    try {
        const response = await fetch('http://localhost:8000/api/rooms');
        const rooms = await response.json();
        
        const container = document.getElementById('roomContainer');
        if (!container) return;
        container.innerHTML = ''; 

        rooms.forEach(room => {
            let dotClass = '';
            let statusText = '';
            let buttonDisabled = '';
            let buttonText = 'จองห้องนี้';
            let buttonStyle = 'margin-top: 15px;';

            const isAvailable = room.is_available !== false; 

            if (isAvailable) {
                dotClass = 'dot-available';
                statusText = 'ว่าง';
            } else {
                dotClass = 'dot-booked';
                statusText = 'มีคนจองแล้ว';
                buttonDisabled = 'disabled';
                buttonText = 'ไม่สามารถจองได้';
                buttonStyle = 'margin-top: 15px; background-color: #ccc; cursor: not-allowed; border-color: #ccc;';
            }

            const imageUrl = room.image_url 
                ? `http://localhost:8000${room.image_url}` 
                : 'https://via.placeholder.com/300x180?text=No+Image';

            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <img src="${imageUrl}" class="room-card-img" alt="${room.name}">
                <div style="padding: 15px;">
                    <h3 class="room-name" style="margin-top:0;">${room.name}</h3>
                    <div class="room-status">
                        <span class="status-dot ${dotClass}"></span>
                        <span>${statusText}</span>
                    </div>
                    <span class="room-cap">👥 รองรับได้ ${room.capacity} ท่าน</span>
                    <p class="room-desc">${room.description || 'ไม่มีรายละเอียด'}</p>
                    
                    <button class="btn-primary" onclick='openBookingModal(${JSON.stringify(room)})' style="${buttonStyle}" ${buttonDisabled}>
                        ${buttonText}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching rooms:', error);
        const container = document.getElementById('roomContainer');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">ไม่สามารถโหลดข้อมูลห้องได้</p>';
        }
    }
}

// จองห้อง 
function openBookingModal(room) {
    document.getElementById('modalRoomId').value = room.id;
    document.getElementById('modalRoomName').textContent = `จองห้อง: ${room.name}`;
    
    const modalImg = document.getElementById('modalRoomImage');
    if (room.image_url) {
        modalImg.src = `http://localhost:8000${room.image_url}`;
        modalImg.style.display = 'block';
    } else {
        modalImg.style.display = 'none';
    }
    
    document.getElementById('bookingModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    const form = document.getElementById('bookingForm');
    if (form) form.reset(); 
}

//ส่วนจัดการ Submit Form จองห้อง 
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = bookingForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> กำลังบันทึกข้อมูล...';

       
        const rawStartTime = document.getElementById('startTime').value;
        const rawEndTime = document.getElementById('endTime').value;
        
        const formattedStartTime = rawStartTime.replace('T', ' ') + ':00';
        const formattedEndTime = rawEndTime.replace('T', ' ') + ':00';

        const bookingData = {
            room_id: document.getElementById('modalRoomId').value,
            title: document.getElementById('bookingTitle').value,
            start_time: formattedStartTime, 
            end_time: formattedEndTime      
        };
        

        try {
           
            const response = await fetch('http://localhost:8000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(bookingData)
            });
            const data = await response.json();
            
            if (response.ok) {
                
                Swal.fire({
                    position: "center",
                    icon: "success",
                    title: "จองห้องประชุมสำเร็จ!",
                    text: data.message,
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    closeModal();
                    fetchRooms(); // ดึงข้อมูลห้องใหม่
                });
            } else {
                // แจ้งเตือนกรณีจองไม่ผ่าน
                Swal.fire({
                    icon: "error",
                    title: "จองไม่สำเร็จ",
                    text: data.message,
                    confirmButtonText: 'ตกลง'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ข้อผิดพลาด",
                text: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์",
                confirmButtonText: 'ตกลง'
            });
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ระบบประวัติการจอง 
const myBookingsBtn = document.getElementById('myBookingsBtn');
if (myBookingsBtn) {
    myBookingsBtn.addEventListener('click', () => {
        document.getElementById('myBookingsModal').style.display = 'flex';
        fetchMyBookings(); 
    });
}

function closeMyBookingsModal() {
    document.getElementById('myBookingsModal').style.display = 'none';
}

async function fetchMyBookings() {
    try {
        const response = await fetch('http://localhost:8000/api/my-bookings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const bookings = await response.json();
        const container = document.getElementById('myBookingsList');
        if (!container) return;
        container.innerHTML = ''; 

        if (bookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: gray;">คุณยังไม่มีประวัติการจอง</p>';
            return;
        }

        bookings.forEach(booking => {
            const start = new Date(booking.start_time).toLocaleString('th-TH');
            const end = new Date(booking.end_time).toLocaleString('th-TH');
            const isConfirmed = booking.status === 'confirmed';
            
            const item = document.createElement('div');
            item.style.borderBottom = '1px solid #e0e0e0';
            item.style.padding = '15px 0';
            item.innerHTML = `
                <h4 style="margin: 0 0 8px 0;">หัวข้อ: ${booking.title}</h4>
                <div style="font-size: 14px; color: #555;">
                    <strong>ห้อง:</strong> ${booking.room_name} <br>
                    <strong>เวลา:</strong> ${start} - ${end} <br>
                    <strong>สถานะ:</strong> <span style="color: ${isConfirmed ? 'green' : 'red'};">${isConfirmed ? 'ยืนยันแล้ว' : 'ยกเลิกแล้ว'}</span>
                </div>
                ${isConfirmed ? `<button onclick="cancelBooking('${booking.id}')" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-top: 10px;">ยกเลิกการจอง</button>` : ''}
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cancelBooking(bookingId) {
   
    Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        text: "คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'ใช่, ยกเลิกเลย!',
        cancelButtonText: 'ย้อนกลับ'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/cancel`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                
                if (response.ok) {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "ยกเลิกสำเร็จ",
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        fetchMyBookings();
                        fetchRooms(); 
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถยกเลิกได้', 'error');
                }
            } catch (error) {
                Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            }
        }
    });
}

// เริ่มต้นดึงข้อมูลห้อง
fetchRooms();