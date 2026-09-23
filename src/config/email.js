import nodemailer from "nodemailer";

const email=nodemailer.createTransport({
    // service: "gmail",
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    // }
    pool: true,
    port:1025,
    host:"localhost",
    secure:false,
    tls:{
        rejectUnauthorized:false
    }
})

export async function sendMail({to,subject,text,html}){
    console.log("here is the to email:  ",to);
    
    try {
        const info=await email.sendMail({
            from: process.env.EMAIL_USER||"no-reply@example.com",
            to,
            subject,
            text,
            html
        })
        console.log("email sent:",info.messageId);
    } catch (error) {
        console.error("error sending email:",error);
    }
}   

// sendMail({
//     to:"eg@g,com",
//     subject:"Test Email",
//     text:"This is a test email.",
//     html:"<h1>This is a test email.</h1>"
// });

export default email;