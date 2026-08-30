const compeContainer = document.querySelector(".compe-container")
const compeInput = document.querySelector("#choosen-competition")

if (compeContainer) {
	const competitions = compeContainer.querySelectorAll(".card")

	competitions.forEach(competition => competition.addEventListener('click', () => {
		competitions.forEach(c => c.classList.remove('bg-info', 'bg-opacity-10', 'border', 'border-info', 'rounded'))
		competition.classList.add('bg-info', 'bg-opacity-10', 'border', 'border-info', 'rounded')

		const choosenValue = competition.getAttribute('data-value')
		compeInput.value = choosenValue
		console.log(compeInput.value)
	}))
}
