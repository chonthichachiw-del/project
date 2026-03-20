document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // ป้องกันเว็บรีเฟรช

    // เติม .trim() เพื่อตัดช่องว่างหัวท้าย ป้องกันการพิมพ์แค่สเปซบาร์
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('errorMessage');

    // ล้างข้อความ Error เก่าออกก่อน
    if (errorDiv) {
        errorDiv.textContent = '';
    }

    
    if (!email) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอกอีเมลของคุณ'
        });
        return; // หยุดการทำงาน ไม่ส่งข้อมูลไป Backend
    }

    if (!password) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอกรหัสผ่านของคุณ'
        });
        return; 
    }
    
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
            //  เก็บ Token LocalStorage ลงเครื่องผู้ใช้
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('firstname', data.firstname);
            
            localStorage.setItem('lastname', data.lastname); 
            
         
            window.location.href = 'dashboard.html';
        } else {
           
            errorDiv.textContent = data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        }
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ ลองเช็คว่า Backend รันอยู่หรือไม่';
    }
});