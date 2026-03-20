document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // 1. ดึงข้อมูลจากฟอร์ม
    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');

    // ล้างข้อความ Error สีแดงใต้ฟอร์มออก (เราจะเปลี่ยนไปใช้ ป็อปอัป แทน)
    errorMessage.textContent = ''; 
    if (!firstname) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อของคุณ' });
        return;
    }
    if (!lastname) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกนามสกุล' });
        return;
    }
    if (!email) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกอีเมล' });
        return;
    }
    if (!password) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกรหัสผ่าน' });
        return;
    }

    // ตรวจสอบเงื่อนไขรหัสผ่าน (8 ตัวขึ้นไป + ห้ามอักขระพิเศษ)
    const passwordRegex = /^[a-zA-Z0-9]{8,}$/;
    if (!passwordRegex.test(password)) {
        Swal.fire({ 
            icon: 'warning', 
            title: 'รูปแบบรหัสผ่านไม่ถูกต้อง', 
            text: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และใช้ได้เฉพาะภาษาอังกฤษและตัวเลขเท่านั้น' 
        });
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
            Swal.fire({
                icon: "success",
                title: "สมัครสมาชิกสำเร็จ!",
                text: "กำลังพาท่านไปหน้าเข้าสู่ระบบ...",
                showConfirmButton: false,
                timer: 1500 // แสดงป็อปอัปค้างไว้ 1.5 วินาที
            }).then(() => {
               
                window.location.href = 'index.html';
            });
            
        } else {
            // กรณี Backend ส่ง Error กลับมา (เช่น อีเมลซ้ำ) แจ้งเตือนด้วย SweetAlert2
            Swal.fire({
                icon: "error",
                title: "สมัครไม่สำเร็จ",
                text: data.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
            });
        }

    } catch (error) {
        console.error('Error:', error);
        // กรณีต่อ Backend ไม่ติด แจ้งเตือนด้วย SweetAlert2
        Swal.fire({
            icon: "error",
            title: "ระบบขัดข้อง",
            text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้"
        });
    }
});