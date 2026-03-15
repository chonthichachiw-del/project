document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // 1. ดึงข้อมูลจากฟอร์ม
    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.style.color = 'red';
    errorMessage.textContent = ''; // ล้างข้อความ Error เก่าออกก่อน

    // --- ส่วนที่ 1: ตรวจสอบว่ากรอกข้อมูลครบหรือไม่ ---
    if (!firstname || !lastname || !email || !password) {
        errorMessage.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
        return; // หยุดการทำงาน
    }

    // --- ส่วนที่ 2: ตรวจสอบเงื่อนไขรหัสผ่าน (8 ตัวขึ้นไป + ห้ามอักขระพิเศษ) ---
    const passwordRegex = /^[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(password)) {
        errorMessage.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และใช้ได้เฉพาะภาษาอังกฤษและตัวเลขเท่านั้น';
        return; // หยุดการทำงาน
    }

    try {
        // 2. ส่งข้อมูลไปที่ Backend
        const response = await fetch('http://localhost:8000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                firstname: firstname, 
                lastname: lastname,
                email: email, 
                password: password 
            })
        });

        const data = await response.json();

        // 3. เช็คผลลัพธ์
        if (response.ok) {
            alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            window.location.href = 'index.html';
        } else {
            // กรณี Backend ส่ง Error กลับมา (เช่น อีเมลซ้ำ)
            errorMessage.textContent = data.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        }

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    }
});