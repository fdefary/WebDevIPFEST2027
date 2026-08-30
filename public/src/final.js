// Get signed url from ../functions/index.js
async function getSignedUrl(file) {
	const response = await fetch('https://generatesignedurl-xn2wpuh7nq-et.a.run.app', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			bucketName: 'final_submission',
			fileName: file.name,
			contentType: file.type,
		})
	})

	const { url } = await response.json()
	
	return url
}

async function uploadFinalSubmission(file) {
	const signedURL = await getSignedUrl(file)

	const response = await fetch(signedURL, {
		method: 'PUT',
		headers: {
			'Content-Type': file.type,
		},
		body: file
	})

	if (response.ok) {
		console.log('File uploaded successfully!')
		alert('Success sending your submission!')
	} else {
		console.error(response.statusText)
		alert('Failed uploading your submission! Please try again and contact us!')
	}
}