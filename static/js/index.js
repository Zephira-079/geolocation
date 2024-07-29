
const session = localStorage.getItem('userSession')

if (!session) localStorage.setItem('userSession', crypto.randomUUID().toString())

navigator.permissions.query({ name: 'geolocation' }).then((result) => {

})
const body = document.body
const data = document.querySelector("[data-records]")
const map = document.querySelector("[data-map]")

let latitude = 0
let longitude = 0

navigator.geolocation.getCurrentPosition(async position => {
    const jsonData = { "userSession": localStorage.getItem("userSession") }

    for (key in position.coords) {
        if (key != "toJSON") jsonData[key] = position.coords[key]
        if (key == "toJSON") continue;

        const list = document.createElement("div")
        list.dataset[key] = ``
        try {

            list.textContent = `${key} : ${position.coords[key]} \n`
            data.appendChild(list)

            // assign latitude, longitude
            if (key == "latitude") latitude = position.coords[key]
            else if (key == "longitude") longitude = position.coords[key]
        }
        catch (e) {
            console.log(e)
        }
    }

    updateLocation()
    console.log(jsonData)
    await sendJsonData(jsonData)
})

function callPosition() {
    navigator.geolocation.getCurrentPosition(async position => {
        console.log("client info updated!")
        const jsonData = { "userSession": localStorage.getItem("userSession") }

        for (key in position.coords) {
            if (key != "toJSON") jsonData[key] = position.coords[key]
            if (key == "toJSON") continue;

            const list = document.querySelector(`[data-${key}]`)
            try {
                list.textContent = `${key} : ${position.coords[key]} \n`

                // assign latitude, longitude

                if (key == "latitude") latitude = position.coords[key]
                else if (key == "longitude") longitude = position.coords[key]
            }
            catch (err) {
                console.log(err)
            }
        }

        updateLocation()
        await sendJsonData(jsonData)
    })
}

navigator.geolocation.watchPosition(async position => {
    console.log("client info updated!")
    const jsonData = { "userSession": localStorage.getItem("userSession") }

    for (key in position.coords) {
        if (key != "toJSON") jsonData[key] = position.coords[key]
        if (key == "toJSON") continue;

        const list = document.querySelector(`[data-${key}]`)
        try {
            list.textContent = `${key} : ${position.coords[key]} \n`

            // assign latitude, longitude

            if (key == "latitude") latitude = position.coords[key]
            else if (key == "longitude") longitude = position.coords[key]
        }
        catch (err) {
            console.log(err)
        }
    }
})

function updateLocation() {
    try {

        const url = new URL(map.src)
        const params = new URLSearchParams(url.search)
        params.set("q", `${latitude} , ${longitude}`)
        url.search = params.toString()
        map.src = url.toString()
    }
    catch (e) {
        throw new Error(e)
    }
}

async function sendJsonData(jsonData) {
    try {
        const apiResponse = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })

        if (!apiResponse.ok) {
            throw new Error('Network response was not ok')
        }

        const result = await apiResponse.json()
        console.log('Response from API:', result)
    } catch (error) {
        console.error('Error:', error)
    }
}

setInterval(() => {
    callPosition()
}, 6 * 10000)