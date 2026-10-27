const admin = require('firebase-admin')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { PDFDocument, rgb } = require('pdf-lib')
const { Storage } = require('@google-cloud/storage')
const nodeMailer = require('nodemailer')
const { authorizeStoragePath, signedReadOptions } = require('./storage-access')

admin.initializeApp()
const storage = new Storage()
const mailgunSmtpPassword = defineSecret('MAILGUN_SMTP_PASSWORD')

exports.createPrivateDownloadUrl = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')

  const objectPath = request.data?.path
  const allowed = await authorizeStoragePath({
    uid: request.auth.uid,
    email: request.auth.token.email,
    emailVerified: request.auth.token.email_verified === true
  }, objectPath, async (uid) => {
    const snap = await admin.firestore().doc(`Team/${uid}`).get()
    return snap.exists ? snap.data() : null
  })
  if (!allowed) throw new HttpsError('permission-denied', 'You cannot access this file.')

  try {
    const [url] = await admin.storage().bucket().file(objectPath).getSignedUrl(signedReadOptions())
    return { url }
  } catch (error) {
    console.error('Cannot create private download URL', error)
    throw new HttpsError('internal', 'Could not create a file link.')
  }
})

exports.generateCertificate = onDocumentCreated({
  document: 'Certificates/{docId}',
  region: 'asia-southeast2',
  secrets: [mailgunSmtpPassword]
}, async (event) => {
   const { name, email } = event.data.data()
   const safeName = String(name ?? '').replace(/[&<>"']/g, (char) => ({
     '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
   }[char]))
   const transporter = nodeMailer.createTransport({
	host:'smtp.mailgun.org',
	port: 587,
	secure: false,
	auth: {
		user: 'postmaster@ipfest25.com',
		pass: mailgunSmtpPassword.value()
	}
})

   const templateBucket = storage.bucket('template_sertif')
   const [templateFile] = await templateBucket.file('dummy_sertif_template.pdf').download()

   const pdfDoc = await PDFDocument.load(templateFile)
   const pages = pdfDoc.getPages()
   const firstPage = pages[0]

   firstPage.drawText(safeName, {
      x: 250,
      y: 400,
      size: 36,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont('Helvetica-Bold')
   })

   const pdfBytes = await pdfDoc.save()
	const mailOptions = {
		from: `"noreply" <postmaster@ipfest25.com>`,
		to: email,
		subject: 'Appreciation for Your Participation!',
		html: `
			<h1>Hi ${safeName}!</h1>
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
				filename: `Certificate-${safeName}.pdf`,
				content: Buffer.from(pdfBytes),
				contentType: 'application/pdf'
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
   //    	message: {
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
