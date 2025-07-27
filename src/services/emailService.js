const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS
	}
});

async function sendEmail({ to, subject, text, html }) {
	const mailOptions = {
		from: process.env.SMTP_FROM,
		to,
		subject,
		text,
		html
	};
	return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
