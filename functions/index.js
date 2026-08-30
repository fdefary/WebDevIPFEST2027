const admin = require('firebase-admin')
const functions = require('firebase-functions')
const { PDFDocument, rgb } = require('pdf-lib')
const { Storage } = require('@google-cloud/storage')
const nodeMailer = require('nodemailer')

admin.initializeApp()
const storage = new Storage()

const transporter = nodeMailer.createTransport({
	host:'smtp.mailgun.org',
	port: 587,
	secure: false,
	auth: {
		user: 'postmaster@ipfest25.com',
		pass: '3f71268183182f83c53e26d39c73b3f6-ac3d5f74-7e1d2c88'
	}
})

exports.generateCertificate = functions.region('asia-southeast2').firestore
  .document('Certificates/{docId}')
  .onCreate(async (snap, context) => {
   const { name, email } = snap.data()

   const templateBucket = storage.bucket('template_sertif')
   const [templateFile] = await templateBucket.file('dummy_sertif_template.pdf').download()

   const pdfDoc = await PDFDocument.load(templateFile)
   const pages = pdfDoc.getPages()
   const firstPage = pages[0]

   firstPage.drawText(name, {
      x: 250,
      y: 400,
      size: 36,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont('Helvetica-Bold')
   })

   const pdfBytes = await pdfDoc.save()
   const certFileName = `certificates/${Date.now()}_${name}.pdf`
   await templateBucket.file(certFileName).save(pdfBytes)

   const [url] = await templateBucket.file(certFileName).getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
   })

	const mailOptions = {
		from: `"noreply" <postmaster@ipfest25.com>`,
		to: email,
		subject: 'Appreciation for Your Participation!',
		html: `
					<h1>Hi ${name}!</h1>
					<p>Thank you for participating in our event. As a token of our appreciation, we are pleased to present you with an Appreciation Certificate for your participation. You can download your certificate via the link below:</p>
					<br>
					<p>We hope that your experience in this event was valuable and inspiring. Looking forward to seeing you in future events!</p>
					<br>
					<p>If you have any questions or issues regarding your certificate, feel free to contact us at <strong><a href='https://www.instagram.com/ipfest25/'>our instagram</a></strong></p>
					<p>Best regards,</p>
					<p>IPFEST 2025 Team</p>
					<p>More information: <a href='https://ipfest25.com'>ipfest25.com</a></p>
				`,
		attachments: [
			{
				filename: `Certificate-${name}.pdf`,
				path: url
			}
		]
	}

	try {
		await transporter.sendMail(mailOptions)
		console.log('Email sent successfully!')
	} catch (error) {
		console.error('Error sending email: ', error)
	}

   // await admin.firestore().collection('Attendance').add({
   //    to: email,
   //    message: {
   //      	subject: 'Sertifikat Anda Telah Siap!',
   //      	html: `<p>Halo ${name}, terlampir sertifikat Anda.</p>`,
   //      	attachments: [{
   //        	filename: `Sertifikat-${name}.pdf`,
   //        	path: url
   //      	}]
   //    }
   // })
    
   return true
})