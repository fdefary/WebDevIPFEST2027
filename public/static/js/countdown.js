// Countdown Registration Period
const countDownContainer = document.querySelector("#countdown-container")
const registerPeriod = document.querySelector("#register-period")
const timeDay = document.querySelector("#time-day")
const timeHour = document.querySelector("#time-hour")
const timeMinute = document.querySelector("#time-minute")
const timeSecond = document.querySelector("#time-second")
const markedEarlyBird = document.querySelector("#earlybird-ongoing")
const markedRegular = document.querySelector("#regular-ongoing")
const headCountdown = document.querySelector("#head-countdown")
const subheadCountdown = document.querySelector("#subhead-countdown")

let earlybirdDeadline = new Date('Nov 15, 2024 00:00:00').getTime()
let regularDeadline = new Date('Dec 1, 2024 00:00:00').getTime()

let countDown = setInterval(() => {
   let now = new Date().getTime()
   let distance = earlybirdDeadline - now
   registerPeriod.textContent = "Early bird"
   headCountdown.innerHTML = `<span style="color:#bc2300">Early Bird</span> Gets the Worm!`
   subheadCountdown.textContent = "Secure Your Spot Now Before the Prices Rise!"
   markedEarlyBird.classList.remove("d-none")
   markedRegular.classList.add("d-none")

   if (distance < 0) {
      distance = regularDeadline - now
      registerPeriod.textContent = "Extended Regular"
      headCountdown.innerHTML = `Register Now for <span style="color:#bc2300">Regular</span> Period!`
      subheadCountdown.textContent = "Secure Your Spot Now - Don't Miss Out!"
      markedEarlyBird.classList.add("d-none")
      markedRegular.classList.remove("d-none")

      if (distance < 0) {
         clearInterval(countDown)
         countDownContainer.classList.add("d-none")
      }
   }

	let day = Math.floor(distance / (1000*60*60*24))
	let hour = Math.floor((distance % (1000*60*60*24)) / (1000*60*60))
	let minute = Math.floor((distance % (1000*60*60)) / (1000*60))
	let second = Math.floor((distance % (1000*60)) / (1000))

   timeDay.textContent = `${day}`.length === 2 ? day : `0${day}`
   timeHour.textContent = `${hour}`.length === 2 ? hour : `0${hour}`
   timeMinute.textContent = `${minute}`.length === 2 ? minute : `0${minute}`
   timeSecond.textContent = `${second}`.length === 2 ? second : `0${second}`
}, 1000)