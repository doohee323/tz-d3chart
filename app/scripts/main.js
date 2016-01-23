console.log('\'Allo \'Allo!'); // eslint-disable-line no-console

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

var main_x = d3.time.scale().range([ 0, main_width ]), mini_x = d3.time.scale()
    .range([ 0, main_width ]);

var main_y0 = d3.scale.sqrt().range([ main_height, 0 ]), main_y1 = d3.scale
    .sqrt().range([ main_height, 0 ]), mini_y0 = d3.scale.sqrt().range(
    [ mini_height, 0 ]), mini_y1 = d3.scale.sqrt().range([ mini_height, 0 ]);

var main_xAxis = d3.svg.axis().scale(main_x)
    .tickFormat(d3.time.format("%H:%M")).orient("bottom"), mini_xAxis = d3.svg
    .axis().scale(mini_x).tickFormat(d3.time.format("%H:%M")).orient("bottom");

var main_yAxisLeft = d3.svg.axis().scale(main_y0).orient("left");
var main_yAxisRight = d3.svg.axis().scale(main_y1).orient("right");

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
          });

          data.sort(function(a, b) {
            return a.date - b.date;
          });

          main_x.domain([ data[0].date, data[data.length - 1].date ]);
          main_y0.domain(d3.extent(data, function(d) {
            return d['DNSLookup'];
          }));
          // main_y0.domain([0.1, d3.max(data, function(d) { return
          // d['DNSLookup']; })]);
          main_y1.domain(d3.extent(data, function(d) {
            return d['Aggregateuptime'];
          }));
          mini_x.domain(main_x.domain());
          mini_y0.domain(main_y0.domain());
          mini_y1.domain(main_y1.domain());

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

          main.append("g").attr("class", "x axis").attr("transform",
              "translate(0," + main_height + ")").call(main_xAxis);

          main.append("g").attr("class", "y axis axisLeft")
              .call(main_yAxisLeft).append("text").attr("transform",
                  "rotate(-90)").attr("y", 6).attr("dy", ".71em").style(
                  "text-anchor", "end").text("( ms )");

          main.append("g").attr("class", "y axis axisRight").attr("transform",
              "translate(" + main_width + ", 0)").call(main_yAxisRight).append(
              "text").attr("transform", "rotate(-90)").attr("y", -12).attr(
              "dy", ".71em").style("text-anchor", "end").text("( % )");

          mini.append("g").attr("class", "x axis").attr("transform",
              "translate(0," + mini_height + ")").call(main_xAxis);

          mini.append("path").datum(data).attr("class", "line line0").attr("d",
              mini_line0);

          mini.append("path").datum(data).attr("class", "line line1").attr("d",
              mini_line1);

          mini.append("g").attr("class", "x brush").call(brush).selectAll(
              "rect").attr("y", -6).attr("height", mini_height + 7);

          var focus = main.append("g").attr("class", "focus").style("display",
              "none");

          focus.append("line").attr("class", "x").attr("y1", main_y0(0) - 6)
              .attr("y2", main_y0(0) + 6)

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
                1), d0 = data[i - 1]
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
  main.select(".x.axis").call(main_xAxis);
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