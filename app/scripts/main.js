/////////////////////////////////////////////////////////////////////////////////
//[ UptimeChart constructor ]
/////////////////////////////////////////////////////////////////////////////////
var UptimeChart = function(chartElem, mapElem, config) {
  var _self = this;
  this.chartElem = chartElem;
  this.mapElem = mapElem;
  this.main_y = {};
  this.mini_y = {};
  this.main_line = {};
  this.mini_line = {};
  this.main, this.mini, this.svg;
  this.startTime;
  this.endTime;
  this.main_margin = config.chart.main_margin;
  this.mini_margin = config.chart.mini_margin;
  this.chart = {
    w : config.chart.w,
    h : config.chart.h,
    mh : config.chart.mh
  }
  this.map = {
    w : config.map.w,
    h : config.map.h
  }
  this.map = {
    w : config.map.w,
    h : config.map.h
  }

  this.main_width = this.chart.w - this.main_margin.left
      - this.main_margin.right
  this.main_height = this.chart.h - this.main_margin.top
      - this.main_margin.bottom;
  this.mini_height = this.chart.mh - this.mini_margin.top
      - this.mini_margin.bottom;

  this.formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  this.parseDate = this.formatDate.parse;

  this.main_x = d3.time.scale().range([ 0, this.main_width ]);
  this.mini_x = d3.time.scale().range([ 0, this.main_width ]);

  this.states;
  this.circles;
  this.labels;

  this.mapData = new Array();
  this.scale = 1. / config.map.scale;

  this.getSize = function(d, city) {
    var size = Math.round(this.getTotal(d, city) * this.scale);
    if (size >= 10) {
      size = 30;
    } else if (size >= 3) {
      size = 10;
    } else if (size < 3) {
      size = 5;
    }
    return size;
  }

  this.getColor = function(d, city) {
    var size = Math.round(this.getTotal(d, city) * this.scale);
    if (size >= 10) {
      return "red";
    } else if (size >= 3) {
      return "yellow";
    }
    return "green";
  }

  this.getTotal = function(d, city) {
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
}

/////////////////////////////////////////////////////////////////////////////////
//[ line chart ]
/////////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeUptimeChart = function(data) {
  var _self = this;
  this.svg = d3.select(this.chartElem).append("svg").attr("width",
      this.main_width + this.main_margin.left + this.main_margin.right).attr(
      "height",
      this.main_height + this.main_margin.top + this.main_margin.bottom);

  this.svg.append("defs").append("clipPath").attr("id", "clip").append("rect")
      .attr("width", this.main_width).attr("height", this.main_height);

  this.main = this.svg.append("g").attr("transform",
      "translate(" + this.main_margin.left + "," + this.main_margin.top + ")");

  this.mini = this.svg.append("g").attr("transform",
      "translate(" + this.mini_margin.left + "," + this.mini_margin.top + ")");

  var main_xAxis = d3.svg.axis().scale(this.main_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");
  var mini_xAxis = d3.svg.axis().scale(this.mini_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");

  d3.legend = function(g) {
    g.each(function() {
      var g = d3.select(this), items = {};
      this.svg = d3.select(_self.chartElem);
      var legendPadding = g.attr("data-style-padding") || 10;
      var lb = g.selectAll(".legend-box").data([ true ]);
      var li = g.selectAll(".legend-items").data([ true ]);

      lb.enter().append("rect").classed("legend-box", true);
      li.enter().append("g").classed("legend-items", true);

      this.svg.selectAll("[data-legend]").each(
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

      var lbbox = li[0][0].getBBox();
      lb.attr("x", (lbbox.x - legendPadding)).attr("y",
          (lbbox.y - legendPadding)).attr("height",
          (lbbox.height + 2 * legendPadding)).attr("width",
          (lbbox.width + 2 * legendPadding));
    })
    return g;
  }  
  
  var brush2 = function() {
    _self.main_x.domain(brush.empty() ? _self.mini_x.domain() : brush.extent());
    for ( var key in _self.main_y) {
      _self.main.select(".line" + key).attr("d", _self.main_line[key]);
    }
    _self.main.select(".x.axis").call(main_xAxis);
  }

  var brushstart = function() {
    _self.startTime = brush.extent()[0];
  }

  var brushend = function() {
    var st = _self.startTime;
    st = new Date(Date.UTC(st.getFullYear(), st.getMonth(), st.getDate(), st
        .getHours(), st.getMinutes()));
    st = st.toISOString();

    var et = _self.endTime;
    et = brush.extent()[1];
    et = new Date(Date.UTC(et.getFullYear(), et.getMonth(), et.getDate(), et
        .getHours(), et.getMinutes()));
    et = et.toISOString();

    _self.redraw(st, et);
  }

  var brush = d3.svg.brush().x(this.mini_x).on("brush", brush2).on(
      'brushstart', brushstart).on('brushend', brushend);

  data.forEach(function(d) {
  try {
      var dt = _self.parseDate(d.date);
      d.date = dt;
  } catch (e) {
  }
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
      this.main_y[key] = d3.scale.sqrt().range([ this.main_height, 0 ]);
      this.mini_y[key] = d3.scale.sqrt().range([ this.mini_height, 0 ]);
    }
  }

  // /[ line definition ]///////////////////////////
  this.main_line['nsl_ms'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['nsl_ms'](d['nsl_ms']);
  });
  this.main_line['con_ms'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['con_ms'](d['con_ms']);
  });
  this.main_line['tfb_ms'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['tfb_ms'](d['tfb_ms']);
  });
  this.main_line['tot_ms'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['tot_ms'](d['tot_ms']);
  });
  this.main_line['state'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['state'](d['state']);
  });
  this.main_line['Judge'] = d3.svg.line().interpolate("step").x(function(d) {
    return _self.main_x(d.date);
  }).y(function(d) {
    return _self.main_y['Judge'](d['Judge']);
  });
  this.main_line['Aggregate_uptime'] = d3.svg.line().interpolate("cardinal").x(
      function(d) {
        return _self.main_x(d.date);
      }).y(function(d) {
    return _self.main_y['Aggregate_uptime'](d['Aggregate_uptime']);
  });

  for ( var key in this.main_y) {
    var type = '';
    if (key == 'Judge') {
      type = 'step';
    } else {
      type = 'cardinal';
    }
    this.mini_line[key] = d3.svg.line().interpolate(type).x(function(d) {
      return _self.mini_x(d.date);
    }).y(function(d) {
      return _self.mini_y[key](d[key]);
    });
  }

  this.main_x.domain([ data[0].date, data[data.length - 1].date ]);
  this.mini_x.domain(this.main_x.domain());

  for ( var key in this.main_y) {
    this.main_y[key].domain(d3.extent(data, function(d) {
      return d[key];
    }));
    this.mini_y[key].domain(this.main_y[key].domain());
  }

  // /[ main chart ]///////////////////////////
  for ( var key in this.main_y) {
    this.main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
        "class", "line line" + key).attr("d", this.main_line[key]).attr(
        "data-legend", function(d) {
          return key;
        });
  }

  // /[ main left x ]///////////////////////////
  this.main.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + this.main_height + ")").call(main_xAxis);
  // /[ main left y ]///////////////////////////
  var main_yAxisLeft = d3.svg.axis().scale(this.main_y['tot_ms'])
      .orient("left");
  this.main.append("g").attr("class", "y axis axisLeft").call(main_yAxisLeft)
      .append("text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy",
          ".71em").style("text-anchor", "end").text("( ms )");

  // /[ main right y ]///////////////////////////
  var main_yAxisRight = d3.svg.axis().scale(this.main_y['Judge']).orient(
      "right").ticks(1);
  this.main.append("g").attr("class", "y axis axisRight").attr("transform",
      "translate(" + this.main_width + ", 0)").call(main_yAxisRight).append(
      "text").attr("transform", "rotate(-90)").attr("y", 2).attr("dy", ".71em")
      .style("text-anchor", "end");

  // /[ this.mini chart ]///////////////////////////
  this.mini.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + this.mini_height + ")").call(main_xAxis);
  for ( var key in this.main_y) {
    this.mini.append("path").datum(data).attr("class", "line line" + key).attr(
        "d", this.mini_line[key]);
  }

  this.mini.append("g").attr("class", "x brush").call(brush).selectAll("rect")
      .attr("y", -6).attr("height", this.mini_height + 7);

  // /[ focus ]///////////////////////////
  var focus = this.main.append("g").attr("class", "focus").style("display",
      "none");
  for ( var key in this.main_y) {
    focus.append("line").attr("class", "y" + key).attr("x1",
        this.main_width - 6).attr("x2", this.main_width + 6);
    focus.append("circle").attr("class", "y" + key).attr("r", 4);
    focus.append("text").attr("class", "y" + key).attr("dy", "-1em");
  }

  var bisectDate = d3.bisector(function(d) {
    return d.date;
  }).left;
  var formatDate2 = d3.time.format("%H:%M:%S");

  var mousemove = function() {
    var x0 = _self.main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
    var d1 = data[i];
    if (d1.date) {
      var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
      for ( var key in _self.main_y) {
        focus.select("circle.y" + key).attr(
            "transform",
            "translate(" + _self.main_x(d.date) + ","
                + _self.main_y[key](d[key]) + ")");
        var formatOutput = key + "-" + formatDate2(d.date) + " - " + d[key]
            + " ms";
        focus.select("text.y" + key).attr(
            "transform",
            "translate(" + _self.main_x(d.date) + ","
                + _self.main_y[key](d[key]) + ")").text(formatOutput).style(
            'font', '10px sans-serif');
        focus.select(".y" + key).attr(
            "transform",
            "translate(" + _self.main_width * -1 + ", "
                + _self.main_y[key](d[key]) + ")").attr("x2",
            _self.main_width + _self.main_x(d.date));
      }
      focus.select(".x").attr("transform",
          "translate(" + _self.main_x(d.date) + ",0)");
    }
  }

  this.main.append("rect").attr("class", "overlay").attr("width",
      this.main_width).attr("height", this.main_height).on("mouseover",
      function() {
        focus.style("display", null);
      }).on("mouseout", function() {
    focus.style("display", "none");
  }).on("mousemove", mousemove);

  // /[ legend ]///////////////////////////
  var legend = this.main.append("g").attr("class", "legend").attr("transform",
      "translate(40, 10)").style('font', '10px sans-serif').call(d3.legend);

  setTimeout(function() {
    legend.style('font', '10px sans-serif').attr("data-style-padding", 10)
        .call(d3.legend)
  }, 1000)
}

/////////////////////////////////////////////////////////////////////////////////
//[ map chart ]
/////////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeMap = function(json) {
  var _self = this;
  this.svg = d3.select(this.mapElem).insert("svg").attr("width", this.map.w)
      .attr("height", this.map.h);
  this.states = this.svg.append("g").attr("id", "states");
  this.circles = this.svg.append("g").attr("id", "circles");
  this.labels = this.svg.append("g").attr("id", "labels");
  var xy = d3.geo.equirectangular().scale(150);
  var path = d3.geo.path().projection(xy);

  d3.json("countries.json", function(collection) {
    _self.states.selectAll("path").data(collection.features).enter().append(
        "path").attr("d", path).on(
        "mouseover",
        function(d) {
          d3.select(this).style("fill", "#6C0").append("title").text(
              d.properties.name);
        }).on("mouseout", function(d) {
      d3.select(this).style("fill", "#ccc");
    })
  });

  this.mapData = json;
  this.circles.selectAll("circle").data(json).enter().append("circle").attr(
      "cx", function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("cy", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("r", function(d) {
    return _self.getSize(d);
    // }).attr("title", function(d) {
    // return d["city"] + ": " + Math.round(d["2016-01-23T00:38:00.000Z"]);
  }).on("mouseover", function(d) {
    d3.select(this).style("fill", "#FC0");
  }).on("mouseout", function(d) {
    d3.select(this).style("fill", "steelblue");
  }).style("fill", function(d) {
    return _self.getColor(d);
  });

  this.labels.selectAll("labels").data(json).enter().append("text").attr("x",
      function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("y", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("dy", "0.3em").attr("text-anchor", "middle").style('font',
      '10px sans-serif').text(function(d) {
    return Math.round(_self.getTotal(d));
  });
}

/////////////////////////////////////////////////////////////////////////////////
//[ redraw by brush ]
/////////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.redraw = function(startTime, endTime) {
  var _self = this;
  var json = [];
  if (startTime && endTime) {
    for (var i = 0; i < this.mapData.length; i++) {
      var obj = {};
      for ( var key in this.mapData[i]) {
        if (key == 'city' || key == 'latitude' || key == 'longitude') {
          obj[key] = this.mapData[i][key];
        } else {
          if (new Date(key) >= new Date(startTime)
              && new Date(key) <= new Date(endTime)) {
            obj[key] = this.mapData[i][key];
          }
        }
      }
      json.push(obj);
    }
  } else {
    json = this.mapData;
  }

  this.circles.selectAll("circle").transition().duration(1000).ease("linear")
      .attr("r", function(d) {
        return _self.getSize(json, d.city);
      }).attr("title", function(d) {
        return d["city"] + ": " + Math.round(_self.getTotal(json, d.city));
      });

  this.circles.selectAll("circle").style("fill", function(d) {
    return _self.getColor(json, d.city);
  });

  this.labels.selectAll("text").text(function(d) {
    return Math.round(_self.getTotal(json, d.city));
  });
}

/// [configuration] //////////////////////////////////////////////////////////////////////////////
var config = {
  chart : {
    w : 950,
    h : 400,
    mh : 350,
    main_margin : {
      top : 20,
      right : 80,
      bottom : 100,
      left : 40
    },
    mini_margin : {
      top : 300,
      right : 80,
      bottom : 20,
      left : 40
    }
  },
  map : {
    w : 1200,
    h : 400,
    scale : 1.
  }
}

/////////////////////////////////////////////////////////////////////////////////

var uptimeChart = new UptimeChart("#chart", "#graph", config);

d3.json("data.txt", function(error, data) {
  uptimeChart.makeUptimeChart(data);
  d3.json("map.json", function(json) {
    uptimeChart.makeMap(json);
  });
});
