import nodemailer from 'nodemailer';
import process from 'process';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.INVITE_GMAIL_ID,       
        pass: process.env.INVITE_GMAIL_PASSWORD    
    }
});


const sendEmail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: `"Autocore" <${process.env.INVITE_GMAIL_ID}>`, 
        to: to,
        subject: subject,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service] Success: Sent to ${to}`);
        return info;
    } catch (error) {
        console.error("[Email Service] Failure:", error);
        throw error; 
    }
};

export { sendEmail };