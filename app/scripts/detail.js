// //////////////////////////////////////////////////////////////////////////////
// / [configuration]
// //////////////////////////////////////////////////////////////////////////////
var uptimeConfig = {
  "slider" : {
    "init" : {
      "x0" : 0,
      "x1" : 120
    },
    "range" : {
      "min" : 0,
      "max" : 600
    },
    "step" : 5
  },
  "lineChart" : {
    "main" : {
      "margin" : {
        "width" : 950,
        "height" : 250,
        "top" : 50,
        "bottom" : 20,
        "right" : 40,
        "left" : 40
      },
      "yAxis" : {
        "right" : "state"
      },
      "type" : "cardinal",
      "range" : 5
    },
    "mini" : {
      "margin" : {
        "width" : 870,
        "height" : 40,
        "top" : 0,
        "bottom" : 20,
        "right" : 0,
        "left" : 0
      },
      "type" : "monotone"
    },
    "combo" : {
      "id" : "gmetrices",
      "init" : "*"
    }
  },
  "histogram" : {
    "margin" : {
      "width" : 950,
      "height" : 175,
      "top" : 130,
      "bottom" : 0,
      "right" : 40,
      "left" : 40
    },
    "max_bar" : 20
  },
  "stackedChart" : {
    "type" : "line",
    "margin" : {
      "width" : 950,
      "height" : 250,
      "top" : 50,
      "bottom" : 25,
      "right" : 40,
      "left" : 40
    }
  },
  "gauge" : {
    "size" : 160,
    "clipWidth" : 160,
    "clipHeight" : 160,
    "ringWidth" : 60,
    "maxValue" : 700,
    "transitionMs" : 2000
  },
  "map" : {
    "margin" : {
      "width" : 950,
      "height" : 400,
      "top" : 200,
      "left" : 390
    },
    "circle_scale" : 0.03,
    "circle" : {
      "#81bc00" : 8,
      "#7e7f74" : 10,
      "#ffa400" : 13,
      "#dc291e" : 15
    },
    "scale" : 135,
    "tooltip" : {
      "x" : 2,
      "y" : 2
    },
    "combo" : {
      "id" : "locs",
      "init" : "*"
    }
  },
  "gmap" : {
    "height" : 300,
    "width" : 950,
    "circle_scale" : 1,
    "scale" : 150,
    "tooltip" : {
      "x" : 20,
      "y" : 160
    },
    "combo" : {
      "id" : "glocs",
      "init" : "*"
    }
  },
  "legend" : {
    "x" : 9,
    "y" : -3,
    "width" : 18,
    "height" : 18
  },
  "mapping" : {
    "nsl_ms" : {
      "short" : "DNS Lookup",
      "full" : "DNS Lookup Time (ms)"
    },
    "con_ms" : {
      "short" : "DNS Connect",
      "full" : "DNS LookupTime To Connect (ms)"
    },
    "tfb_ms" : {
      "short" : "Waiting Time",
      "full" : "Time To 1st Byte (ms)"
    },
    "tot_ms" : {
      "short" : "Response",
      "full" : "Roundtrip Time (ms)"
    },
    "time_ms" : {
      "short" : "Response",
      "full" : "Roundtrip Time (ms)"
    },
    "rt_min" : {
      "short" : "Roundtrip Minimum",
      "full" : "Roundtrip Time Minimum (ms)"
    },
    "rt_max" : {
      "short" : "Roundtrip Maximum",
      "full" : "Roundtrip Time Maximum (ms)"
    },
    "rt_avg" : {
      "short" : "Roundtrip Average",
      "full" : "Roundtrip Time Average (ms)"
    },
    "rt_std" : {
      "short" : "Roundtrip Standard",
      "full" : "Roundtrip Time Standard (ms)"
    },
    "loss_" : {
      "short" : "Loss",
      "full" : "Loss Percentage (%)"
    },
    "state" : {
      "short" : "Service status",
      "full" : "Service status"
    },
    "judge" : {
      "short" : "Up Down",
      "full" : "Up Down status"
    }
  },
  "format" : {
    "full_date" : "DD/MM/YYYY HH:mm:ss"
  }
}

// ///////////////////////////////////////////////////////////////////////////////
var uc = new UptimeChart(uptimeConfig);
uc.createChart(1);

// $(document).tooltip();

