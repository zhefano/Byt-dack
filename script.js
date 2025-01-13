// const apiUrl = "http://localhost:3000/stations"; // json-server URL
const apiUrl = "https://api.jsonbin.io/v3/b/66fd147ead19ca34f8b16ee2"; // JSONBin URL
const apiAccessKey =
	"$2a$10$y4mPQYiiUu74u2sIyOEiWO85nKLstQ8LQ0ZhqDNGMzTofL.vJfCm6"; // JSONBin API key

// ----------GLOBALA VARIABLAR----------
let currentStationIndex = 0; // Håller räkning på hur många stationer som visas för tillfället.
const stationsPerPage = 10; // Hur många stationer som visas per sida i "resultat"
let stations = []; // Innehåller alla hämtade stationer
let currentSortOrder = "distance";

// --------------------------------------

document.addEventListener("DOMContentLoaded", async function () {
	await initStations(); // Initierar stationerna. Sparar stationerna i "local storage" och i "stations"
	const logoBtn = document.getElementById("logo");
	if (logoBtn) {
		logoBtn.addEventListener("click", function () {
			window.location.href = "/index.html"; // Ändra sökvägen till din startsida om det behövs
		});
		logo.addEventListener("mouseover", function () {
			logo.style.cursor = "pointer";
		});
	}
	let dropDownBtn = document.querySelector(".dropbtn");
	let dropDownContent = document.querySelector(".dropdown-content");
	if (dropDownBtn) {
		dropDownBtn.addEventListener("click", () => {
			showDropDown();			

			// Om man klickar utanför försvinner den
			document.addEventListener("click", (event) => {
				if (
					dropDownContent.style.display === "block" &&
					!dropDownContent.contains(event.target) &&
					!dropDownBtn.contains(event.target)
				) {
					dropDownContent.style.display = "";
				}
			});
		
		});
		dropDownBtn.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				showDropDown();
			}
		});
	}

	//Click händelse för "Använd min plats"
	if (window.location.pathname === "/index.html") {
		const locationText = document.getElementById("location-text");
		if (locationText) {
			locationText.addEventListener("click", async function () {
				event.preventDefault();
				console.log("Fetching user location...");
				try {
					await userLocation(); // Fetch and store user location
					console.log("Location fetched successfully.");
					window.location.assign("/Resultatsida.html"); // <-- flyttar användaren till resultatsida.html direkt
				} catch (error) {
					console.error("Error while fetching location:", error);
				}
			});
		}
	}

	//Fyller timelinen med olika procent, beroende på vilkden sida användaren är på

	const fillElement = document.querySelector(".timeline-fill");

	if (fillElement) {
		const currentPage = window.location.pathname.split("/").pop();

		let fillPercentage = 0;

		switch (currentPage) {
			case "Resultatsida.html":
				fillPercentage = 37;
				break;
			case "betalnings.html":
				fillPercentage = 66;
				break;
			case "confirm.html":
				fillPercentage = 100;
				break;
			default:
				fillPercentage = 0;
				break;
		}

		fillElement.style.width = fillPercentage + "%";
	}

	// const nextButton = document.getElementById("next-button");
	const backButton = document.getElementById("backButton");
	if (backButton) {
		backButton.addEventListener("click", () => {
			event.preventDefault();
			history.back();
		});
	}
	// if (nextButton) {
	// 	nextButton.addEventListener("click", () => handleNavigation("next"));
	// }

	if (window.location.pathname === "/Resultatsida.html") {
		// Ensure user location is fetched before displaying stations
		if (!sessionStorage.getItem("storedUserLocation")) {
			console.log("No stored user location found. Fetching location...");
			await userLocation();
		}
		displayMoreStations();
		const showMoreBtn = document.querySelector("#showMoreBtn");
		showMoreBtn.addEventListener("click", displayMoreStations);

		// Sorteringsknapp
		const sortButton = document.querySelector(".filter-icon");
		sortButton.addEventListener("click", sortStations);
	}
	// -----------BETALSIDAN----------------
	if (window.location.pathname === "/betalnings.html") {
		const confirmButton = document.querySelector("#confirmButton");

		// Initially disable the button
		confirmButton.disabled = true;

		// Add event listener to check form completion
		document.addEventListener("input", function () {
			checkFormCompletion("#bookingForm", "#confirmButton"); // Ensure form completion enables the button
		});

		// Add click event listener to redirect if form is valid
		confirmButton.addEventListener("click", (event) => {
			// Prevent the button from working unless the form is correctly filled
			if (!confirmButton.disabled) {
				window.location.assign("/confirm.html");
			} else {
				event.preventDefault(); // Prevent the default action if the button is still disabled
			}
		});
	}

	// Kolla om vi är på confirm.html,
	// och hämtar då sparad data
	if (window.location.pathname === "/confirm.html") {
		const orderInfo = JSON.parse(sessionStorage.getItem("currentOrderInfo"));

		const selectedStation = JSON.parse(
			sessionStorage.getItem("selectedStation")
		);

		document.getElementById("workshop-name").textContent = selectedStation.name;
		document.getElementById("workshop-address").textContent =
			selectedStation.address;

		document.getElementById("selected-date").textContent = orderInfo.date;
		document.getElementById("selected-time").textContent = orderInfo.time;
	}
});

// Initierar stationerna. Sparar stationerna i "local storage" och i "stations"
async function initStations() {
	// Check if stations are stored in localStorage
	const storedStations = localStorage.getItem("stations");

	if (storedStations) {
		// Use the stations from localStorage
		stations = JSON.parse(storedStations);
	} else {
		// Fetch stations from the API
		stations = await getAllStations();
		localStorage.setItem("stations", JSON.stringify(stations)); // Save to localStorage
	}
}

function getDistanceFromUser(stationLat, stationLng, returnType) {
	// Get user location from sessionStorage
	const locationData = sessionStorage.getItem("storedUserLocation");

	// Log the location data to see if it's being fetched correctly
	// console.log("User Location Data from Session:", locationData);

	// Check if location data exists in sessionStorage
	if (locationData) {
		const { latitude: userLat, longitude: userLng } = JSON.parse(locationData);

		// Check if latitude and longitude exist in the data
		if (userLat && userLng) {
			// Calculate the distance from the user to the station
			const distanceFromUser = calculateDistance(
				userLat,
				userLng,
				stationLat,
				stationLng
			);

			// Log the calculated distance
			// console.log("Distance from user to station:", distanceFromUser);

			// Return as a formatted string if returnType is 'text'
			if (returnType === "text") {
				return `${distanceFromUser.toFixed(1)} km`; // Return as string with "1" decimal
			}
			// Return as a number if returnType is anything else
			else if (returnType !== "text") {
				return distanceFromUser;
			}
		} else {
			console.error("User latitude or longitude is missing!");
		}
	} else {
		console.error("No stored location data found in sessionStorage!");
	}
	return null;
}

// Visar alla stationer som hämtats från API på sidan i form av kort
//Sorterar via avstånd
async function displayMoreStations(sortByDistance = true) {
	const stationList = document.querySelector("#stationList");
	const showMoreBtn = document.querySelector("#showMoreBtn");

	const locationData = sessionStorage.getItem("storedUserLocation");
	let userCoordinates = null;

	if (locationData) {
		userCoordinates = JSON.parse(locationData);
	} else {
		console.error("No stored location data found in sessionStorage!");
		return;
	}

	let stationsWithDistance = stations;

	// Kontrollerar om variablen är true, och kör då koden som sorterar via avstånd
	// annars körs annan sorteringskod som angetts
	if (sortByDistance) {
		stationsWithDistance = stations.map((station) => {
			const distance = calculateDistance(
				userCoordinates.latitude,
				userCoordinates.longitude,
				station.latitude,
				station.longitude
			);
			return { ...station, distance };
		});

		// Sortera stationerna baserat på avståndet
		stationsWithDistance.sort((a, b) => a.distance - b.distance);
	}

	// Slice the next batch of stations
	const stationsToDisplay = stationsWithDistance.slice(
		currentStationIndex,
		currentStationIndex + stationsPerPage
	);

	// Bygger HTML för korten
	let displayStation = "";
	stationsToDisplay.forEach((station) => {
		let distanceText = "-";
		distanceText = getDistanceFromUser(
			station.latitude,
			station.longitude,
			"text"
		);
		displayStation += `
    <div class="card" station-id="${station.id}">
      	<img src="${station.image}" alt="Bild på Verkstad" />
      	<div class="card-content">
        	<h3 class= "station-name">${station.name}</h3>
        	<p class="station-address">${station.address.replace(", SE", "")}</p>
		
        	<div class="info-row">
          		<p class="station-distance">
					<i class="fa-solid fa-location-crosshairs color-primary">
					</i> ${distanceText}
				</p>
          		<p class="station-price">
					<i class="fa-solid fa-coins color-primary">
					</i> ${station.price}:-
				</p>
        	</div>
      	</div>
      	<a href="#" class="book-button btn-primary" data-id="${
					station.id
				}">Välj</a>
    </div>
    `;
	});

	// Sätter in HTML'n ovan i "stationList"
	stationList.insertAdjacentHTML("beforeend", displayStation);

	// Updaterar "hur många stationer som visas"-index
	currentStationIndex += stationsPerPage;

	// lägger till data till modalen EFTER att korten skapats
	addModalContent();

	// Om alla stationer har visats, göm "visa fler"-knappen
	if (currentStationIndex >= stations.length) {
		showMoreBtn.style.display = "none";
	}
}

// Lägger in station-data i modal-korten
function addModalContent() {
	const timesModal = document.querySelector("#times-modal");
	const bookButtons = document.querySelectorAll(".book-button");
	const closeModal = document.querySelector("#close-modal-button");

	closeModal.addEventListener("click", () => {
		timesModal.close();
	});

	bookButtons.forEach((button) => {
		button.addEventListener("click", (event) => {
			const stationId = button.getAttribute("data-id"); // Get the station ID
			const selectedStation = stations.find(
				(station) => station.id == stationId
			); // Find the station object

			let distanceText = "-";
			if (getDistanceFromUser) {
				distanceText = getDistanceFromUser(
					selectedStation.latitude,
					selectedStation.longitude,
					"text"
				);
			}

			document.querySelector("#modal-station-name").textContent =
				selectedStation.name;
			document.querySelector("#modal-station-address").textContent =
				selectedStation.address;
			document.querySelector("#modal-station-distance").textContent =
				distanceText;
			document.querySelector(
				"#modal-station-price"
			).textContent = `${selectedStation.price} :-`;
			document.querySelector("#modal-station-description").textContent =
				selectedStation.description;
			const modalImage = document.querySelector("#modal-station-image");
			modalImage.src = selectedStation.image; // image URL
			modalImage.alt = `Bild på ${selectedStation.name}`; // alt text

			// Spara den valda stationen i sessionStorage
			sessionStorage.setItem(
				"selectedStation",
				JSON.stringify(selectedStation)
			);
			console.log("Vald station sparad i sessionStorage:", selectedStation); // Logga den valda stationen

			// öppnar modalen
			timesModal.showModal();
			addTimeFormLogic(stationId);
		});
	});
}

// Funktion så att "bekräfta-knappen" går från "disabled" till fungerande om
//  de obligatoriska fälten är iflyllda.

function checkFormCompletion(formSelector, buttonSelector) {
	const form = document.querySelector(formSelector);
	const button = document.querySelector(buttonSelector);

	const requiredInputs = form.querySelectorAll(
		"input[required], select[required], textarea[required]"
	);
	let allFilled = true;

	requiredInputs.forEach((input) => {
		if (!input.value.trim()) {
			allFilled = false;
		}
	});

	if (allFilled) {
		button.classList.remove("disabled");
		button.disabled = false;
	} else {
		button.classList.add("disabled");
		button.disabled = true;
	}
}
// Denna funktion kan bytas mot "checkFormCompletion" istället. Denna är för specifik :)
function updateButtonState(confirmButton, selectedDate, selectedTime) {
	const requiredInfoText = document.querySelector("#requiredInfoText");
	if (selectedDate && selectedTime) {
		requiredInfoText.classList.add("hidden");
		confirmButton.classList.remove("disabled");
		confirmButton.disabled = false;
	} else {
		requiredInfoText.classList.remove("hidden");
		confirmButton.classList.add("disabled");
	}
}

// Add the date and time logic here
function addTimeFormLogic(stationId) {
	const dateInput = document.getElementById("date");
	const timeInputs = document.querySelectorAll('input[name="time"]');
	const confirmButton = document.getElementById("time-btn");

	let selectedDate = null;
	let selectedTime = null;

	// Listen for date selection
	dateInput.addEventListener("change", function () {
		selectedDate = dateInput.value;
		console.log(`Valt datum: ${selectedDate}`);
		updateButtonState(confirmButton, selectedDate, selectedTime); // Pass parameters
	});

	// Listen for time selection
	timeInputs.forEach(function (input) {
		input.addEventListener("change", function () {
			selectedTime = input.value;
			console.log(`Vald tid: ${selectedTime}`);
			updateButtonState(confirmButton, selectedDate, selectedTime); // Pass parameters
		});
	});

	// Handle form submission and redirection
	confirmButton.addEventListener("click", function (event) {
		event.preventDefault(); // Prevent the default form submission

		if (selectedDate && selectedTime) {
			// Spara i sessionStorage
			const orderInfo = {
				stationId: stationId,
				date: selectedDate,
				time: selectedTime,
			};
			sessionStorage.setItem("currentOrderInfo", JSON.stringify(orderInfo));

			// Redirect to the next page with the stationId, selected date, and time
			const nextPageUrl = `/betalnings.html?stationId=${encodeURIComponent(
				stationId
			)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(
				selectedTime
			)}`;
			window.location.href = nextPageUrl;
		}
	});
}

// Funktion som sparar all beställningsinformation i sessionStorage som "currentOrderInfo"
function displayOrderInfo() {
	const urlParams = new URLSearchParams(window.location.search);
	const stationId = urlParams.get("stationId");
	const selectedDate = urlParams.get("date");
	const selectedTime = urlParams.get("time");
	// Retrieve all stations from sessionStorage
	const allStations = JSON.parse(sessionStorage.getItem("stations"));

	// Find the selected station using the stationId
	const selectedStation = allStations.find(
		(station) => station.id == stationId
	);

	let orderInfo = [
		{ "Selected station": selectedStation },
		{ "Selected date": selectedDate },
		{ "Selected time": selectedTime },
	];
	sessionStorage.setItem("currentOrderInfo", JSON.stringify(orderInfo));
	// Now you have the selected station and can use its details
	console.log(orderInfo); // Full station details
	console.log(`Selected Date: ${selectedDate}, Selected Time: ${selectedTime}`);
}

// "nästa" och "tillbaka" funktioner
const navigationSequence = [
	"index.html",
	"Resultatsida.html",
	"betalnings.html",
	"confirm.html",
];

function getCurrentPageIndex() {
	const currentPage = window.location.pathname.split("/").pop(); //
	return navigationSequence.indexOf(currentPage);
}

function handleNavigation(direction) {
	const currentIndex = getCurrentPageIndex();
	let nextIndex;

	if (direction === "next") {
		nextIndex =
			currentIndex === navigationSequence.length - 1 ? 0 : currentIndex + 1;
	} else if (direction === "back") {
		nextIndex =
			currentIndex === 0 ? navigationSequence.length - 1 : currentIndex - 1;
	}

	window.location.href = navigationSequence[nextIndex];
}

//Funktion för att hämta användarens nuvarande adress

// Simplified getUserCoordinates function using a Promise
function getUserCoordinates() {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				resolve({ latitude, longitude });
			},
			(error) => reject(error)
		);
	});
}

async function userLocation() {
	try {
		// Await user location
		const { latitude, longitude } = await getUserCoordinates();

		// Save userLocation in session storage
		sessionStorage.setItem(
			"storedUserLocation",
			JSON.stringify({ latitude, longitude })
		);

		// Optionally, update the search input placeholder
		const address = await addressCoordinates(latitude, longitude);
		if (address && window.location.pathname === "/index.html") {
			document.getElementById("search-input").placeholder = address;
		}

		console.log("'User location' retrieved:", { latitude, longitude });
	} catch (error) {
		console.error("Error fetching user location:", error);
	}
}

//Funktion för att hämta stad och gatunamn
// och returnerar dem som en sträng

async function addressCoordinates(latitude, longitude) {
	const response = await fetch(
		`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
	);
	const data = await response.json();

	const city =
		data.address.city || data.address.town || data.address.village || "";
	const street = data.address.road || "";

	return `${city}, ${street}`;
}

// Hämtar/"fetchar" alla stationer från vår API
async function getAllStations() {
	try {
		const response = await fetch(apiUrl, {
			headers: {
				"Content-Type": "application/json",
				"X-Access-Key": apiAccessKey,
			},
		});

		if (!response.ok) {
			throw new Error(`Error fetching stations: ${response.status}`);
		}

		const data = await response.json();
		return data.record.stations; // JSONBin data structure.
		// Om vi använder "json-server" ska vi bara ha "return data" ovan
	} catch (error) {
		console.error("Error fetching data:", error);
		return null;
	}
}

// Haversine formula to calculate the distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the Earth in km
	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) *
			Math.cos(lat2 * (Math.PI / 180)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c; // Distance in km
	return distance;
}

// --------------Låt detta ligga längst ner :)-----------------------

// Återanvändbara funktioner
// Funktion för att "toggla" en CSS-klass av/på ---Bra att ha :)
function toggleClass(element, className) {
	element.classList.toggle(className);
}
// Delay-funktion
// Använd ---> "await delay(2000);" om man t.ex. vill ha 2 sekunders delay
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Visa / göm dropdown meny
function showDropDown() {
	let dropDownContent = document.querySelector(".dropdown-content");
	dropDownContent.style.display =
		dropDownContent.style.display === "block" ? "" : "block";
}

function sortStations() {
	// Kontrollera om stationerna redan har hämtats, annars hämta dem
	if (stations.length === 0) {
		alert("Inga stationer finns tillgängliga att sortera!");
		return;
	}

	// Sortera stationerna från lägst till högst pris
	// stations.sort((a, b) => a.price - b.price);

	// Töm nuvarande stationslistan innan du visar den sorterade listan
	const stationList = document.querySelector("#stationList");
	stationList.innerHTML = "";

	const SortingChoiceElement = document.querySelector(".Sorteringsval");

	// Växla sorteringsordningen
	if (currentSortOrder === "distance") {
		// Om nuvarande sorteringsordning är avstånd
		// Sortera stationerna efter pris
		stations.sort((a, b) => a.price - b.price);
		currentSortOrder = "price"; // Växla till pris
		SortingChoiceElement.textContent = "Pris";
	} else {
		// Om nuvarande sorteringsordning inte är avstånd
		// Hämta användarens lagrade koordinater från sessionStorage
		const locationData = sessionStorage.getItem("storedUserLocation");
		let userCoordinates = null;

		if (locationData) {
			userCoordinates = JSON.parse(locationData);
			stations = stations.map((station) => {
				const distance = calculateDistance(
					userCoordinates.latitude,
					userCoordinates.longitude,
					station.latitude,
					station.longitude
				);
				return { ...station, distance };
			});

			// Sortera stationerna efter avstånd
			stations.sort((a, b) => a.distance - b.distance);
		}
		currentSortOrder = "distance"; // Växla till avstånd
		SortingChoiceElement.textContent = "Avstånd";
	}

	// Återställ indexet för att börja från början
	currentStationIndex = 0;

	// Visa stationerna igen, men nu i sorterad ordning, efter pris
	displayMoreStations(false); // False tar bort avstånd sorteringen
}
