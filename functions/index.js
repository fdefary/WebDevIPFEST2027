const admin = require('firebase-admin')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { PDFDocument, rgb } = require('pdf-lib')
const { Storage } = require('@google-cloud/storage')
const nodeMailer = require('nodemailer')
const { authorizeStoragePath, signedReadOptions } = require('./storage-access')
const { assertPaymentUpdates, assertResult, assertCase, validTeamId, certificateId, validateCertificateAttendance } = require('./security-policy')

admin.initializeApp()
const storage = new Storage()
const mailgunSmtpPassword = defineSecret('MAILGUN_SMTP_PASSWORD')

exports.createPrivateDownloadUrl = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')

  const objectPath = request.data?.path
  const allowed = await authorizeStoragePath({
    uid: request.auth.uid,
    role: request.auth.token.ipfestRole,
    competition: request.auth.token.ipfestCompetition
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

exports.updatePaymentVerifications = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')
  if (request.auth.token.ipfestRole !== 'treasury') throw new HttpsError('permission-denied', 'Treasury role required.')
  try { assertPaymentUpdates(request.data?.updates) } catch { throw new HttpsError('invalid-argument', 'Invalid payment updates.') }
  const teams = await Promise.all(request.data.updates.map(({ teamId }) => admin.firestore().doc(`Team/${teamId}`).get()))
  if (teams.some((snap) => !snap.exists)) throw new HttpsError('not-found', 'Team not found.')
  const batch = admin.firestore().batch()
  for (const { teamId, kind, status } of request.data.updates) {
    const ref = admin.firestore().doc(`Team/${teamId}`)
    const data = kind === 'final' ? {
      'final_reg.paymentStatus': status, 'final_reg.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      'final_reg.verifiedBy': request.auth.token.email || request.auth.uid
    } : {
      payment_status: status, payment_verified_at: admin.firestore.FieldValue.serverTimestamp(),
      payment_verified_by: request.auth.token.email || request.auth.uid
    }
    batch.update(ref, data)
  }
  await batch.commit()
  return { updated: request.data.updates.length }
})

exports.updateCompetitionResult = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')
  const { ipfestRole: role, ipfestCompetition: competition } = request.auth.token
  if (role !== 'competition_manager') throw new HttpsError('permission-denied', 'Manager role required.')
  const { teamId, field, value } = request.data || {}
  if (!validTeamId(teamId)) throw new HttpsError('invalid-argument', 'Invalid team ID.')
  try { assertResult(field, value) } catch { throw new HttpsError('invalid-argument', 'Invalid result.') }
  const ref = admin.firestore().doc(`Team/${teamId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Team not found.')
  if (snap.data().competition !== competition) throw new HttpsError('permission-denied', 'Competition mismatch.')
  await ref.update({ [`sub_preliminary.${field}`]: value })
  return { updated: true }
})

exports.publishCompetitionCase = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')
  const { ipfestRole: role, ipfestCompetition: competition } = request.auth.token
  const { stage, path } = request.data || {}
  let infoId
  try { infoId = assertCase({ role, competition, stage, path }) } catch { throw new HttpsError('permission-denied', 'Case release is invalid or not open.') }
  if (!await admin.storage().bucket().file(path).exists().then(([exists]) => exists)) throw new HttpsError('not-found', 'Case file not found.')
  const release = stage === 'preliminary'
    ? { prelim_case_link: path, sent_on: admin.firestore.FieldValue.serverTimestamp(), competition_name: competition }
    : { 'final.case_link': path, 'final.sent_on': admin.firestore.FieldValue.serverTimestamp(), competition_name: competition }
  await admin.firestore().doc(`Information/${infoId}`).update(release)
  return { published: true }
})

exports.issueAttendanceCertificate = onCall({ region: 'asia-southeast2' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.')
  if (request.auth.token.ipfestRole !== 'event_staff') throw new HttpsError('permission-denied', 'Event staff role required.')
  const { event, attendeeId } = request.data || {}
  let id
  try { id = certificateId(event, attendeeId) } catch { throw new HttpsError('invalid-argument', 'Invalid attendance source.') }
  const source = await admin.firestore().doc(`${event}/${attendeeId}`).get()
  if (!source.exists) throw new HttpsError('not-found', 'Attendance record not found.')
  let attendee
  try { attendee = validateCertificateAttendance(source.data()) } catch { throw new HttpsError('failed-precondition', 'Attendance is not certificate-eligible.') }
  const ref = admin.firestore().doc(`Certificates/${id}`)
  await admin.firestore().runTransaction(async (tx) => {
    const existing = await tx.get(ref)
    if (!existing.exists) tx.create(ref, { ...attendee, event, attendeeId, status: 'queued', requestedBy: request.auth.uid })
  })
  return { queued: true, id }
})

exports.generateCertificate = onDocumentCreated({
  document: 'Certificates/{docId}',
  region: 'asia-southeast2',
  retry: true,
  secrets: [mailgunSmtpPassword]
}, async (event) => {
   const request = event.data.data()
   if (!request || request.status !== 'queued' || certificateId(request.event, request.attendeeId) !== event.params.docId) {
     throw new Error('Invalid certificate request')
   }
   const sourceRef = admin.firestore().doc(`${request.event}/${request.attendeeId}`)
   const source = await sourceRef.get()
   if (!source.exists) throw new Error('Certificate attendance source is missing')
   const { name, email } = validateCertificateAttendance(source.data())
   if (request.name !== name || request.email !== email) throw new Error('Certificate request no longer matches attendance')
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

	await transporter.sendMail(mailOptions)
	await event.data.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() })

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
