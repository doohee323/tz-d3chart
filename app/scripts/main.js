/////////////////////////////////////////////////////////////////////////////////
// [ line chart ]
/////////////////////////////////////////////////////////////////////////////////
var main_margin = {
  top : 20,
  right : 80,
  bottom : 100,
  left : 40
};
var mini_margin = {
  top : 300,
  right : 80,
  bottom : 20,
  left : 40
};
var main_width = 960 - main_margin.left - main_margin.right, main_height = 400
    - main_margin.top - main_margin.bottom;
var mini_height = 350 - mini_margin.top - mini_margin.bottom;

// 2016-01-23T00:38:00.000Z
var formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
var formatDate2 = d3.time.format("%H:%M:%S");
var parseDate = formatDate.parse
var bisectDate = d3.bisector(function(d) {
  return d.date;
}).left;

var main_x = d3.time.scale().range([ 0, main_width ]);
var mini_x = d3.time.scale().range([ 0, main_width ]);

var main_xAxis = d3.svg.axis().scale(main_x)
    .tickFormat(d3.time.format("%H:%M")).orient("bottom");
var mini_xAxis = d3.svg.axis().scale(mini_x)
    .tickFormat(d3.time.format("%H:%M")).orient("bottom");

var brush = d3.svg.brush().x(mini_x).on("brush", brush).on('brushstart',
    brushstart).on('brushend', brushend);

var main_y = {};
var mini_y = {};
var main_line = {};
var mini_line = {};
var svg, main, mini;
var startTime;
var endTime;

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////
var w = 1200;
var h = 400;

var xy = d3.geo.equirectangular().scale(150);
var path = d3.geo.path().projection(xy);
var states;
var circles;
var labels;

var mapData;
var scalefactor = 1. / 250.;
// ///////////////////////////////////////////////////////////////////////////////

(function() {
  d3.legend = function(g) {
    g.each(function() {
      var g = d3.select(this), items = {};
      var svg = d3.select("#chart");
      var legendPadding = g.attr("data-style-padding") || 10;
      var lb = g.selectAll(".legend-box").data([ true ]);
      var li = g.selectAll(".legend-items").data([ true ]);

      lb.enter().append("rect").classed("legend-box", true);
      li.enter().append("g").classed("legend-items", true);

      svg.selectAll("[data-legend]").each(
          function() {
            var self = d3.select(this);
            items[self.attr("data-legend")] = {
              pos : self.attr("data-legend-pos") || this.getBBox().y,
              color : self.attr("data-legend-color") != undefined ? self
                  .attr("data-legend-color")
                  : self.style("fill") != 'none' ? self.style("fill") : self
                      .style("stroke")
            }
          })

      items = d3.entries(items).sort(function(a, b) {
        return a.value.pos - b.value.pos;
      })

      li.selectAll("text").data(items, function(d) {
        return d.key;
      }).call(function(d) {
        d.enter().append("text");
      }).call(function(d) {
        d.exit().remove();
      }).attr("y", function(d, i) {
        return i + "em";
      }).attr("x", "1em").text(function(d) {
        return d.key;
      })

      li.selectAll("circle").data(items, function(d) {
        return d.key;
      }).call(function(d) {
        d.enter().append("circle");
      }).call(function(d) {
        d.exit().remove();
      }).attr("cy", function(d, i) {
        return i - 0.25 + "em";
      }).attr("cx", 0).attr("r", "0.4em").style("fill", function(d) {
        console.log(d.value.color);
        return d.value.color;
      })

      // Reposition and resize the box
      var lbbox = li[0][0].getBBox();
      lb.attr("x", (lbbox.x - legendPadding)).attr("y",
          (lbbox.y - legendPadding)).attr("height",
          (lbbox.height + 2 * legendPadding)).attr("width",
          (lbbox.width + 2 * legendPadding));
    })
    return g
  }
})()

d3.json("data.txt", function(error, data) {
  setUptimeChart(data);
  makeMap();
});

function setUptimeChart(data) {
  svg = d3.select("#chart").append("svg").attr("width",
      main_width + main_margin.left + main_margin.right).attr("height",
      main_height + main_margin.top + main_margin.bottom);

  svg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr(
      "width", main_width).attr("height", main_height);

  main = svg.append("g").attr("transform",
      "translate(" + main_margin.left + "," + main_margin.top + ")");

  mini = svg.append("g").attr("transform",
      "translate(" + mini_margin.left + "," + mini_margin.top + ")");

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    for ( var key in data[0]) {
      if (key != 'date') {
        // if (key == 'Judge' || key == 'nsl_ms') {
        d[key] = +d[key];
      }
    }
  });

  data.sort(function(a, b) {
    return a.date - b.date;
  });

  for ( var key in data[0]) {
    if (key != 'date') {
      // if (key == 'Judge' || key == 'nsl_ms') {
      main_y[key] = d3.scale.sqrt().range([ main_height, 0 ]);
      mini_y[key] = d3.scale.sqrt().range([ mini_height, 0 ]);
    }
  }

  // /[ line definition ]///////////////////////////
  main_line['nsl_ms'] = d3.svg.line().interpolate("cardinal").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['nsl_ms'](d['nsl_ms']);
  });
  main_line['con_ms'] = d3.svg.line().interpolate("cardinal").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['con_ms'](d['con_ms']);
  });
  main_line['tfb_ms'] = d3.svg.line().interpolate("cardinal").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['tfb_ms'](d['tfb_ms']);
  });
  main_line['tot_ms'] = d3.svg.line().interpolate("cardinal").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['tot_ms'](d['tot_ms']);
  });
  main_line['state'] = d3.svg.line().interpolate("cardinal").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['state'](d['state']);
  });
  main_line['Judge'] = d3.svg.line().interpolate("step").x(function(d) {
    return main_x(d.date);
  }).y(function(d) {
    return main_y['Judge'](d['Judge']);
  });
  main_line['Aggregate_uptime'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return main_x(d.date);
      }).y(function(d) {
    return main_y['Aggregate_uptime'](d['Aggregate_uptime']);
  });

  for ( var key in main_y) {
    var type = '';
    if (key == 'Judge') {
      type = 'step';
    } else {
      type = 'cardinal';
    }
    mini_line[key] = d3.svg.line().interpolate(type).x(function(d) {
      return mini_x(d.date);
    }).y(function(d) {
      return mini_y[key](d[key]);
    });
  }

  main_x.domain([ data[0].date, data[data.length - 1].date ]);
  mini_x.domain(main_x.domain());

  for ( var key in main_y) {
    main_y[key].domain(d3.extent(data, function(d) {
      return d[key];
    }));
    mini_y[key].domain(main_y[key].domain());
  }

  // /[ main chart ]///////////////////////////
  for ( var key in main_y) {
    main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
        "class", "line line" + key).attr("d", main_line[key]).attr(
        "data-legend", function(d) {
          return key;
        });
  }

  // /[ main left x ]///////////////////////////
  main.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + main_height + ")").call(main_xAxis);
  // /[ main left y ]///////////////////////////
  var main_yAxisLeft = d3.svg.axis().scale(main_y['tot_ms']).orient("left");
  main.append("g").attr("class", "y axis axisLeft").call(main_yAxisLeft)
      .append("text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy",
          ".71em").style("text-anchor", "end").text("( ms )");

  // /[ main right y ]///////////////////////////
  var main_yAxisRight = d3.svg.axis().scale(main_y['Judge']).orient("right")
      .ticks(1);
  main.append("g").attr("class", "y axis axisRight").attr("transform",
      "translate(" + main_width + ", 0)").call(main_yAxisRight).append("text")
      .attr("transform", "rotate(-90)").attr("y", 2).attr("dy", ".71em").style(
          "text-anchor", "end");

  // /[ mini chart ]///////////////////////////
  mini.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + mini_height + ")").call(main_xAxis);
  for ( var key in main_y) {
    mini.append("path").datum(data).attr("class", "line line" + key).attr("d",
        mini_line[key]);
  }

  mini.append("g").attr("class", "x brush").call(brush).selectAll("rect").attr(
      "y", -6).attr("height", mini_height + 7);

  // /[ focus ]///////////////////////////
  var focus = main.append("g").attr("class", "focus").style("display", "none");
  for ( var key in main_y) {
    focus.append("line").attr("class", "y" + key).attr("x1", main_width - 6)
        .attr("x2", main_width + 6);
    focus.append("circle").attr("class", "y" + key).attr("r", 4);
    focus.append("text").attr("class", "y" + key).attr("dy", "-1em");
  }

  main.append("rect").attr("class", "overlay").attr("width", main_width).attr(
      "height", main_height).on("mouseover", function() {
    focus.style("display", null);
  }).on("mouseout", function() {
    focus.style("display", "none");
  }).on("mousemove", mousemove);

  function mousemove() {
    var x0 = main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
    var d1 = data[i];
    if (d1.date) {
      var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
      for ( var key in main_y) {
        focus.select("circle.y" + key).attr("transform",
            "translate(" + main_x(d.date) + "," + main_y[key](d[key]) + ")");
        var formatOutput = key + "-" + formatDate2(d.date) + " - " + d[key]
            + " ms";
        focus.select("text.y" + key).attr("transform",
            "translate(" + main_x(d.date) + "," + main_y[key](d[key]) + ")")
            .text(formatOutput).style('font', '10px sans-serif');
        focus.select(".y" + key).attr("transform",
            "translate(" + main_width * -1 + ", " + main_y[key](d[key]) + ")")
            .attr("x2", main_width + main_x(d.date));
      }
      focus.select(".x").attr("transform",
          "translate(" + main_x(d.date) + ",0)");
    }
  }

  // /[ legend ]///////////////////////////
  var legend = main.append("g").attr("class", "legend").attr("transform",
      "translate(40, 10)").style('font', '10px sans-serif').call(d3.legend);

  setTimeout(function() {
    legend.style('font', '10px sans-serif').attr("data-style-padding", 10)
        .call(d3.legend)
  }, 1000)
}

function brush() {
  main_x.domain(brush.empty() ? mini_x.domain() : brush.extent());
  for ( var key in main_y) {
    main.select(".line" + key).attr("d", main_line[key]);
  }
  main.select(".x.axis").call(main_xAxis);
}

function brushstart() {
  startTime = brush.extent()[0];
}
function brushend() {
  startTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(),
      startTime.getDate(), startTime.getHours(), startTime.getMinutes()));
  startTime = startTime.toISOString();

  endTime = brush.extent()[1];
  endTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(),
      endTime.getDate(), endTime.getHours(), endTime.getMinutes()));
  endTime = endTime.toISOString();

  redraw(startTime, endTime);
}

function makeMap() {
  svg = d3.select("#graph").insert("svg").attr("width", w).attr("height", h);
  states = svg.append("g").attr("id", "states");
  circles = svg.append("g").attr("id", "circles");
  labels = svg.append("g").attr("id", "labels");

  d3.json("countries.json", function(collection) {

    states.selectAll("path").data(collection.features).enter().append("path")
        .attr("d", path).on(
            "mouseover",
            function(d) {
              d3.select(this).style("fill", "#6C0").append("title").text(
                  d.properties.name);
            }).on("mouseout", function(d) {
          d3.select(this).style("fill", "#ccc");
        })
  });

  d3.csv("map.csv", function(csv) {
    mapData = csv;
    circles.selectAll("circle").data(csv).enter().append("circle").attr("cx",
        function(d, i) {
          return xy([ +d["longitude"], +d["latitude"] ])[0];
        }).attr("cy", function(d, i) {
      return xy([ +d["longitude"], +d["latitude"] ])[1];
    }).attr("r", function(d) {
      return getSize(d);
      // }).attr("title", function(d) {
      // return d["city"] + ": " + Math.round(d["2016-01-23T00:38:00.000Z"]);
    }).on("mouseover", function(d) {
      d3.select(this).style("fill", "#FC0");
    }).on("mouseout", function(d) {
      d3.select(this).style("fill", "steelblue");
    }).style("fill", function(d) {
      return getColor(d);
    });

    labels.selectAll("labels").data(csv).enter().append("text").attr("x",
        function(d, i) {
          return xy([ +d["longitude"], +d["latitude"] ])[0];
        }).attr("y", function(d, i) {
      return xy([ +d["longitude"], +d["latitude"] ])[1];
    }).attr("dy", "0.3em").attr("text-anchor", "middle").style('font',
        '10px sans-serif').text(function(d) {
      return Math.round(getTotal(d));
    });
  });
}

function redraw(startTime, endTime) {
  var csv = [];
  if (startTime && endTime) {
    for (var i = 0; i < mapData.length; i++) {
      var obj = {};
      for ( var key in mapData[i]) {
        if (key == 'city' || key == 'latitude' || key == 'longitude') {
          obj[key] = mapData[i][key];
        } else {
          if (new Date(key) >= new Date(startTime)
              && new Date(key) <= new Date(endTime)) {
            obj[key] = mapData[i][key];
          }
        }
      }
      csv.push(obj);
    }
  } else {
    csv = mapData;
  }

  circles.selectAll("circle").transition().duration(1000).ease("linear").attr(
      "r", function(d) {
        return getSize(csv, d.city);
      }).attr("title", function(d) {
    return d["city"] + ": " + Math.round(getTotal(csv, d.city));
  });

  circles.selectAll("circle").style("fill", function(d) {
    return getColor(csv, d.city);
  });

  labels.selectAll("text").text(function(d) {
    return Math.round(getTotal(csv, d.city));
  });
}

function getSize(d, city) {
  var size = Math.round(getTotal(d, city) * scalefactor);
  if (size >= 200) {
    size = 30;
  } else if (size >= 50) {
    size = 10;
  } else if (size < 50) {
    size = 5;
  }
  return size;
}

function getColor(d, city) {
  var size = Math.round(getTotal(d, city) * scalefactor);
  if (size >= 200) {
    return "red";
  } else if (size >= 50) {
    return "yellow";
  }
  return "green";
}

function getTotal(d, city) {
  if (city) {
    for (var i = 0; i < d.length; i++) {
      if (d[i].city == city) {
        d = d[i];
        break;
      }
    }
  }
  var total = 0;
  for ( var key in d) {
    if (key != 'city' && key != 'latitude' && key != 'longitude') {
      total += parseFloat(d[key]);
    }
  }
  return total;
}

// var margin = {
// top : 20,
// right : 20,
// bottom : 70,
// left : 40
// }, width = 600 - margin.left - margin.right, height = 300 - margin.top
// - margin.bottom;
// // Parse the date / time
// var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ").parse;
// var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], .05);
// var y = d3.scale.linear().range([ height, 0 ]);
// var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(
// d3.time.format("%H:%M"));
// var yAxis = d3.svg.axis().scale(y).orient("left").ticks(1);
// var svg = d3.select("#bar").append("svg").attr("width",
// width + margin.left + margin.right).attr("height",
// height + margin.top + margin.bottom).append("g").attr("transform",
// "translate(" + margin.left + "," + margin.top + ")");
// d3.json("data2.txt", function(error, data) {
// data.forEach(function(d) {
// d.date = parseDate(d.date);
// d.value = +d.Judge;
// });
//
// x.domain(data.map(function(d) {
// return d.date;
// }));
// y.domain([ 0, d3.max(data, function(d) {
// return d.value;
// }) ]);
// svg.append("g").attr("class", "x axis").attr("transform",
// "translate(0," + height + ")").call(xAxis).selectAll("text").style(
// "text-anchor", "end").attr("dx", "-.8em").attr("dy", "-.55em").attr(
// "transform", "rotate(-90)");
//
// svg.append("g").attr("class", "y axis").call(yAxis).append("text").attr(
// "transform", "rotate(-90)").attr("y", 2).attr("dy", ".71em").style(
// "text-anchor", "end").text("State 1/0");
//
// svg.selectAll("bar").data(data).enter().append("rect").style("fill",
// "steelblue").attr("x", function(d) {
// return x(d.date);
// }).attr("width", x.rangeBand()).attr("y", function(d) {
// return y(d.value);
// }).attr("height", function(d) {
// return height - y(d.value);
// });
// });
