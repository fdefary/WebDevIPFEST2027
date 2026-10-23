(() => {
	'use strict'
 
	const forms = document.querySelectorAll('.needs-validation')
 
	Array.from(forms).forEach(form => {
	  	form.addEventListener('submit', event => {
	 	 	const activeStep = form.id === 'registration-form'
	 	 		? form.querySelector('[data-registration-step]:not([hidden])')
	 	 		: form;
	 	 	if (!activeStep?.checkValidity()) {
				event.preventDefault()
				event.stopPropagation()
		 	}
 
		 	form.classList.add('was-validated')
	  	}, false)
	})
})()
 
 
