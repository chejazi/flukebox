google.load("visualization", "1", {packages:["corechart"]});

var GlobalOffset = 0;

function argmin( arr ) {
    if ( !Array.isArray( arr ) ) {
        throw new TypeError( 'argmin()::invalid input argument. Must provide an array.' );
    }
    var len = arr.length,
        min = arr[ 0 ],
        idx = [ 0 ],
        val;

    for ( var i = 1; i < len; i++ ) {
        val = arr[ i ];
        if ( val < min ) {
            min = val;
            idx.length = 0;
            idx.push( i );
        }
        else if ( val === min ) {
            idx.push( i );
        }
    }
    return idx;
}




// [  ...  [browser time when sent (t0), server time (t1), browser time when received (t2)]  ...  ]
// in ideal case (equal travel time both ways)
// t2 - (t2 - t0) / 2 == t1
// ==> we should add an offset of (t1 - (t2 - (t2 - t0) / 2)) to the browser time
// offset = t1 - t2 + t2 / 2 - t0 / 2
//        = t1 - t2 / 2 - t0 / 2
//        = t1 - (t2 + t0) / 2



var time_data = [];
var roundtrip_times = [];
var offsets = [];

var i = 0;

var mediaPlayerLag = 0;

var audio_length_ms = 203624.0;

var sync_interval = 100;

function ResetSyncInterval(){
	sync_interval = 0;
}

function sync(){
    // var timezone_offset = (new Date()).getTimezoneOffset() * 60000;
    var t0 = (new Date()).getTime();// - timezone_offset;
    $.get(
        "/time",
        function (data){
            time_data.push([
                t0,
                data["server_time"],
                (new Date()).getTime()// - timezone_offset
                ]);

            var t0_t1_t2 = time_data[time_data.length-1];
            roundtrip_times.push(t0_t1_t2[2] - t0_t1_t2[0]);

            offsets.push(t0_t1_t2[1] - (t0_t1_t2[2] + t0_t1_t2[0]) / 2);

            draw1DHist(
                roundtrip_times,
                "roundtrip_times (ms)",
                'blue',
                'roundtrip_times_div');

            draw1DHist(
                offsets,
                "offsets (ms)",
                'green',
                'offsets_div');

            drawScatterPlot(
                offsets,
                roundtrip_times,
                "offsets (ms)",
                "roundtrip_times (ms)",
                "Offsets vs Round-trip Times",
                "orange",
                "offsets_vs_roundtrip_times_div"
                );


            var argmin_roundtrip_times = argmin(roundtrip_times);
            var sum_offsets = 0;
            for(var h=0; h<argmin_roundtrip_times.length; h++){
                sum_offsets += offsets[argmin_roundtrip_times[h]];
                // roundtrip_times[argmin_roundtrip_times[h]]/2
            }

            GlobalOffset = sum_offsets / argmin_roundtrip_times.length;
            $("#results_div").html(
                "<h1>offset (ms) = " +
                GlobalOffset.toString() +
                " +/- " +
                (roundtrip_times[argmin_roundtrip_times[0]] / 2).toString() +
                "</h1>"
                );

            document.getElementById("media_elem").currentTime = ((mediaPlayerLag + data["play_position"] + (new Date()).getTime() + GlobalOffset - data["server_time"]) % audio_length_ms)/ 1000.;
            document.getElementById("media_elem").play();
            $("#media_time_div").html(
                "<h1>media play time (ms) = " +
                ((data["play_position"] + (new Date()).getTime() + GlobalOffset - data["server_time"]) % audio_length_ms)/ 1000. +
                "</h1>"
                );

        });
    if(i < 500){
        i++;
        sync_interval += 375;
        window.setTimeout(sync, sync_interval);
    }
}

function Calibrate() {
    $("#start_button").hide();
    $("#resync_button").show();

	document.getElementById("media_elem").load();
	
    //  Measure twice, because the file buffers first time around
    var twice = false;
    var startTime;
    var media = document.getElementById("media_calibrate_elem");

    function start() {
        media.addEventListener('ended', finish);
        startTime = new Date().getTime();
        media.currentTime = 0;
        media.play();
    }

    function finish() {
        var lag = new Date().getTime() - 100 - startTime;
        media.removeEventListener('ended', finish);
        if (!twice) {
            twice = true;
            start();
        }
        else {
            mediaPlayerLag = lag;
            media.style.display = 'none';
            console.log(lag);
            sync();
        }
    }

    start();
}

function draw1DHist(x, title, color, div_id) {
    var x_labeled = [['', '']];
    for(var j=0; j<x.length; j++){
        x_labeled.push(['', x[j]]);
    }

    var data = google.visualization.arrayToDataTable(x_labeled);

    var options = {
        title: title,
        legend: { position: 'none' },
        colors: [color]
    };

    var chart = new google.visualization.Histogram(document.getElementById(div_id));
    chart.draw(data, options);
}

function drawScatterPlot(x, y, x_label, y_label, title, color, div_id) {
        var x_y_labeled = [[x_label, y_label]];
        for(var j=0; j<x.length; j++){
            x_y_labeled.push([x[j], y[j]]);
        }

        var data = google.visualization.arrayToDataTable(x_y_labeled);

        var options = {
          title: title,
          hAxis: {title: x_label, minValue: Math.min.apply(null, x), maxValue: Math.max.apply(null, x)},
          vAxis: {title: y_label, minValue: Math.min.apply(null, y), maxValue: Math.max.apply(null, y)},
          legend: 'none',
          colors: [color]
        };

        var chart = new google.visualization.ScatterChart(document.getElementById(div_id));

        chart.draw(data, options);
      }