document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // ป้องกันเว็บรีเฟรช

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    try {
        // ยิง API ไปที่ Backend ของเรา
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // ถ้ายิงผ่าน เก็บ Token และข้อมูลลง LocalStorage เครื่องผู้ใช้
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('firstname', data.firstname);
            
            // 👇 [เพิ่มบรรทัดนี้] เก็บนามสกุลลงไปด้วย 👇
            localStorage.setItem('lastname', data.lastname); 
            
            // เปลี่ยนหน้าไปที่หน้าจองห้อง 
            window.location.href = 'dashboard.html';
        } else {
            // ถ้าพาสเวิร์ดผิด โชว์ Error
            errorDiv.textContent = data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        }
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ ลองเช็คว่า Backend รันอยู่หรือไม่';
    }
});