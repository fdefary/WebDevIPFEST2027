// Navigation
const compe = document.getElementById("nav-compe")
const compeContainer = document.getElementById("compe-container")
const compeListLG = document.getElementById("compe-lg-list")

const _event = document.getElementById("nav-event")
const eventContainer = document.getElementById("event-container")
const eventListLG = document.getElementById("event-lg-list")

const C_E_Container = document.getElementById("c-e-container")

compe.addEventListener("mouseover", function(){
	compeListLG.classList.remove("list-toggle")
	eventListLG.classList.add("list-toggle")

	compeContainer.classList.remove("list-toggle")
	eventContainer.classList.add("list-toggle")
})
compeContainer.addEventListener("mouseleave", function(){
	compeContainer.classList.add("list-toggle")
})

_event.addEventListener("mouseover", function(){
	eventListLG.classList.remove("list-toggle")
	compeListLG.classList.add("list-toggle")

	compeContainer.classList.add("list-toggle")
	eventContainer.classList.remove("list-toggle")
})
eventContainer.addEventListener("mouseleave", function(){
	eventContainer.classList.add("list-toggle")
})

C_E_Container.addEventListener("mouseleave", function(){
	eventListLG.classList.add("list-toggle")
	compeListLG.classList.add("list-toggle")
})