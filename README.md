# OmeClone - Random Video Chat Application

เว็บไซต์สุ่มวิดีโอแชตแบบ OmeTV ที่เขียนระบบเองทั้งหมดด้วย JavaScript ไม่ใช้ API ภายนอกที่เสียเงิน

## โครงสร้างโปรเจกต์

```
ma/
├── server.js              # Backend Server (Express + Socket.io)
├── package.json           # Project dependencies
├── public/
│   ├── index.html        # Frontend HTML
│   ├── style.css         # Frontend CSS
│   └── app.js            # Frontend JavaScript
└── README.md             # This file
```

## ฟีเจอร์หลัก

- ✅ ระบบล็อกอิน/สมัครสมาชิก ด้วย JWT Authentication
- ✅ ระบบจับคู่สุ่ม (Random Matching) แบบ 1 ต่อ 1
- ✅ วิดีโอแชตแบบ Real-time ด้วย WebRTC
- ✅ แชตข้อความ (Text Chat) แบบ Real-time
- ✅ ปุ่ม Next เพื่อเปลี่ยนคู่สนทนา
- ✅ ใช้ Google Free STUN Server (ไม่เสียเงิน)

## การติดตั้ง

### 1. ติดตั้ง Node.js
ดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/

### 2. ติดตั้ง Dependencies
เปิด Terminal หรือ Command Prompt ที่โฟลเดอร์โปรเจกต์ แล้วรันคำสั่ง:

```bash
npm install
```

### 3. รัน Server
```bash
npm start
```

หรือใช้โหมด Development (auto-restart):
```bash
npm run dev
```

Server จะรันที่ http://localhost:3000

## วิธีทดสอบ

### วิธีที่ 1: ใช้ 2 เบราว์เซอร์ต่างกัน
1. เปิดเบราว์เซอร์ตัวแรก (เช่น Chrome) ไปที่ http://localhost:3000
2. สมัครสมาชิกและล็อกอินด้วย username: "user1"
3. เปิดเบราว์เซอร์ตัวที่สอง (เช่น Firefox) ไปที่ http://localhost:3000
4. สมัครสมาชิกและล็อกอินด้วย username: "user2"
5. กดปุ่ม "Find Match" บนทั้ง 2 เบราว์เซอร์
6. รอสักครู่ ระบบจะจับคู่ให้ทั้ง 2 คน
7. คุณจะเห็นวิดีโอของกันและกัน และสามารถแชตได้

### วิธีที่ 2: ใช้ 2 แท็บในเบราว์เซอร์เดียวกัน
1. เปิดเบราว์เซอร์ ไปที่ http://localhost:3000
2. เปิดแท็บใหม่ (New Tab) ไปที่ http://localhost:3000
3. แท็บแรก: สมัคร/ล็อกอินด้วย "user1"
4. แท็บที่สอง: สมัคร/ล็อกอินด้วย "user2"
5. กด "Find Match" บนทั้ง 2 แท็บ
6. รอจับคู่ แล้วคุยกันได้

### วิธีที่ 3: ใช้ Incognito/Private Mode
1. เปิดเบราว์เซอร์ปกติ ล็อกอินด้วย "user1"
2. เปิด Incognito/Private Mode ล็อกอินด้วย "user2"
3. กด "Find Match" ทั้ง 2 หน้าต่าง
4. คุยกันได้

## การใช้งาน

### หน้า Login/Register
- เลือก Tab "Login" หรือ "Register"
- กรอก Username และ Password
- กดปุ่ม Login/Register

### หน้า Video Chat
- **วิดีโอซ้าย**: วิดีโอของคุณเอง (Local)
- **วิดีโอขวา**: วิดีโอของคู่สนทนา (Remote)
- **ปุ่ม Find Match**: ค้นหาคู่สนทนาใหม่
- **ปุ่ม Next**: เปลี่ยนคู่สนทนา (ตัดสายเดิม หาคู่ใหม่)
- **ช่องแชต**: พิมพ์ข้อความและกด Send หรือกด Enter

## เทคนิคที่ใช้

### Backend
- **Express.js**: Web Server Framework
- **Socket.io**: Real-time Communication
- **JWT**: Authentication
- **bcryptjs**: Password Hashing

### Frontend
- **Vanilla JavaScript**: ไม่ใช้ Framework
- **WebRTC**: Video/Audio Streaming
- **Socket.io Client**: Real-time Communication
- **Google STUN Server**: NAT Traversal (ฟรี)

## ข้อจำกัด

- User data เก็บใน Memory (รีสตาร์ท Server แล้วข้อมูลหาย)
- ในการใช้งานจริงควรเชื่อมต่อ Database (MongoDB, PostgreSQL, etc.)
- WebRTC อาจมีปัญหาเรื่อง Firewall/NAT บางเครือข่าย
- ใช้ STUN Server ฟรีของ Google อาจมี latency สูงกว่า TURN Server แบบ paid

## การปรับแต่งเพิ่มเติม

### เปลี่ยน JWT Secret
แก้ไขไฟล์ `server.js`:
```javascript
const JWT_SECRET = 'your-secret-key-change-in-production';
```

### เปลี่ยน Port
แก้ไขไฟล์ `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### เพิ่ม TURN Server
แก้ไขไฟล์ `public/app.js`:
```javascript
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // เพิ่ม TURN Server ตรงนี้
    ]
};
```

## License

MIT

## การ Deploy ขึ้น Hosting

### วิธีที่ 1: Heroku (ฟรี)

1. **ติดตั้ง Heroku CLI**
   - ดาวน์โหลดจาก https://devcenter.heroku.com/articles/heroku-cli

2. **Login ไป Heroku**
   ```bash
   heroku login
   ```

3. **สร้าง App ใหม่**
   ```bash
   heroku create your-app-name
   ```

4. **Push โค้ดขึ้น Heroku**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a your-app-name
   git push heroku main
   ```

5. **เปิด App**
   ```bash
   heroku open
   ```

### วิธีที่ 2: Render (ฟรี)

1. **ไปที่ https://render.com**
2. **Sign up / Login**
3. **กด "New +" → "Web Service"**
4. **Connect GitHub repository**
5. **ตั้งค่า:**
   - Name: your-app-name
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. **กด "Create Web Service"**

### วิธีที่ 3: Railway (ฟรี)

1. **ไปที่ https://railway.app**
2. **Sign up / Login**
3. **กด "New Project" → "Deploy from GitHub repo"**
4. **เลือก repository**
5. **ตั้งค่า:**
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. **กด "Deploy"**

### วิธีที่ 4: Vercel (ฟรี)

ต้องแก้ไข server.js เล็กน้อยให้รองรับ Vercel

1. **ไปที่ https://vercel.com**
2. **Sign up / Login**
3. **Import project จาก GitHub**
4. **ตั้งค่า Build Settings:**
   - Build Command: `npm install`
   - Output Directory: `.`
5. **กด "Deploy"**

### ข้อควรระวังเมื่อ Deploy

- **Environment Variables**: ตั้งค่า PORT ให้ใช้ค่าจาก environment
- **Database**: ใน production ควรใช้ Database จริง (MongoDB, PostgreSQL)
- **HTTPS**: Hosting ส่วนใหญ่ให้ HTTPS ฟรี
- **File Upload**: รูปโปรไฟล์อาจต้องใช้ Cloud Storage (AWS S3, Cloudinary)
