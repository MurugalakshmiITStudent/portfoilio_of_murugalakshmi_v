const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const nodemailer = require('nodemailer');

const PORT = 3000;

// YOUR EMAIL CONFIGURATION
const EMAIL_USER = 'murugalakshmivel954@gmail.com';
const EMAIL_PASS = 'rtxc zmfn sfxp zrwc'; // Your App Password

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Verify email connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email service error:', error);
    } else {
        console.log('✅ Email service ready!');
        console.log(`📧 Sending emails to: ${EMAIL_USER}`);
    }
});

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
};

// Store active timers
const activeTimers = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
    console.log(`📨 ${req.method} ${req.url}`);

    // Handle POST request for contact form
    if (req.method === 'POST' && req.url === '/api/contact') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const formData = querystring.parse(body);
                
                console.log('\n📧 New Contact Form Submission:');
                console.log('👤 Name:', formData.name || 'Not provided');
                console.log('📧 Email:', formData.email || 'Not provided');
                console.log('📝 Subject:', formData.subject || 'Not provided');
                console.log('💬 Message:', formData.message || 'Not provided');
                console.log('---');
                console.log('⏱️ Timer started: Email will be sent after 5 seconds');

                // Send immediate response to client
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Email will be sent after 5 seconds!'
                }));

                // Start timer on server side - 5 seconds total
                let countdown = 5;
                let totalTime = 0;
                const timerId = Date.now().toString();

                console.log(`⏱️ Timer ${timerId} started with 5s countdown`);

                // Store timer info
                activeTimers.set(timerId, {
                    formData: formData,
                    status: 'counting',
                    startTime: Date.now()
                });

                // setInterval - Countdown every second (5 seconds)
                const interval = setInterval(() => {
                    countdown--;
                    totalTime++;
                    
                    console.log(`⏱️ Timer ${timerId}: ${countdown} seconds remaining`);
                    
                    // Update timer status
                    const timerInfo = activeTimers.get(timerId);
                    if (timerInfo) {
                        timerInfo.countdown = countdown;
                    }

                    // When countdown reaches 0 (after 5 seconds)
                    if (countdown === 0) {
                        console.log(`⏱️ Timer ${timerId}: Countdown finished! Sending email now...`);
                        
                        // Clear the interval
                        clearInterval(interval);

                        // Update timer status
                        const timerInfo = activeTimers.get(timerId);
                        if (timerInfo) {
                            timerInfo.status = 'sending';
                        }

                        // Send the email immediately
                        sendEmail(formData, timerId);
                        
                        // Clean up timer after sending
                        setTimeout(() => {
                            activeTimers.delete(timerId);
                            console.log(`🧹 Timer ${timerId} cleaned up`);
                        }, 1000);
                    }
                }, 1000);

                // Store interval reference
                activeTimers.set(timerId, {
                    formData: formData,
                    status: 'counting',
                    startTime: Date.now(),
                    interval: interval,
                    countdown: 5
                });

            } catch (error) {
                console.error('❌ Error processing form:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Error processing form'
                }));
            }
        });

        return;
    }

    // Handle GET requests for static files
    try {
        let filePath = req.url === '/' ? '/index.html' : req.url;
        
        // Remove query parameters
        filePath = filePath.split('?')[0];
        
        // Prevent directory traversal
        filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
        
        const fullPath = path.join(__dirname, 'public', filePath);
        
        // Get file extension
        const ext = path.extname(fullPath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Read and serve the file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // File not found - serve index.html for SPA routing
                    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, indexData) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end('404 - File Not Found');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(indexData);
                        }
                    });
                } else {
                    console.error('❌ Server error:', err);
                    res.writeHead(500);
                    res.end('500 - Internal Server Error');
                }
                return;
            }

            // Serve the file
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    } catch (error) {
        console.error('❌ Request handling error:', error);
        res.writeHead(500);
        res.end('500 - Internal Server Error');
    }
});

// Function to send email
function sendEmail(formData, timerId) {
    const mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_USER,
        subject: `📩 Portfolio Contact: ${formData.subject || 'New Message'}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #6c63ff; border-radius: 10px;">
                <h2 style="color: #6c63ff;">📬 New Contact Form Submission</h2>
                <hr style="border: 1px solid #eee;">
                <p><strong>👤 Name:</strong> ${formData.name || 'Not provided'}</p>
                <p><strong>📧 Email:</strong> ${formData.email || 'Not provided'}</p>
                <p><strong>📝 Subject:</strong> ${formData.subject || 'Not provided'}</p>
                <p><strong>💬 Message:</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #6c63ff;">
                    ${formData.message || 'Not provided'}
                </div>
                <hr style="border: 1px solid #eee;">
                <p style="color: #888; font-size: 12px;">📧 Sent from your Portfolio Website</p>
                <p style="color: #888; font-size: 12px;">📅 ${new Date().toLocaleString()}</p>
                <p style="color: #888; font-size: 12px;">⏱️ Email sent after 5 seconds</p>
            </div>
        `,
        replyTo: formData.email || EMAIL_USER
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`❌ Timer ${timerId} - Email error:`, error);
        } else {
            console.log(`✅ Timer ${timerId} - Email sent successfully after 5 seconds!`);
            console.log('📧 Message ID:', info.messageId);
        }
    });
}

// Server event listeners
server.on('listening', () => {
    console.log('\n🚀 ========================================');
    console.log(`🚀 Server is now RUNNING!`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${path.join(__dirname, 'public')}`);
    console.log(`📧 Email notifications to: ${EMAIL_USER}`);
    console.log('🚀 ========================================');
    console.log('\n✨ Portfolio Features:');
    console.log('📧 Contact form sends emails to your Gmail');
    console.log('⏱️ Timer: 5 seconds countdown then email sent');
    console.log('📂 Static files served from /public folder');
    console.log('\n💡 Press Ctrl+C to stop the server');
});

server.on('connection', (socket) => {
    const clientAddress = socket.remoteAddress;
    console.log(`🔗 Client connected: ${clientAddress}`);
});

server.on('close', () => {
    console.log('\n🛑 Server has been closed');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.log('💡 Try changing PORT to 3001 or 4000 in the code');
    } else {
        console.error('❌ Server error:', err);
    }
});

// Process event listeners
process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT (Ctrl+C)');
    console.log('🔄 Shutting down gracefully...');
    
    // Clear all active timers
    console.log(`🧹 Cleaning up ${activeTimers.size} active timers...`);
    for (const [id, timer] of activeTimers) {
        if (timer.interval) {
            clearInterval(timer.interval);
        }
        console.log(`🧹 Timer ${id} cleared`);
    }
    activeTimers.clear();
    
    server.close(() => {
        console.log('✅ Server closed successfully');
        console.log('👋 Goodbye!');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM');
    console.log('🔄 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
});

// Start the server
server.listen(PORT);

console.log(`\n⏳ Starting server on port ${PORT}...`);
console.log('📧 Email service connecting...');