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
  top : 430,
  right : 80,
  bottom : 20,
  left : 40
};
var main_width = 960 - main_margin.left - main_margin.right, main_height = 500
    - main_margin.top - main_margin.bottom, mini_height = 500 - mini_margin.top
    - mini_margin.bottom;

// 2016-01-23T00:36:00.000Z
var formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ"), parseDate = formatDate.parse, bisectDate = d3
    .bisector(function(d) {
      return d.date;
    }).left, formatOutput0 = function(d) {
  return formatDate(d.date) + " - " + d['DNSLookup'] + " ms";
}, formatOutput1 = function(d) {
  return formatDate(d.date) + " - " + d['Aggregateuptime'];
};

var main_x = d3.time.scale().range([ 0, main_width ]);
var mini_x = d3.time.scale().range([ 0, main_width ]);

var main_y0 = d3.scale.sqrt().range([ main_height, 0 ])
var main_y1 = d3.scale.sqrt().range([ main_height, 0 ]);
var main_y2 = d3.scale.sqrt().range([ main_height, 0 ]);

var mini_y0 = d3.scale.sqrt().range([ mini_height, 0 ]);
var mini_y1 = d3.scale.sqrt().range([ mini_height, 0 ]);
var mini_y2 = d3.scale.sqrt().range([ mini_height, 0 ]);

var main_xAxis = d3.svg.axis().scale(main_x)
    .tickFormat(d3.time.format("%H:%M")).orient("bottom");
var mini_xAxis = d3.svg.axis().scale(mini_x)
    .tickFormat(d3.time.format("%H:%M")).orient("bottom");

var main_yAxisLeft = d3.svg.axis().scale(main_y0).orient("left");
var main_yAxisRight = d3.svg.axis().scale(main_y1).orient("right").ticks(1);

var brush = d3.svg.brush().x(mini_x).on("brush", brush);

var main_line0 = d3.svg.line().interpolate("cardinal").x(function(d) {
  return main_x(d.date);
}).y(function(d) {
  return main_y0(d['DNSLookup']);
});

var main_line1 = d3.svg.line().interpolate("cardinal").x(function(d) {
  return main_x(d.date);
}).y(function(d) {
  return main_y1(d['Aggregateuptime']);
});

var main_line2 = d3.svg.line().interpolate("step").x(function(d) {
  return main_x(d.date);
}).y(function(d) {
  return main_y2(d['Judge']);
});

var mini_line0 = d3.svg.line().x(function(d) {
  return mini_x(d.date);
}).y(function(d) {
  return mini_y0(d['DNSLookup']);
});

var mini_line1 = d3.svg.line().x(function(d) {
  return mini_x(d.date);
}).y(function(d) {
  return mini_y1(d['Aggregateuptime']);
});

var mini_line2 = d3.svg.line().interpolate("step").x(function(d) {
  return mini_x(d.date);
}).y(function(d) {
  return mini_y2(d['Judge']);
});

var svg = d3.select("#chart").append("svg").attr("width",
    main_width + main_margin.left + main_margin.right).attr("height",
    main_height + main_margin.top + main_margin.bottom);

svg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr(
    "width", main_width).attr("height", main_height);

var main = svg.append("g").attr("transform",
    "translate(" + main_margin.left + "," + main_margin.top + ")");

var mini = svg.append("g").attr("transform",
    "translate(" + mini_margin.left + "," + mini_margin.top + ")");

d3
    .json("data2.txt",
        function(error, data) {
          data.forEach(function(d) {
            d.date = parseDate(d.date);
            d['DNSLookup'] = +d['DNSLookup'];
            d['Aggregateuptime'] = +d['Aggregateuptime'];
            d['Judge'] = +d['Judge'];
          });

          data.sort(function(a, b) {
            return a.date - b.date;
          });

          main_x.domain([ data[0].date, data[data.length - 1].date ]);
          main_y0.domain(d3.extent(data, function(d) {
            return d['DNSLookup'];
          }));
          main_y1.domain(d3.extent(data, function(d) {
            return d['Aggregateuptime'];
          }));
          main_y2.domain(d3.extent(data, function(d) {
            return d['Judge'];
          }));
          mini_x.domain(main_x.domain());
          mini_y0.domain(main_y0.domain());
          mini_y1.domain(main_y1.domain());
          mini_y2.domain(mini_y2.domain());

          // /[ main chart ]///////////////////////////
          main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
              "class", "line line0").attr("d", main_line0).attr("data-legend",
              function(d) {
                return "DNS Lookup";
              });
          main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
              "class", "line line1").attr("d", main_line1).attr("data-legend",
              function(d) {
                return "Aggregate uptime";
              });
          main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
              "class", "line line2").attr("d", main_line2).attr("data-legend",
              function(d) {
                return "Judge";
              });

          // svg.selectAll("rect").data(data).enter().append("rect").style("fill",
          // "steelblue").style("opacity", .2).attr("x", function(d) {
          // return main_y2(d.date) + 5;
          // }).attr("width", main_y2.rangeBand()).attr("y", function(d) {
          // return mini_y2(d['Judge']);
          // }).attr("height", function(d) {
          // return (main_height - mini_y2(d['Judge'])) + 20;
          // });

          // /[ main left x ]///////////////////////////
          main.append("g").attr("class", "x axis").attr("transform",
              "translate(0," + main_height + ")").call(main_xAxis);
          // /[ main left y ]///////////////////////////
          main.append("g").attr("class", "y axis axisLeft")
              .call(main_yAxisLeft).append("text").attr("transform",
                  "rotate(-90)").attr("y", 6).attr("dy", ".71em").style(
                  "text-anchor", "end").text("( ms )");

          // /[ main right y ]///////////////////////////
          main.append("g").attr("class", "y axis axisRight").attr("transform",
              "translate(" + main_width + ", 0)").call(main_yAxisRight).append(
              "text").attr("transform", "rotate(-90)").attr("y", 2).attr("dy",
              ".71em").style("text-anchor", "end");

          // /[ mini chart ]///////////////////////////
          mini.append("g").attr("class", "x axis").attr("transform",
              "translate(0," + mini_height + ")").call(main_xAxis);
          mini.append("path").datum(data).attr("class", "line line0").attr("d",
              mini_line0);
          mini.append("path").datum(data).attr("class", "line line1").attr("d",
              mini_line1);
          mini.append("path").datum(data).attr("class", "line line2").attr("d",
              mini_line2);
          mini.append("g").attr("class", "x brush").call(brush).selectAll(
              "rect").attr("y", -6).attr("height", mini_height + 7);

          // /[ focus ]///////////////////////////
          var focus = main.append("g").attr("class", "focus").style("display",
              "none");
          focus.append("line").attr("class", "y0").attr("x1", main_width - 6)
              .attr("x2", main_width + 6);
          focus.append("line").attr("class", "y1").attr("x1", main_width - 6)
              .attr("x2", main_width + 6);

          focus.append("circle").attr("class", "y0").attr("r", 4);
          focus.append("text").attr("class", "y0").attr("dy", "-1em");

          focus.append("circle").attr("class", "y1").attr("r", 4);
          focus.append("text").attr("class", "y1").attr("dy", "-1em");

          main.append("rect").attr("class", "overlay")
              .attr("width", main_width).attr("height", main_height).on(
                  "mouseover", function() {
                    focus.style("display", null);
                  }).on("mouseout", function() {
                focus.style("display", "none");
              }).on("mousemove", mousemove);

          function mousemove() {
            var x0 = main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0,
                1), d0 = data[i - 1];
            var d1 = data[i];
            if (d1.date) {
              var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
              focus.select("circle.y0").attr(
                  "transform",
                  "translate(" + main_x(d.date) + "," + main_y0(d['DNSLookup'])
                      + ")");
              focus.select("text.y0").attr(
                  "transform",
                  "translate(" + main_x(d.date) + "," + main_y0(d['DNSLookup'])
                      + ")").text(formatOutput0(d));
              focus.select("circle.y1").attr(
                  "transform",
                  "translate(" + main_x(d.date) + ","
                      + main_y1(d['Aggregateuptime']) + ")");
              focus.select("text.y1").attr(
                  "transform",
                  "translate(" + main_x(d.date) + ","
                      + main_y1(d['Aggregateuptime']) + ")").text(
                  formatOutput1(d));
              focus.select(".x").attr("transform",
                  "translate(" + main_x(d.date) + ",0)");
              focus.select(".y0").attr(
                  "transform",
                  "translate(" + main_width * -1 + ", "
                      + main_y0(d['DNSLookup']) + ")").attr("x2",
                  main_width + main_x(d.date));
              focus.select(".y1").attr("transform",
                  "translate(0, " + main_y1(d['Aggregateuptime']) + ")").attr(
                  "x1", main_x(d.date));
            }
          }

          // /[ legend ]///////////////////////////
          var legend = svg.append("g").attr("class", "legend").attr(
              "transform", "translate(80,30)").style("font-size", "10px").call(
              d3.legend)

          setTimeout(function() {
            legend.style("font-size", "10px").attr("data-style-padding", 10)
                .call(d3.legend)
          }, 1000)

        });

function brush() {
  main_x.domain(brush.empty() ? mini_x.domain() : brush.extent());
  main.select(".line0").attr("d", main_line0);
  main.select(".line1").attr("d", main_line1);
  main.select(".line2").attr("d", main_line2);
  main.select(".x.axis").call(main_xAxis);

  redraw(2000);
}

(function() {
  d3.legend = function(g) {
    g.each(function() {
      var g = d3.select(this), items = {};
      var svg = d3.select(g.property("nearestViewportElement"));
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

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////

var w = 1200;
var h = 500;

var xy = d3.geo.equirectangular().scale(150);
var path = d3.geo.path().projection(xy);

var svg = d3.select("#graph").insert("svg:svg").attr("width", w).attr("height",
    h);
var states = svg.append("svg:g").attr("id", "states");
var circles = svg.append("svg:g").attr("id", "circles");
var labels = svg.append("svg:g").attr("id", "labels");

d3.json("countries.json", function(collection) {
  states.selectAll("path").data(collection.features).enter().append("svg:path")
      .attr("d", path).on(
          "mouseover",
          function(d) {
            d3.select(this).style("fill", "#6C0").append("svg:title").text(
                d.properties.name);
          }).on("mouseout", function(d) {
        d3.select(this).style("fill", "#ccc");
      })
});

// http://stackoverflow.com/questions/11386150/lat-lon-positon-on-a-d3-js-map
// +convert to string to number

var scalefactor = 1. / 50.;
d3.csv("map.csv", function(csv) {
  circles.selectAll("circle").data(csv).enter().append("svg:circle").attr("cx",
      function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("cy", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("r", function(d) {
    return (+d["1990"]) * scalefactor;
  }).attr("title", function(d) {
    return d["country"] + ": " + Math.round(d["1990"]);
  }).on("mouseover", function(d) {
    d3.select(this).style("fill", "#FC0");
  }).on("mouseout", function(d) {
    d3.select(this).style("fill", "steelblue");
  });

  labels.selectAll("labels").data(csv).enter().append("svg:text").attr("x",
      function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("y", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("dy", "0.3em").attr("text-anchor", "middle").text(function(d) {
    return Math.round(d["1990"]);
  });
});

function redraw(year) {
  circles.selectAll("circle").transition().duration(1000).ease("linear").attr(
      "r", function(d) {
        return (+d[year]) * scalefactor;
      }).attr("title", function(d) {
    return d["country"] + ": " + Math.round(d[year]);
  });

  labels.selectAll("text").text(function(d) {
    return Math.round(d[year]);
  });
}

