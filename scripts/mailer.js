import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
})

export async function sendTicketEmail(ticket, text, closed = false) {
    console.log(ticket)
    console.log(ticket.email)
    const info = await transporter.sendMail({
        from: `"ByteCore Support" <${process.env.SMTP_USER}>`,
        to: ticket.email,
        subject: `Ticket update: ${ticket.category} ${closed ? '(closed)':''}`,
        text: `Hi ${ticket.customer},\n\n${text}\n\n- ByteCore Support`
    })
    const preview = nodemailer.getTestMessageUrl(info)
    if (preview) console.log('Email preview:', preview)

    return info;
}