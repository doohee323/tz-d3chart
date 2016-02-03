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
  this.startTime, this.endTime, this.type;
  this.config = config;

  this.main_width = config.chart.main_margin.width
      - config.chart.main_margin.left - config.chart.main_margin.right
  this.main_height = config.chart.main_margin.height
      - config.chart.main_margin.top - config.chart.main_margin.bottom;
  this.mini_height = config.chart.mini_margin.height
      - config.chart.mini_margin.top - config.chart.mini_margin.bottom;

  this.formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  this.parseDate = this.formatDate.parse;

  this.main_x = d3.time.scale().range([ 0, this.main_width ]);
  this.mini_x = d3.time.scale().range([ 0, this.main_width ]);

  this.states;
  this.circles;
  this.labels;

  this.mapData = new Array();
  this.circle_scale = 1. / config.map.circle_scale;

  this.getSize = function(d, loc) {
    var size = Math.round(this.getTotal(d, loc) * this.circle_scale);
    if (size >= 10) {
      size = 30;
    } else if (size >= 3) {
      size = 20;
    } else if (size < 3) {
      size = 10;
    }
    return size;
  }

  this.getColor = function(d, loc) {
    var size = Math.round(this.getTotal(d, loc) * this.circle_scale);
    if (size >= 10) {
      return "red";
    } else if (size >= 3) {
      return "yellow";
    }
    return "green";
  }

  this.getTotal = function(d, loc) {
    if (loc) {
      for (var i = 0; i < d.length; i++) {
        if (d[i].loc == loc) {
          d = d[i];
          break;
        }
      }
    }
    var total = 0;
    for ( var key in d) {
      if (key != 'loc' && key != 'latitude' && key != 'longitude') {
        total += parseFloat(d[key]);
      }
    }
    return total;
  }

  this.convertRGBDecimalToHex = function(rgb) {
    var regex = /rgb *\( *([0-9]{1,3}) *, *([0-9]{1,3}) *, *([0-9]{1,3}) *\)/;
    var values = regex.exec(rgb);
    if (values.length != 4) {
      return rgb; // fall back to what was given.
    }
    var r = Math.round(parseFloat(values[1]));
    var g = Math.round(parseFloat(values[2]));
    var b = Math.round(parseFloat(values[3]));
    return "#" + (r + 0x10000).toString(16).substring(3).toUpperCase()
        + (g + 0x10000).toString(16).substring(3).toUpperCase()
        + (b + 0x10000).toString(16).substring(3).toUpperCase();
  }

  this.getLabelFullName = function(akey) {
    var mapping = this.config.mapping;
    for ( var key in mapping) {
      if (key == akey) {
        return mapping[key];
      }
    }
    return akey;
  }

  this.makeCombo = function(ds, id, cb) {
    id = '#' + id;
    if ($(id + " option").length > 0)
      return;
    var select = $(id);
    if (select.length > 0) {
      var options;
      if (select.prop) {
        options = select.prop('options');
      } else {
        options = select.attr('options');
      }
      $('option', select).remove();
      options[options.length] = new Option('all', '*');
      $.each(ds,
          function(key, obj) {
            if (key != 'date') {
              options[options.length] = new Option(_self.getLabelFullName(key),
                  key);
            }
          });
      select.change(function(e) {
        cb.call(e, $(id).val());
      });
    }
  }

  this.makeCombo2 = function(ds, id, cb) {
    id = '#' + id;
    if ($(id + " option").length > 0)
      return;
    var select = $(id);
    if (select.length > 0) {
      var options;
      if (select.prop) {
        options = select.prop('options');
      } else {
        options = select.attr('options');
      }
      $('option', select).remove();
      options[options.length] = new Option('all', '*');
      $.each(ds, function(key, obj) {
        options[options.length] = new Option(_self.getLabelFullName(obj.loc),
            obj.loc);
      });
      select.change(function(e) {
        cb.call(e, $(id).val());
      });
    }
  }

  // make mapData for chart from maxtrix, locs
  this.makeMapData = function(resultset, type) {
    var data = resultset.data.metrix;
    var locs = resultset.meta.locs;

    var mapData = new Array();
    for (var i = 0; i < locs.length; i++) {
      var loc = locs[i].loc;
      var row = {};
      row.loc = loc;
      row.latitude = locs[i].latitude;
      row.longitude = locs[i].longitude;
      for (var j = 0; j < data.length; j++) {
        if (data[j].target == loc + '.' + type) {
          var datapoints = data[j].datapoints;
          for (var p = 0; p < datapoints.length; p++) {
            var dt = new Date(datapoints[p][1] * 1000);
            var t = _self.toUTCISOString(dt);
            if (datapoints[p][0]) {
              row[t] = datapoints[p][0];
            } else {
              row[t] = 0;
            }
          }
        }
      }
      if (Object.keys(row).length > 3) {
        mapData.push(row);
      }
    }

    for (var i = 0; i < locs.length; i++) {
      var loc = locs[i].loc;
      var bExist = false;
      for (var j = 0; j < mapData.length; j++) {
        if (mapData[j].loc == loc) {
          bExist = true;
          break;
        }
      }
      if (!bExist) {
        var row = {};
        row.loc = loc;
        row.latitude = locs[i].latitude == null ? 100 : locs[i].latitude;
        row.longitude = locs[i].longitude == null ? 100 : locs[i].longitude;
        for ( var key in mapData[0]) {
          if (key != 'loc' && key != 'latitude' && key != 'longitude') {
            row[key] = 0;
          }
        }
        mapData.push(row);
      }
    }
    return mapData;
  }

  // make chartData for chart
  this.makeChartData = function(resultset) {
    var max = 0;
    var locMetrix = resultset.data.metrix;
    var metrix = resultset.data.avgMetrix;
    var judge = resultset.data.judge;
    var active = resultset.data.active[0];
    var include = resultset.data.include[0];
    var metrices = resultset.meta.metrices;
    var locs = resultset.meta.locs;
    var chartData = new Array();

    for (var q = 0; q < metrix[0].datapoints.length - 1; q++) {
      var avail = 0;
      var sum = 0;
      var jsonRow = {
        date : new Date(metrix[0].datapoints[q][1] * 1000)
      };
      for (var i = 0; i < metrix.length; i++) {
        var target = metrix[i].target;
        if (!metrix[i].description) {
          metrix[i].description = new Array();
        }
        if (!metrix[i].description[q]) {
          metrix[i].description[q] = {};
        }
        if (active != null) {
          // availability = #2 / (active + include)
          var v1 = active.datapoints[q][0];
          var v2 = metrix[i].datapoints[q][0] != null ? metrix[i].datapoints[q][0]
              : 0;
          var v3 = include.datapoints[q][0];
          if (v1) {
            metrix[i].description[q].v1 = Number((v1).toFixed(1));
          }
          metrix[i].description[q].v2 = v2;
          metrix[i].description[q].v3 = v3;
          avail = Math.floor((v2 / (v1 + v3)));
          if (isNaN(avail) || avail == Number.POSITIVE_INFINITY) {
            avail = 0;
          }
          jsonRow[target] = v2;
        } else {
          console.log('active is null');
        }
        sum += avail;
      } // for i
      if (judge && active != null) {
        if (!judge[0].datapoints[q][0] || judge[0].datapoints[q][0] == 0) {
          jsonRow['judge'] = 0;
        } else {
          jsonRow['judge'] = judge[0].datapoints[q][0];
        }
      }
      if (sum > max) {
        max = sum;
      }
      jsonRow['aggregate'] = sum;
      chartData.push(jsonRow);
    } // for q

    for (var i = 0; i < chartData.length; i++) {
      var uptime = chartData[i]['aggregate'];
      var uptime_per = uptime / max * 100;
      if (uptime_per) {
        uptime_per = Number((uptime_per).toFixed(1));
      } else {
        uptime_per = 0;
      }
      chartData[i]['aggregate'] = uptime_per;
    }
    return chartData;
  }

  // make data for makeDiagram
  this.makeDiagramData = function(json, brushed) {
    var data = new Array();
    if (brushed) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _self.brush.extent()[0]
            && json[i].date <= _self.brush.extent()[1]) {
          data.push(json[i]);
        }
      }
    } else {
      data = json;
    }
    if (data.length == 0) {
      data = json;
    }
    var data2 = new Array();
    var date = 0;
    var nsl_ms = 0;
    var con_ms = 0;
    var tfb_ms = 0;
    for (var i = 0; i < data.length; i++) {
      if (i % 20 == 0 && i > 0) {
        var tmp = {};
        tmp.date = data[i].date;
        tmp.nsl_ms = Math.round(parseFloat(nsl_ms / 20));
        tmp.con_ms = Math.round(parseFloat(con_ms / 20));
        tmp.tfb_ms = Math.round(parseFloat(tfb_ms / 20));
        data2.push(tmp);
        nsl_ms = 0;
        con_ms = 0;
        tfb_ms = 0;
      }
      nsl_ms += parseFloat(data[i].nsl_ms);
      con_ms += parseFloat(data[i].con_ms);
      tfb_ms += parseFloat(data[i].tfb_ms);
    }
    return data2;
  }

  this.init = function() {
    _self.main_y = {};
    _self.mini_y = {};
    _self.main_line = {};
    _self.mini_line = {};
    _self.main, _self.mini, _self.svg;
    _self.startTime, _self.endTime, _self.type;
  }

  this.toUTCISOString = function(st) {
    st = new Date(Date.UTC(st.getFullYear(), st.getMonth(), st.getDate(), st
        .getHours(), st.getMinutes()));
    return st.toISOString();
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// [ line chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeChart = function(resultset, cb) {
  var data = this.makeChartData(resultset);

  var _self = this;
  this.data = data;

  var metrices = {};
  for ( var key in data[0]) {
    if (key != _self.config.chart.yAxis.right) {
      metrices[key] = key;
    }
  }
  this.makeCombo(metrices, this.config.chart.combo.id, function(val) {
    if (val == '*') {
      data2 = _self.data;
    } else {
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        var tmp = {};
        for ( var key in data[i]) {
          if (key == 'date' || key == val
              || key == _self.config.chart.yAxis.right) {
            tmp[key] = data[i][key];
          }
        }
        data2[data2.length] = tmp;
      }
    }
    d3.select("svg").remove();
    _self.init();
    _self.drawChart(data2, val);
  });

  this.drawChart(data, _self.config.chart.combo.init);
  $('#' + this.config.chart.combo.id).val(_self.config.chart.combo.init);

  cb.call(null, data);
}

UptimeChart.prototype.drawChart = function(data, metric) {
  var _self = this;
  this.svg = d3.select(this.chartElem).append("svg").attr(
      "width",
      this.main_width + this.config.chart.main_margin.left
          + this.config.chart.main_margin.right).attr(
      "height",
      this.main_height + this.config.chart.main_margin.top
          + this.config.chart.main_margin.bottom + this.mini_height);

  this.svg.append("defs").append("clipPath").attr("id", "clip").append("rect")
      .attr("width", this.main_width).attr("height", this.main_height);

  this.main = this.svg.append("g").attr(
      "transform",
      "translate(" + this.config.chart.main_margin.left + ","
          + this.config.chart.main_margin.top + ")");

  this.mini = this.svg.append("g").attr(
      "transform",
      "translate(" + this.config.chart.mini_margin.left + ","
          + this.config.chart.mini_margin.top + ")");

  var main_xAxis = d3.svg.axis().scale(this.main_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");
  var mini_xAxis = d3.svg.axis().scale(this.mini_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");

  d3.legend = function(g) {
    g
        .each(function() {
          var g = d3.select(this), items = {};
          this.svg = d3.select(_self.chartElem);
          var legendPadding = g.attr("data-style-padding") || 10;
          var lb = g.selectAll(".legend-box").data([ true ]);
          var li = g.selectAll(".legend-items").data([ true ]);

          lb.enter().append("rect").classed("legend-box", true);
          li.enter().append("g").classed("legend-items", true);

          this.svg
              .selectAll("[data-legend]")
              .each(
                  function() {
                    if (metric == '*') {
                      var self = d3.select(this);
                      items[self.attr("data-legend")] = {
                        pos : self.attr("data-legend-pos") || this.getBBox().y,
                        color : self.attr("data-legend-color") != undefined ? self
                            .attr("data-legend-color")
                            : self.style("fill") != 'none' ? self.style("fill")
                                : self.style("stroke")
                      }
                    } else {
                      var self = d3.select(this);
                      if (self.attr("data-legend") == metric
                          || self.attr("data-legend") == _self.config.chart.yAxis.right) {
                        items[self.attr("data-legend")] = {
                          pos : self.attr("data-legend-pos")
                              || this.getBBox().y,
                          color : self.attr("data-legend-color") != undefined ? self
                              .attr("data-legend-color")
                              : self.style("fill") != 'none' ? self
                                  .style("fill") : self.style("stroke")
                        }
                      }
                    }
                  })
          items = d3.entries(items).sort(function(a, b) {
            return a.value.pos - b.value.pos;
          })

          // set judge first in array
          var items2 = new Array();
          items2.push(items.find(function(element, index, array) {
            if (element.key == _self.config.chart.yAxis.right) {
              return element;
            } else {
              return false;
            }
          }));
          for (var i = 0; i < items.length; i++) {
            if (items[i].key != _self.config.chart.yAxis.right) {
              items2.push(items[i]);
            }
          }
          items = items2;

          var toggle = function(type, d, i) {
            _self.type = d.key;
            if (type == 'text') {
              if ('#FFFFFF' == _self.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"))) {
                if (_self.type == _self.config.chart.yAxis.right) {
                  d3.select(".line" + d.key).style("stroke", d.color).style(
                      "fill", d.color);
                } else {
                  d3.select(".line" + d.key).style("stroke", d.color);
                }
                d3.select("circle.y" + d.key).style("stroke", d.color);
                d3.select("line.y" + d.key).style("stroke", d.color);
              }
            } else if (type == 'circle') {
              var pickColor = _self.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"));
              if (pickColor != '#FFFFFF') {
                d.color = pickColor;
                if (_self.type == _self.config.chart.yAxis.right) {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF').style(
                      "fill", "white");
                } else {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF');
                }
                d3.select("circle.y" + d.key).style("stroke", '#FFFFFF');
                d3.select("line.y" + d.key).style("stroke", '#FFFFFF');
              }
            }
            _self.redraw();
          }

          li.selectAll("text").data(items, function(d) {
            return d.key;
          }).call(function(d) {
            d.enter().append("text");
          }).call(function(d) {
            d.exit().remove();
          }).attr("y", function(d, i) {
            return "0.25em";
          }).attr("x", function(d, i) {
            var col = i * _self.config.chart.legend.width + 1;
            return col + "em";
          }).text(function(d, i) {
            return _self.getLabelFullName(d.key);
          }).on("click", function(d, i) {
            toggle('text', d, i);
          }).style("cursor", "pointer");
          li.selectAll("circle").data(items, function(d) {
            return d.key;
          }).call(function(d) {
            d.enter().append("circle");
          }).call(function(d) {
            d.exit().remove();
          }).attr("cy", function(d, i) {
            return "0em";
          }).attr("cx", function(d, i) {
            var col = i * _self.config.chart.legend.width;
            return col + "em";
          }).attr("r", "0.8em").style("fill", function(d) {
            return d.value.color;
          }).on("click", function(d, i) {
            toggle('circle', d, i);
          }).style("cursor", "pointer");

          var lbbox = li[0][0].getBBox();
          lb.attr("x", (lbbox.x - legendPadding)).attr("y",
              (lbbox.y - legendPadding)).attr("height",
              (lbbox.height + 2 * legendPadding)).attr("width",
              (lbbox.width + 2 * legendPadding));
        })
    return g;
  }

  var brush2 = function() {
    _self.main_x.domain(_self.brush.empty() ? _self.mini_x.domain()
        : _self.brush.extent());
    for ( var key in _self.main_y) {
      _self.main.select(".line" + key).attr("d", _self.main_line[key]);
    }
    _self.main.select(".x.axis").call(main_xAxis);
  }

  var brushstart = function() {
    _self.startTime = _self.brush.extent()[0];
  }

  var brushend = function() {
    _self.redraw(true);
  }

  this.brush = d3.svg.brush().x(this.mini_x).on("brush", brush2).on(
      'brushstart', brushstart).on('brushend', brushend);

  data.forEach(function(d) {
    try {
      var dt = _self.parseDate(d.date);
      d.date = dt;
    } catch (e) {
    }
    for ( var key in data[0]) {
      if (key != 'date') {
        // if (key == 'judge' || key == 'nsl_ms') {
        d[key] = +d[key];
      }
    }
  });

  data.sort(function(a, b) {
    return a.date - b.date;
  });

  for ( var key in data[0]) {
    if (key != 'date') {
      // if (key == 'judge' || key == 'nsl_ms') {
      this.main_y[key] = d3.scale.sqrt().range([ this.main_height, 0 ]);
      this.mini_y[key] = d3.scale.sqrt().range([ this.mini_height, 0 ]);
    }
  }

  // /[ line definition ]///////////////////////////
  if (metric == '*') {
    for ( var key in this.main_y) {
      if (this.config.chart.yAxis.right != key) {
        this.mini_line[key] = d3.svg.line().interpolate('cardinal').x(
            function(d) {
              return _self.mini_x(d.date);
            }).y(function(d) {
          return _self.mini_y[key](d[key]);
        });
        // it doesn't work for brushing
        // this.main_line[key] =
        // d3.svg.line().interpolate('cardinal').x(function(d) {
        // return _self.main_x(d.date);
        // }).y(function(d) {
        // return _self.main_y[key](d[key]);
        // });
      }
    }
  } else {
    this.mini_line[metric] = d3.svg.line().interpolate('cardinal').x(
        function(d) {
          return _self.mini_x(d.date);
        }).y(function(d) {
      return _self.mini_y[metric](d[metric]);
    });
  }
  this.mini_line[this.config.chart.yAxis.right] = d3.svg.line().interpolate(
      'step').x(function(d) {
    return _self.mini_x(d.date);
  }).y(
      function(d) {
        return _self.mini_y[_self.config.chart.yAxis.right]
            (d[_self.config.chart.yAxis.right]);
      });

  // I need to enumerate instead of above fancy way.
  if (metric != '*') {
    this.main_line[metric] = d3.svg.line().interpolate("cardinal").x(
        function(d) {
          return _self.main_x(d.date);
        }).y(function(d) {
      return _self.main_y[metric](d[metric]);
    });
  } else {
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
    this.main_line['aggregate'] = d3.svg.line().interpolate("cardinal").x(
        function(d) {
          return _self.main_x(d.date);
        }).y(function(d) {
      return _self.main_y['aggregate'](d['aggregate']);
    });
  }
  this.main_line['judge'] = d3.svg.line().interpolate("step").x(function(d) {
    return _self.main_x(d.date);
  }).y(function(d) {
    return _self.main_y['judge'](d['judge']);
  });

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
  var main_yAxisLeft;
  if (metric != '*') {
    main_yAxisLeft = d3.svg.axis().scale(this.main_y[metric]).orient("left");
  } else {
    main_yAxisLeft = d3.svg.axis().scale(
        this.main_y[this.config.chart.yAxis.left]).orient("left");
  }
  this.main.append("g").attr("class", "y axis axisLeft").call(main_yAxisLeft)
      .append("text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy",
          ".71em").style("text-anchor", "end").text("( ms )");

  // /[ main right y ]///////////////////////////
  var main_yAxisRight = d3.svg.axis().scale(
      this.main_y[this.config.chart.yAxis.right]).orient("right").ticks(1);
  this.main.append("g").attr("class", "y axis axisRight").attr("transform",
      "translate(" + this.main_width + ", 0)").call(main_yAxisRight).append(
      "text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em")
      .style("text-anchor", "end").text("( ms )");

  // /[ this.mini chart ]///////////////////////////
  this.mini.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + this.mini_height + ")").call(main_xAxis);
  for ( var key in this.main_y) {
    this.mini.append("path").datum(data).attr("class", "line line" + key).attr(
        "d", this.mini_line[key]);
  }

  this.mini.append("g").attr("class", "x brush").call(this.brush).selectAll(
      "rect").attr("y", -6).attr("height", this.mini_height + 7);

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
    var type = $('#' + _self.config.chart.combo.id).val();
    if (type == '*')
      return;
    var x0 = _self.main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
    var d1 = data[i];
    if (d1.date) {
      var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
      for ( var key in _self.main_y) {
        if (key != type)
          continue;
        if (key != _self.config.chart.yAxis.right
            && '#FFFFFF' != _self.convertRGBDecimalToHex(d3.select(
                ".line" + key).style("stroke"))) {
          focus.select("circle.y" + key).attr(
              "transform",
              "translate(" + _self.main_x(d.date) + ","
                  + _self.main_y[key](d[key]) + ")");
          var formatOutput = _self.getLabelFullName(key) + " - "
              + formatDate2(d.date) + " - " + d[key] + " ms";
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
        } else {
          focus.select("text.y" + key).attr(
              "transform",
              "translate(" + _self.main_x(d.date) + ","
                  + _self.main_y[key](d[key]) + ")").text('');
        }
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
      "translate(40, " + this.config.chart.legend.y + ")").style('font',
      '10px sans-serif').call(d3.legend);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeMap = function(resultset, locs) {
  var _self = this;
  var data = resultset.data.metrix;
  var locs = resultset.meta.locs;
  this.map_data = this.makeMapData(resultset, 'state');

  this.makeCombo2(locs, this.config.map.combo.id, function(val) {
    if (val == '*') {
      data2 = _self.map_data;
    } else {
      var type = $('#' + _self.config.chart.combo.id).val();
      var data = _self.makeMapData(resultset, type);
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    d3.select("[id='map']").remove();
    _self.init();
    _self.drawMap(data2, val);
  });

  this.drawMap(this.map_data, _self.config.map.combo.init);
  $('#' + this.config.map.combo.id).val(_self.config.map.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw map ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawMap = function(data, loc) {
  var _self = this;
  this.svg = d3.select(this.mapElem).append("svg").attr('id', 'map').attr(
      "width", this.config.map.width).attr("height", this.config.map.height);
  this.states = this.svg.append("g").attr("id", "states");
  this.circles = this.svg.append("g").attr("id", "circles");
  this.labels = this.svg.append("g").attr("id", "labels");
  var xy = d3.geo.equirectangular().scale(this.config.map.scale);
  var path = d3.geo.path().projection(xy);

  d3.json("countries.json", function(data) {
    _self.states.selectAll("path").data(data.features).enter().append("path")
        .attr("d", path).on(
            "mouseover",
            function(d) {
              d3.select(this).style("fill", "#6C0").append("title").text(
                  d.properties.name);
            }).on("mouseout", function(d) {
          d3.select(this).style("fill", "#ccc");
        })
  });

  this.mapData = data;
  this.circles.selectAll("circle").data(data).enter().append("circle").attr(
      "cx", function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("cy", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("r", function(d) {
    return _self.getSize(d);
  }).on(
      "mouseover",
      function(d, i) {
        d3.select(this).style("fill", "#FC0");
        var html = '<div style="width: 250px;">';
        html += '<div>* Site: ' + d["loc"];
        html += '</div>';
        html += '<div>* Total: ' + Math.round(_self.getTotal(d))
            + ' (ms)</div>';
        html += '</div>';
        var g = d3.select(this); // The node
        var div = d3.select("body").append("div")
            .attr('pointer-events', 'none').attr("class", "tooltip").style(
                "opacity", 1).html(html).style("left",
                (d3.event.x + _self.config.map.tooltip.x + "px")).style("top",
                (d3.event.y + _self.config.map.tooltip.y + "px"));
      }).on("mouseout", function(d) {
    d3.select(this).style("fill", "steelblue");
    d3.select("body").select('div.tooltip').remove();
  }).style("fill", function(d) {
    return _self.getColor(d);
  });

  this.labels.selectAll("labels").data(data).enter().append("text").attr("x",
      function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("y", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("dy", "0.3em").attr("text-anchor", "middle").style('font',
      '10px sans-serif').text(function(d, i) {
    return Math.round(_self.getTotal(d));
  }).attr("d", path)
}

// ///////////////////////////////////////////////////////////////////////////////
// [ gmap chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeGMap = function(data) {
  var _self = this;
  this.gmap_data = data;

  var locs = {};
  for (var i = 0; i < data.length; i++) {
    locs[data[i].loc] = data[i].loc;
  }
  this.makeCombo(locs, this.config.gmap.combo.id, function(val) {
    if (val == '*') {
      data2 = _self.gmap_data;
    } else {
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    d3.select("[id='gmap']").remove();
    _self.init();
    _self.drawGMap(data2, val);
  });

  this.drawGMap(data, _self.config.gmap.combo.init);
  $('#' + this.config.gmap.combo.id).val(_self.config.gmap.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw gmap ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawGMap = function(data, loc) {
  var _self = this;

  var map = new google.maps.Map(d3.select("#googleMap").node(), {
    zoom : 2,
    center : new google.maps.LatLng(10, -350),
    mapTypeId : google.maps.MapTypeId.SATELLITE
  });

  var minZoomLevel = 2;
  google.maps.event.addListener(map, 'zoom_changed', function() {
    if (map.getZoom() < minZoomLevel)
      map.setZoom(minZoomLevel);
  });

  var overlay = new google.maps.OverlayView();

  overlay.onAdd = function() {
    var layer = d3.select(this.getPanes().overlayLayer).append("div").attr(
        'id', 'gmap').attr("class", "stations");

    overlay.draw = function() {
      var marker2 = layer.selectAll("svg").data(d3.entries(data)).each(
          transform).enter().append("svg:svg").each(transform);

      function transform(d) {
        d = d.value;
        if (100 == parseFloat(d.latitude))
          return;

        var marker = new google.maps.Marker({
          position : {
            lat : parseFloat(d.latitude),
            lng : parseFloat(d.longitude)
          },
          map : map,
          label : d.loc,
          title : d.loc
        });

        var contentString = '<div id="content">' + '<div id="siteNotice">'
            + '</div>' + '<h1 id="firstHeading" class="firstHeading">' + d.loc
            + '</h1>' + '<div id="bodyContent">' + '<p><b>' + d.loc
            + '</b> is a large Site.</p>'
            + '<a href="http://www.google.com">http://www.google.com</a> '
            + '(last visited June 22, 2016).</p>' + '</div>' + '</div>';

        var infowindow = new google.maps.InfoWindow({
          content : contentString,
          maxWidth : 200
        });
        marker.addListener('mouseover', function() {
          infowindow.open(map, marker);
        });
        // marker.addListener('mouseout', function() {
        // infowindow.close();
        // });

        var locCircle = new google.maps.Circle({
          strokeColor : '#FF0000',
          strokeOpacity : 0.8,
          strokeWeight : 2,
          fillColor : '#FF0000',
          fillOpacity : 0.35,
          map : map,
          label : d.loc,
          center : {
            lat : parseFloat(d.latitude),
            lng : parseFloat(d.longitude)
          },
          radius : Math.sqrt(100000000) * 100
        });

        var marker2 = new google.maps.Marker({
          position : {
            lat : parseFloat(d.latitude),
            lng : parseFloat(d.longitude)
          },
          map : map,
          optimized : false,
          icon : {
            url : '714_trans.gif',
            size : new google.maps.Size(100, 100),
            origin : new google.maps.Point(0, 0),
            anchor : new google.maps.Point(32, 32)
          },
          title : d.loc,
          zIndex : 0
        });

      }
    };
  };

  overlay.setMap(map);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ redraw by brush ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.redraw = function(brushed) {
  var _self = this;
  var json = [];

  var startTime = _self.toUTCISOString(_self.brush.extent()[0]);
  var endTime = _self.toUTCISOString(_self.brush.extent()[1]);

  if (brushed) {
    for (var i = 0; i < this.mapData.length; i++) {
      var obj = {};
      for ( var key in this.mapData[i]) {
        if (key == 'loc' || key == 'latitude' || key == 'longitude') {
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

  this.drawDiagram(this.makeDiagramData(this.diagram_data, true));

  if (_self.type) {
    for (var i = 0; i < this.mapData.length; i++) {
      var obj = {};
      for ( var key in this.mapData[i]) {
        if (key == 'loc' || key == 'latitude' || key == 'longitude') {
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
  }

  this.circles.selectAll("circle").transition().duration(1000).ease("linear")
      .attr("r", function(d) {
        return _self.getSize(json, d.loc);
      }).attr("title", function(d) {
        return d["loc"] + ": " + Math.round(_self.getTotal(json, d.loc));
      });

  this.circles.selectAll("circle").style("fill", function(d) {
    return _self.getColor(json, d.loc);
  });

  this.labels.selectAll("text").text(function(d) {
    return Math.round(_self.getTotal(json, d.loc));
  });

}

// ///////////////////////////////////////////////////////////////////////////////
// [ makeDiagram ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeDiagram = function(id, data) {
  var _self = this;
  _self.id = id;
  _self.diagram_data = data;

  var barColor = 'steelblue';
  function segColor(c) {
    return {
      nsl_ms : "red",
      con_ms : "blue",
      tfb_ms : "green"
    }[c];
  }

  // function to handle histogram.
  _self.histogram = function(fD) {
    var hg = {};
    var hgDim = {
      top : 0,
      right : _self.config.chart.main_margin.right,
      bottom : 0,
      left : _self.config.chart.main_margin.left
    };
    hgDim.width = _self.main_width;
    hgDim.height = 40 - hgDim.top - hgDim.bottom;

    var hgsvg = d3.select(id).append("svg").attr('id', 'hgsvg').attr("width",
        hgDim.width + hgDim.left + hgDim.right).attr("height",
        hgDim.height + hgDim.top + hgDim.bottom).append("g").attr("transform",
        "translate(" + hgDim.left + "," + hgDim.top + ")");

    var x = d3.scale.ordinal().rangeRoundBands([ 0, hgDim.width ], 0.1).domain(
        fD.map(function(d) {
          return d[0];
        }));

    hgsvg.append("g").attr("class", "x axis").attr("transform",
        "translate(0," + hgDim.height + ")").call(
        d3.svg.axis().scale(x).orient("bottom"));

    var y = d3.scale.linear().range([ hgDim.height, 0 ]).domain(
        [ 0, d3.max(fD, function(d) {
          return d[1];
        }) ]);

    var bars = hgsvg.selectAll(".bar").data(fD).enter().append("g").attr(
        "class", "bar");
    bars.append("rect").attr("x", function(d) {
      return x(d[0]);
    }).attr("y", function(d) {
      return y(d[1]);
    }).attr("width", x.rangeBand()).attr("height", function(d) {
      return hgDim.height - y(d[1]);
    }).attr('fill', barColor).style("cursor", "pointer").on("mouseover",
        mouseover).on("mouseout", mouseout);

    bars.append("text").text(function(d) {
      return d3.format(",")(d[1])
    }).attr("x", function(d) {
      return x(d[0]) + x.rangeBand() / 2;
    }).attr("y", function(d) {
      return y(d[1]) + 18;
    }).attr("text-anchor", "middle").style('fill', 'white');

    function mouseover(d) {
      var st = _self.fData.filter(function(s) {
        return s.date == d[0];
      })[0];
      var nd = d3.keys(st).map(function(s) {
        return {
          type : s,
          freq : st[s]
        };
      });
      nd = nd.slice(1, nd.length - 1); // remove date & tot_ms
      _self.pc.update(nd);
      _self.lg.update(nd);
    }

    function mouseout(d) {
      _self.pc.update(_self.tf);
      _self.lg.update(_self.tf);
    }

    hg.update = function(nd, color) {
      y.domain([ 0, d3.max(nd, function(d) {
        return d[1];
      }) ]);

      var bars = hgsvg.selectAll(".bar").data(nd);
      bars.select("rect").transition().duration(500).attr("y", function(d) {
        return y(d[1]);
      }).attr("height", function(d) {
        return hgDim.height - y(d[1]);
      }).attr("fill", color);

      bars.select("text").transition().duration(500).text(function(d) {
        return d3.format(",")(d[1])
      }).attr("y", function(d) {
        return y(d[1]) + 18;
      });
    }
    return hg;
  }

  // function to handle pieChart.
  _self.pieChart = function(pD) {
    var pc = {};
    var pieDim = {
      width : 170,
      height : 120
    };
    pieDim.right = Math.min(pieDim.width, pieDim.height) / 2;
    var piesvg = d3.select(id).append("svg").attr('id', 'piesvg').attr("width",
        pieDim.width).attr("height", pieDim.height).append("g").attr(
        "transform", "translate(120,60)");
    var arc = d3.svg.arc().outerRadius(pieDim.right - 10).innerRadius(0);
    var pie = d3.layout.pie().sort(null).value(function(d) {
      return d.freq;
    });

    piesvg.selectAll("path").data(pie(pD)).enter().append("path")
        .attr("d", arc).each(function(d) {
          this._current = d;
        }).style("fill", function(d) {
          return segColor(d.data.type);
        }).on("mouseover", mouseover).on("mouseout", mouseout);

    pc.update = function(nd) {
      piesvg.selectAll("path").data(pie(nd)).transition().duration(500)
          .attrTween("d", arcTween);
    }
    function mouseover(d) {
      _self.hg.update(_self.fData.map(function(v) {
        return [ v.date, v[d.data.type] ];
      }), segColor(d.data.type));
    }
    function mouseout(d) {
      _self.hg.update(_self.fData.map(function(v) {
        return [ v.date, v.tot_ms ];
      }), barColor);
    }
    function arcTween(a) {
      var i = d3.interpolate(this._current, a);
      this._current = i(0);
      return function(t) {
        return arc(i(t));
      };
    }
    return pc;
  }

  _self.legend2 = function(lD) {
    var lg = {};
    var legend2 = d3.select(id).append("table").attr('id', 'tr').attr("style",
        "margin-left: 150px").attr('class', 'legend2');
    var tr = legend2.append("tbody").selectAll("tr").data(lD).enter().append(
        "tr");
    tr.append("td").append("svg").attr("width", '16').attr("height", '16')
        .append("rect").attr("width", '16').attr("height", '16').attr("fill",
            function(d) {
              return segColor(d.type);
            });
    tr.append("td").attr("class", 'legend2Name').text(function(d) {
      return _self.getLabelFullName(d.type) + ":";
    });
    tr.append("td").attr("class", 'legend2Freq').text(function(d) {
      return d3.format(",")(d.freq);
    });
    tr.append("td").attr("class", 'legend2Perc').text(function(d) {
      return getLegend(d, lD);
    });
    lg.update = function(nd) {
      var l = legend2.select("tbody").selectAll("tr").data(nd);
      l.select(".legend2Freq").text(function(d) {
        return d3.format(",")(d.freq);
      });
      l.select(".legend2Perc").text(function(d) {
        return getLegend(d, nd);
      });
    }
    function getLegend(d, aD) {
      return d3.format("%")(d.freq / d3.sum(aD.map(function(v) {
        return v.freq;
      })));
    }
    return lg;
  }
  this.drawDiagram(this.makeDiagramData(data));
}

UptimeChart.prototype.drawDiagram = function(data) {
  var _self = this;
  d3.select("[id='hgsvg']").remove();
  d3.select("[id='piesvg']").remove();
  d3.select("[id='tr']").remove();

  _self.fData = data;
  _self.fData.forEach(function(d) {
    d.tot_ms = d.nsl_ms + d.con_ms + d.tfb_ms;
  });

  _self.tf = [ 'nsl_ms', 'con_ms', 'tfb_ms' ].map(function(d) {
    return {
      type : d,
      freq : d3.sum(_self.fData.map(function(t) {
        return t[d];
      }))
    };
  });
  var sf = _self.fData.map(function(d) {
    return [ d.date, d.tot_ms ];
  });
  _self.hg = _self.histogram(sf);
  _self.pc = _self.pieChart(_self.tf);
  _self.lg = _self.legend2(_self.tf);
}

// //////////////////////////////////////////////////////////////////////////////
// / [configuration]
// //////////////////////////////////////////////////////////////////////////////
var config = {
  "chart" : {
    "yAxis" : {
      "left" : "tot_ms",
      "right" : "judge"
    },
    "main_margin" : {
      "width" : 950,
      "height" : 250,
      "top" : 50,
      "right" : 40,
      "bottom" : 40,
      "left" : 40
    },
    "mini_margin" : {
      "top" : 230,
      "bottom" : 0,
      "height" : 250,
      "right" : 40,
      "left" : 40
    },
    "combo" : {
      "id" : "gmetrices",
      "init" : "tot_ms"
    },
    "legend" : {
      "x" : 40,
      "y" : -25,
      "width" : 10
    }
  },
  "map" : {
    "height" : 400,
    "width" : 1200,
    "circle_scale" : 1,
    "scale" : 150,
    "tooltip" : {
      "x" : 20,
      "y" : 160
    },
    "combo" : {
      "id" : "locs",
      "init" : "*"
    }
  },
  "gmap" : {
    "height" : 300,
    "width" : 1000,
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
  "mapping" : {
    "nsl_ms" : "DNS Time", // DNS Lookup
    "con_ms" : "Connect Time", // Time To Connect
    "tfb_ms" : "Wait Time", // Time To 1st Byte
    "tot_ms" : "Response Time", // Roundtrip Time
    "state" : "Service State",
    "aggregate" : "Aggregate",
    "judge" : "Up/Down"
  }
}

// ///////////////////////////////////////////////////////////////////////////////
d3.json("data.json", function(error, json) {
  var uptimeChart = new UptimeChart("#chart", "#graph", config);
  uptimeChart.makeChart(json, function(data) {
    uptimeChart.makeDiagram('#diagram', data);
  });
  uptimeChart.makeMap(json);
  // d3.json("map.json", function(json) {
  // $('#googleMap').width(config.gmap.width).height(config.gmap.height);
  // uptimeChart.makeGMap(json);
  // });
});
