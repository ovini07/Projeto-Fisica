var highchartsSettings = {
    chart: { backgroundColor: "#d6cac5", renderTo: "t1" },
    title: { text: "Temperatura (ºC) x tempo (s)" },
    series: [
        {
            id: "T1",
            name: "T1",
            showInLegend: false,
            data: getLocally("roomTemperature"),
            color: "red",
        },
        {
            id: "T2",
            name: "T2",
            showInLegend: false,
            data: getLocally("anotherTemperature"),
            color: "blue",
        },
    ],
    plotOptions: {
        line: { animation: false, dataLabels: { enabled: false } },
    },
    xAxis: { enabled: true, title: { text: "t (s)" } },
    yAxis: { enabled: true, title: { text: "Temperatura (ºC)" } },
    credits: { enabled: false },
};

var chartPT = new Highcharts.Chart(highchartsSettings);

function getAverageFromTemperatura(temperature, chartData) {
    var quantityInputed = chartData.length;
    var told = chartData[quantityInputed - 1];
    var tolder = chartData[quantityInputed - 2];

    var media = (told + tolder) / 2;
    if (Math.abs(media - temperature) > 15 || isNaN(temperature)) {
        return media;
    }

    return temperature;
}

function requestDataFromSensors() {
    let xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
        if (this.readyState != 4 && this.status != 200) {
            return;
        }

        transformData(this.responseText);
    };

    xhttp.onerror = function () {
        console.log('XHTTP ERROR!')
    }

    xhttp.open("GET", "/dado", true);
    xhttp.send();
}

function getLocally(key) {
    var itemSaved = window.localStorage.getItem(key);

    if (!itemSaved) {
        itemSaved = `[]`;
    }

    itemSaved = JSON.parse(itemSaved);

    return itemSaved;
}

function saveLocally(key, data) {
    let itemSaved = getLocally(key);

    itemSaved.push(data);

    window.localStorage.setItem(key, JSON.stringify(itemSaved));
}

function removeLocally(key) {
    window.localStorage.removeItem(key);
}

function transformData(responseText) {
    var valores = responseText.split(";"),
        time = parseFloat(valores[0]),
        roomTemperature = parseFloat(valores[1]),
        anotherTemperature = parseFloat(valores[2]);

    let N = chartPT.series[0].processedYData.length;

    saveLocally("roomTemperature", roomTemperature);
    if (N > 2) {
        roomTemperature = getAverageFromTemperatura(
            roomTemperature,
            chartPT.series[0].processedYData
        );
    }

    N = chartPT.series[1].processedYData.length;
    saveLocally("anotherTemperature", anotherTemperature);
    saveLocally("time", time)

    if (N > 2) {
        anotherTemperature = getAverageFromTemperatura(
            anotherTemperature,
            chartPT.series[1].processedYData
        );
    }

    var isChartBelow40 = chartPT.series[0].data.length > 40;
    chartPT.series[0].addPoint(
        [time, roomTemperature],
        true,
        isChartBelow40,
        true
    );
    chartPT.series[1].addPoint(
        [time, anotherTemperature],
        true,
        isChartBelow40,
        true
    );

    updateTable(time, roomTemperature, anotherTemperature, valores[3] == '1');
}

function updateTable(time, room, another, shouldInsert = false) {
    var tdataContent = document.getElementById("tdata").innerHTML;
    var temp1Content = document.getElementById("Tmp1").innerHTML;
    var temp2Content = document.getElementById("Tmp2").innerHTML;

    if (shouldInsert) {
        tdataContent += time + "<br>";
        temp1Content += room + "<br>";
        temp2Content += another + "<br>";
    }

    document.getElementById("tdata").innerHTML = tdataContent;
    document.getElementById("Tmp1").innerHTML = temp1Content;
    document.getElementById("Tmp2").innerHTML = temp2Content;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFromCache() {
    let roomTemperature = getLocally("roomTemperature");
    let anotherTemperature = getLocally("anotherTemperature");
    let time = getLocally("time");

    for (let index = 0; index < roomTemperature.length; index++) {
        updateTable(time[index], roomTemperature[index], anotherTemperature[index], true
        );
    }

    return roomTemperature.length;
}

function refreshData() {
    timeOut = setInterval(() => {
        requestDataFromSensors();
    }, 3000);
}

function removeAllEntries() {
    if (chartPT.series.length === 0) {
        return;
    }

    let entries = [];
    for (let index = 0; index < chartPT.series.length; index++) {
        const serie = chartPT.series[index];

        for (let dataIndex = 0; dataIndex < serie.data.length; dataIndex++) {
            const data = serie.data[dataIndex];
            entries.push(data);
        }
    }

    for (let index = 0; index < entries.length; index++) {
        const element = entries[index];
        element.remove();
    }
}

function removeHistory() {
    document.getElementById("tdata").innerHTML = "";
    document.getElementById("Tmp1").innerHTML = "";
    document.getElementById("Tmp2").innerHTML = "";
}

var btn = document.querySelector("#refresh");
btn.addEventListener("click", function () {
    clearInterval(timeOut);

    removeLocally("roomTemperature");
    removeLocally("anotherTemperature");

    removeAllEntries();
    removeHistory();

    console.log("limpando::::");
    refreshData();
});

var btnDownload = document.querySelector("#download");
btnDownload.addEventListener("click", function () {
    var roomTemperature = getLocally("roomTemperature");
    var anotherTemperature = getLocally("anotherTemperature");
    var time = getLocally("time");

    let rows = [
        ['"Tempo (s)"', '"Temperatura Ambiente (ºC)"', '"Temperatura Estufa (ºC)"'],
    ];
    for (let index = 0; index < roomTemperature.length; index++) {
        rows.push([time[index], roomTemperature[index], anotherTemperature[index]]);
    }

    var csvContent = "data:text/csv;charset=utf-8,";

    rows = rows.map((item) => item.join(",")).join("\r\n");
    console.log("csvContent+rows::::", csvContent + rows);

    var encodedUri = encodeURI(csvContent + rows);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_data.csv");
    document.body.appendChild(link);

    link.click();
});

let timeOut = null;

removeLocally("roomTemperature");
removeLocally("anotherTemperature");

removeAllEntries();
removeHistory();

const length = getFromCache();
refreshData();
