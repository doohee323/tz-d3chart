// ///////////////////////////////////////////////////////////////////////////////
// [ UptimeChart constructor ]
// ///////////////////////////////////////////////////////////////////////////////
var UptimeChart = function(config) {
  var _self = this;
  this.config = config;

  this.formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  this.parseDate = this.formatDate.parse;

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

  this.makeMapCombo = function(ds, id, cb) {
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
      options[options.length] = new Option('Select', '*');
      $.each(ds, function(key, obj) {
        options[options.length] = new Option(_self.getLabelFullName(obj.loc),
            obj.loc);
      });
      select.change(function(e) {
        cb.call(e, $(id).val());
      });
    }
  }

  this.makeLegend = function(g, id, metric) {
    g
        .each(function() {
          var g = d3.select(this);
          var items = {};
          var legendPadding = g.attr("data-style-padding") || 10;
          var lb = g.selectAll(".legend-box").data([ true ]);
          var li = g.selectAll(".legend-items").data([ true ]);

          lb.enter().append("rect").classed("legend-box", true);
          li.enter().append("g").classed("legend-items", true);

          d3
              .select(id)
              .selectAll("[data-legend]")
              .each(
                  function() {
                    var self = d3.select(this);
                    if (metric == '*') {
                      items[self.attr("data-legend")] = {
                        pos : self.attr("data-legend-pos") || this.getBBox().y,
                        color : self.attr("data-legend-color") != undefined ? self
                            .attr("data-legend-color")
                            : self.style("fill") != 'none' ? self.style("fill")
                                : self.style("stroke")
                      }
                    } else {
                      if (self.attr("data-legend") == metric
                          || self.attr("data-legend") == _self.config.lineChart.yAxis.right) {
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
          var ritem = items.find(function(element, index, array) {
            if (element.key == _self.config.lineChart.yAxis.right) {
              return element;
            } else {
              return false;
            }
          });
          if (ritem) {
            items2.push(ritem);
          }
          for (var i = 0; i < items.length; i++) {
            if (items[i].key != _self.config.lineChart.yAxis.right && items[i]) {
              items2.push(items[i]);
            }
          }
          items = items2;

          var toggle = function(metric, d, i) {
            _self.metric = d.key;
            if (metric == 'show') {
              if ('#FFFFFF' == _self.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"))) {
                if (_self.metric == _self.config.lineChart.yAxis.right
                    || _self.metric == 'state') {
                  d3.select(".line" + d.key).style("stroke", d.color).style(
                      "fill", d.color);
                } else {
                  d3.select(".line" + d.key).style("stroke", d.color);
                }
                d3.select("circle.y" + d.key).style("stroke", d.color);
                d3.select("line.y" + d.key).style("stroke", d.color);
              }
            } else if (metric == 'hide') {
              var pickColor = _self.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"));
              if (pickColor != '#FFFFFF') {
                d.color = pickColor;
                if (_self.metric == _self.config.lineChart.yAxis.right
                    || _self.metric == 'state') {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF').style(
                      "fill", "white");
                } else {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF');
                }
                d3.select("circle.y" + d.key).style("stroke", '#FFFFFF');
                d3.select("line.y" + d.key).style("stroke", '#FFFFFF');
              }
            }
            _self.redrawChart();
          }

          li.selectAll("text").data(items, function(d) {
            return d.key;
          }).call(function(d) {
            d.enter().append("text");
          }).call(function(d) {
            d.exit().remove();
          }).attr("y", function(d, i) {
            var y = _self.config.legend.y + 1.2;
            return y + "em";
          }).attr("x", function(d, i) {
            var x = i * _self.config.legend.x + 2;
            return x + "em";
          }).text(function(d, i) {
            return _self.getLabelFullName(d.key);
          }).on("click", function(d, i) {
            toggle('show', d, i);
          }).style("cursor", "pointer");

          li.selectAll("rect").data(items, function(d) {
            return d.key;
          }).call(function(d) {
            d.enter().append("rect");
          }).call(function(d) {
            d.exit().remove();
          }).attr("x", function(d, i) {
            var x = i * _self.config.legend.x;
            return x + "em";
          }).attr("y", function(d, i) {
            var y = _self.config.legend.y;
            return y + "em";
          }).attr("width", _self.config.legend.width).attr("height",
              _self.config.legend.height)
          // }).call(function(d) {
          // d.enter().append("circle");
          // }).call(function(d) {
          // d.exit().remove();
          // }).attr("cy", function(d, i) {
          // return "0em";
          // }).attr("cx", function(d, i) {
          // var col = i * _self.config.legend.x;
          // return col + "em";
          // }).attr("r", "0.8em")
          .style("fill", function(d) {
            return d.value.color;
          }).on("click", function(d, i) {
            toggle('hide', d, i);
          }).style("cursor", "pointer");

          var lbbox = li[0][0].getBBox();
          lb.attr("x", (lbbox.x - legendPadding)).attr("y",
              (lbbox.y - legendPadding)).attr("height",
              (lbbox.height + 2 * legendPadding)).attr("width",
              (lbbox.width + 2 * legendPadding));
        })
    return g;
  }

  // make mapData for lineChart from maxtrix, locs
  this.makeMapData = function(resultset, metric) {
    var data = resultset.data.metric;
    var locs = resultset.meta.locs;

    var mapData = new Array();
    for (var i = 0; i < locs.length; i++) {
      var loc = locs[i].loc;
      var row = {};
      row.loc = loc;
      row.latitude = locs[i].latitude;
      row.longitude = locs[i].longitude;
      for (var j = 0; j < data.length; j++) {
        if (data[j].target == loc + '.' + metric) {
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

  // make chartData for Chart
  this.makeChartData = function(resultset) {
    var max = 0;
    var locMetric = resultset.data.metric;
    var metric = resultset.data.avgMetric;
    var judge = resultset.data.judge;
    var active = resultset.data.active[0];
    var include = resultset.data.include[0];
    var metrices = resultset.meta.metrices;
    var locs = resultset.meta.locs;
    var chartData = new Array();

    for (var q = 0; q < metric[0].datapoints.length - 1; q++) {
      var avail = 0;
      var sum = 0;
      var jsonRow = {
        date : new Date(metric[0].datapoints[q][1] * 1000)
      };
      for (var i = 0; i < metric.length; i++) {
        var target = metric[i].target;
        if (!metric[i].description) {
          metric[i].description = new Array();
        }
        if (!metric[i].description[q]) {
          metric[i].description[q] = {};
        }
        if (active != null) {
          // availability = metric(#2) / (active(#1) + include(#3))
          var v1 = active.datapoints[q][0];
          var v2 = metric[i].datapoints[q][0] != null ? metric[i].datapoints[q][0]
              : 0;
          var v3 = include.datapoints[q][0];
          if (v1) {
            v1 = Number((v1).toFixed(1));
          }
          metric[i].description[q].v1 = v1;
          metric[i].description[q].v2 = v2;
          metric[i].description[q].v3 = v3;
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
    this.metric_data = metric;
    this.aggregate_max = max;

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

  // make data for makeHistogram
  this.makeHistogramData = function(json) {
    var data = new Array();
    if (_self.isBrushed()) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _self.brush.extent()[0]
            && json[i].date <= _self.brush.extent()[1]) {
          data.push(json[i]);
        }
      }
    } else {
      data = jQuery.extend(true, [], json);
    }
    if (data.length == 0) {
      data = jQuery.extend(true, [], json);
    }
    var data2 = new Array();
    var date = 0;
    var nsl_ms = 0;
    var con_ms = 0;
    var tfb_ms = 0;
    for (var i = 0; i < data.length; i++) {
      if (i % _self.config.histogram.group_size == 0 && i > 0) {
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

  this.tooltip2 = function(txt) {
    d3.select("body").select('div.tooltip2').remove();
    txt = '<div>' + txt.split("\n").join("</div>\n<div>") + '</div>';
    var html = '<div style="width: 250px;">' + txt + '</div>';
    var tooltip2 = d3.select("body").append("div").attr('pointer-events',
        'none').attr("class", "tooltip2").style("opacity", 1).html(html).style(
        "left", (d3.event.x + 10 + "px"))
        .style("top", (d3.event.y + 10 + "px"));
  }

  this.toUTCISOString = function(st) {
    st = new Date(Date.UTC(st.getFullYear(), st.getMonth(), st.getDate(), st
        .getHours(), st.getMinutes()));
    return st.toISOString();
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make lineChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeLineChart = function(chartElem, resultset, cb) {
  var _self = this;

  this.main_y = {};
  this.main_line = {};
  this.main, this.lineSvg;

  this.main_width = config.lineChart.main_margin.width
      - config.lineChart.main_margin.left - config.lineChart.main_margin.right
  this.main_height = config.lineChart.main_margin.height
      - config.lineChart.main_margin.top - config.lineChart.main_margin.bottom;

  this.main_x = d3.time.scale().range([ 0, this.main_width ]);

  this.mainChartElem = chartElem;
  var data = this.makeChartData(resultset);
  this.lineData = data;

  var metrices = {};
  for ( var key in data[0]) {
    if (key != _self.config.lineChart.yAxis.right) {
      metrices[key] = key;
    }
  }

  // "nsl_ms" : "DNS Time", // DNS Lookup
  // "con_ms" : "Connect Time", // Time To Connect
  // "tfb_ms" : "Wait Time", // Time To 1st Byte
  // "tot_ms" : "Response Time", // Roundtrip Time
  // "state" : "Service State",
  // "aggregate" : "Availability",
  // "judge" : "Up/Down"

  if (d3.selectAll('#lineSvg').length >= 1) {
    d3.selectAll('#lineSvg').remove();
  }
  this.lineSvg = d3.select(this.mainChartElem).append("svg").attr("id",
      'lineSvg').attr(
      "width",
      this.main_width + this.config.lineChart.main_margin.left
          + this.config.lineChart.main_margin.right).attr(
      "height",
      this.main_height + this.config.lineChart.main_margin.top
          + this.config.lineChart.main_margin.bottom);
  this.drawLineChart(data, _self.config.lineChart.combo.init);

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
      options[options.length] = new Option('Select', '*');
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

  this.makeCombo(metrices, this.config.lineChart.combo.id, function(val) {
    if ($('.views').val() == 'tot_ms') { // response time
      if ($('#gmetrices').val() !== 'tot_ms') {
        _self.metric = $('#gmetrices').val();
      } else {
        _self.metric = null;
      }
      _self.drawStackedChart(_self.makeStackedData(_self.lineData), function() {
        _self.drawHistogram(_self.makeHistogramData(_self.lineData));
      });
    } else { // aggregate
      $('.tot_ms_view').hide();
      $('.aggregate_view').show();
      if (val == '*') {
        data2 = _self.lineData;
      } else {
        var data2 = new Array();
        for (var i = 0; i < data.length; i++) {
          var tmp = {};
          for ( var key in data[i]) {
            if (key == 'date' || key == val
                || key == _self.config.lineChart.yAxis.right) {
              tmp[key] = data[i][key];
            }
          }
          data2[data2.length] = tmp;
        }
      }
      _self.lineChartInit();
      _self.drawLineChart(data2, val);
      _self.drawMiniLineChart(data, _self.config.lineChart.combo.init);
    }
  });

  cb.call(null, data);

  this.lineChartInit = function() {
    _self.main_y = {};
    _self.mini_y = {};
    _self.main_line = {};
    _self.mini_line = {};
    _self.main, _self.mini;
  }
}

UptimeChart.prototype.drawLineChart = function(data, metric) {
  var _self = this;
  if (d3.selectAll('#lineSvg').length >= 1) {
    d3.selectAll('#lineSvg').remove();
    this.lineSvg = d3.select(this.mainChartElem).append("svg").attr("id",
        'lineSvg').attr(
        "width",
        this.main_width + this.config.lineChart.main_margin.left
            + this.config.lineChart.main_margin.right).attr(
        "height",
        this.main_height + this.config.lineChart.main_margin.top
            + this.config.lineChart.main_margin.bottom);
  }

  this.lineSvg.append("defs").append("clipPath").attr("id", "clip").append(
      "rect").attr("width", this.main_width).attr("height", this.main_height);

  this.main = this.lineSvg.append("g").attr(
      "transform",
      "translate(" + this.config.lineChart.main_margin.left + ","
          + this.config.lineChart.main_margin.top + ")");

  this.main_xAxis = d3.svg.axis().scale(this.main_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");

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
    }
  }

  // /[ line definition ]///////////////////////////
  // I need to enumerate instead of above fancy way.
  if (metric != '*') {
    var type = 'cardinal';
    if (metric == 'state') {
      type = 'step';
    }
    this.main_line[metric] = d3.svg.line().interpolate(type).x(function(d) {
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
    this.main_line['state'] = d3.svg.line().interpolate("step").x(function(d) {
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

  for ( var key in this.main_y) {
    this.main_y[key].domain(d3.extent(data, function(d) {
      return d[key];
    }));
  }

  // /[ main lineChart ]///////////////////////////
  for ( var key in this.main_y) {
    this.main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
        "class", "line line" + key).attr("d", this.main_line[key]).attr(
        "data-legend", function(d) {
          return key;
        });
  }

  // /[ main left x ]///////////////////////////
  this.main.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + this.main_height + ")").call(_self.main_xAxis);
  // /[ main left y ]///////////////////////////
  var main_yAxisLeft;
  if (metric != '*') {
    main_yAxisLeft = d3.svg.axis().scale(this.main_y[metric]).orient("left");
  } else {
    main_yAxisLeft = d3.svg.axis().scale(
        this.main_y[this.config.lineChart.yAxis.left]).orient("left");
  }
  this.main.append("g").attr("class", "y axis axisLeft").call(main_yAxisLeft)
      .append("text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy",
          ".71em").style("text-anchor", "end").text("( ms )");

  // /[ main right y ]///////////////////////////
  var main_yAxisRight = d3.svg.axis().scale(
      this.main_y[this.config.lineChart.yAxis.right]).orient("right").ticks(1);
  this.main.append("g").attr("class", "y axis axisRight").attr("transform",
      "translate(" + this.main_width + ", 0)").call(main_yAxisRight).append(
      "text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em")
      .style("text-anchor", "end").text("( ms )");

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
    var metric = $('#' + _self.config.lineChart.combo.id).val();
    if (metric == '*')
      return;
    var x0 = _self.main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
    var d1 = data[i];
    if (d1.date) {
      var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
      for ( var key in _self.main_y) {
        if (key != metric)
          continue;
        if (key != _self.config.lineChart.yAxis.right
            && '#FFFFFF' != _self.convertRGBDecimalToHex(d3.select(
                ".line" + key).style("stroke"))) {
          focus.select("circle.y" + key).attr(
              "transform",
              "translate(" + _self.main_x(d.date) + ","
                  + _self.main_y[key](d[key]) + ")");
          if (key == 'aggregate') {
            var descript = '[availability] \n';
            var sum = 0;
            for (var i = 0; i < _self.metric_data.length; i++) {
              var type = _self.metric_data[i].target;
              var j = 0;
              for (j = 0; j < _self.metric_data[i].datapoints.length; j++) {
                if (new Date(_self.metric_data[i].datapoints[j][1] * 1000)
                    .toString() == d.date.toString()) {
                  break;
                }
              }
              if (j > 0) {
                // availability = metric(#2) / (active(#1) + include(#3))
                var active = _self.metric_data[i].description[j].v1;
                var metric = _self.metric_data[i].description[j].v2;
                var include = _self.metric_data[i].description[j].v3;
                var avail = Math.floor((metric / (active + include)));
                if (isNaN(avail) || avail == Number.POSITIVE_INFINITY) {
                  avail = 0;
                }
                sum += avail;
                descript += ' - ' + type + ' : ' + avail + ' = ' + metric
                    + ' / (' + active + ' + ' + include + ') \n';
              }
            }
            var uptime_per = sum / _self.aggregate_max * 100;
            if (uptime_per) {
              uptime_per = Number((uptime_per).toFixed(1));
            } else {
              uptime_per = 0;
            }
            descript += ' - availability sum: ' + sum + ' \n';
            descript += ' - availability max: ' + _self.aggregate_max + ' \n';
            descript = '[' + _self.formatDate(d.date) + '`s aggregate]: '
                + uptime_per + '\n = ' + sum + ' / ' + _self.aggregate_max
                + ' * 100 /d[key]: ' + d[key] + '\n' + descript;
            _self.tooltip2(descript);
          }
          var formatOutput = _self.getLabelFullName(key) + " - "
              + formatDate2(d.date) + " - " + d[key] + " ms";
          focus.select("text.y" + key).attr(
              "transform",
              "translate(" + _self.main_x(d.date) + ","
                  + _self.main_y[key](d[key]) + ")").text(formatOutput);
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
        d3.select("body").select('div.tooltip2').remove();
      }).on("mouseout", function() {
    focus.style("display", "none");
    d3.select("body").select('div.tooltip2').remove();
  }).on("mousemove", mousemove);

  // /[ legend ]///////////////////////////
  var legend = this.main.append("g").attr("class", "legend").attr("transform",
      "translate(40, " + this.config.legend.y + ")").call(this.makeLegend,
      _self.mainChartElem, metric);
}

UptimeChart.prototype.makeMiniLineChart = function(chartElem, resultset, cb) {
  var _self = this;

  this.mini_y = {};
  this.mini_line = {};
  this.mini;

  this.mini_height = config.lineChart.mini_margin.height
      - config.lineChart.mini_margin.top - config.lineChart.mini_margin.bottom;
  this.mini_x = d3.time.scale().range([ 0, this.main_width ]);

  this.miniChartElem = chartElem;
  var data = this.makeChartData(resultset);
  this.lineData = data;

  var metrices = {};
  for ( var key in data[0]) {
    if (key != _self.config.lineChart.yAxis.right) {
      metrices[key] = key;
    }
  }

  this.drawMiniLineChart(data, _self.config.lineChart.combo.init);

  cb.call(null, data);

  this.lineChartInit = function() {
    _self.main_y = {};
    _self.mini_y = {};
    _self.main_line = {};
    _self.mini_line = {};
    _self.main, _self.mini;
  }

  this.isBrushed = function() {
    if (_self.main_x.domain().toString() != _self.mini_x.domain().toString()) {
      return true;
    } else {
      return false;
    }
  }
}

UptimeChart.prototype.drawMiniLineChart = function(data, metric) {
  var _self = this;
  d3.select("[id='" + this.miniChartElem + "']").remove();
  this.MLSvg = d3.select(this.miniChartElem).append("svg").attr("id",
      this.miniChartElem).attr(
      "width",
      this.main_width + this.config.lineChart.mini_margin.left
          + this.config.lineChart.mini_margin.right).attr(
      "height",
      this.config.lineChart.mini_margin.top
          + this.config.lineChart.mini_margin.bottom + this.mini_height).style(
      "background-color", '#FE9A2E');

  this.MLSvg.append("defs").append("clipPath").attr("id", "clip")
      .append("rect").attr("width", this.main_width).attr("height",
          this.mini_height);

  this.mini = this.MLSvg.append("g").attr(
      "transform",
      "translate(" + this.config.lineChart.mini_margin.left + ","
          + this.config.lineChart.mini_margin.top + ")");

  var mini_xAxis = d3.svg.axis().scale(this.mini_x).tickFormat(
      d3.time.format("%H:%M")).orient("bottom");

  var brush2 = function() {
    _self.main_x.domain(_self.brush.empty() ? _self.mini_x.domain()
        : _self.brush.extent());
    for ( var key in _self.main_y) {
      _self.main.select(".line" + key).attr("d", _self.main_line[key]);
    }
    _self.main.select(".x.axis").call(_self.main_xAxis);
  }

  var brushstart = function() {
  }

  var brushend = function() {
    _self.redrawChart();
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
      this.mini_y[key] = d3.scale.sqrt().range([ this.mini_height, 0 ]);
    }
  }

  // /[ line definition ]///////////////////////////
  if (metric == '*') {
    for ( var key in this.main_y) {
      if (this.config.lineChart.yAxis.right != key) {
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
    var type = 'cardinal';
    if (metric == 'state') {
      type = 'step';
    }
    this.mini_line[metric] = d3.svg.line().interpolate(type).x(function(d) {
      return _self.mini_x(d.date);
    }).y(function(d) {
      return _self.mini_y[metric](d[metric]);
    });
  }
  this.mini_line[this.config.lineChart.yAxis.right] = d3.svg.line()
      .interpolate('step').x(function(d) {
        return _self.mini_x(d.date);
      }).y(
          function(d) {
            return _self.mini_y[_self.config.lineChart.yAxis.right]
                (d[_self.config.lineChart.yAxis.right]);
          });

  this.mini_x.domain(this.main_x.domain());

  for ( var key in this.main_y) {
    this.mini_y[key].domain(this.main_y[key].domain());
  }

  // /[ this.mini lineChart ]///////////////////////////
  this.mini.append("g").attr("class", "x axis").attr("transform",
      "translate(0," + this.mini_height + ")").call(_self.main_xAxis);
  for ( var key in this.main_y) {
    this.mini.append("path").datum(data).attr("class", "line line" + key).attr(
        "d", this.mini_line[key]);
  }

  this.mini.append("g").attr("class", "x brush").call(this.brush).selectAll(
      "rect").attr("y", -6).attr("height", this.mini_height + 7);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeMap = function(mapElem, resultset, locs) {
  var _self = this;

  this.states;
  this.circles;
  this.labels;
  this.circle_scale = config.map.circle_scale;
  this.mapElem = mapElem;

  var data = resultset.data.metric;
  var locs = resultset.meta.locs;
  this.mapData = this.makeMapData(resultset, 'state');

  this.makeMapCombo(locs, this.config.map.combo.id, function(val) {
    if (val == '*') {
      data2 = _self.mapData;
    } else {
      var metric = $('#' + _self.config.lineChart.combo.id).val();
      var data = _self.makeMapData(resultset, metric);
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    _self.lineChartInit();
    _self.drawMap(data2, val);
  });

  this.getCircleSize = function(d, loc) {
    var size = Math.round(this.getCircleTotal(d, loc));
    for ( var key in config.map.circle) {
      var val = config.map.circle[key];
      if (size < val) {
        var s = val * this.circle_scale;
        if (s < 5) {
          s = 10;
        }
        return s;
      }
    }
    return 50;
  }

  this.getCircleColor = function(d, loc) {
    var size = Math.round(this.getCircleTotal(d, loc));
    for ( var key in config.map.circle) {
      var val = config.map.circle[key];
      if (size < val) {
        return key;
      }
    }
    return "#dc291e";
  }

  this.getCircleTotal = function(d, loc) {
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

  this.drawMap(this.mapData, _self.config.map.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw map ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawMap = function(data, loc) {
  var _self = this;
  d3.select("[id='" + this.mapElem + "']").remove();
  this.mapSvg = d3.select(this.mapElem).append("svg").attr('id', this.mapElem)
      .attr("width", this.config.map.width).attr("height",
          this.config.map.height);
  this.states = this.mapSvg.append("g").attr("id", "states");
  this.circles = this.mapSvg.append("g").attr("id", "circles");
  this.labels = this.mapSvg.append("g").attr("id", "labels");
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

  this.circles.selectAll("circle").data(data).enter().append("circle").style(
      "stroke", "black").attr("cx", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[0];
  }).attr("cy", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("r", function(d) {
    return _self.getCircleSize(d);
  }).on(
      "mouseover",
      function(d, i) {
        d3.select(this).style("fill", "#FC0");
        var html = '<div style="width: 250px;">';
        html += '<div>* Site: ' + d["loc"];
        html += '</div>';
        html += '<div>* Total: ' + Math.round(_self.getCircleTotal(d))
            + ' (ms)</div>';
        html += '</div>';
        var div = d3.select("body").append("div")
            .attr('pointer-events', 'none').attr("class", "tooltip").style(
                "opacity", 1).html(html).style("left",
                (d3.event.x + _self.config.map.tooltip.x + "px")).style("top",
                (d3.event.y + _self.config.map.tooltip.y + "px"));
      }).on("mouseout", function(d) {
    d3.select(this).style("fill", _self.getCircleColor(d));
    d3.select("body").select('div.tooltip').remove();
  }).style("fill", function(d) {
    return _self.getCircleColor(d);
  });

  this.labels.selectAll("labels").data(data).enter().append("text").attr("x",
      function(d, i) {
        return xy([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("y", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("dy", "0.3em").attr("text-anchor", "middle").text(function(d, i) {
    return Math.round(_self.getCircleTotal(d));
  }).attr("d", path)
}

// ///////////////////////////////////////////////////////////////////////////////
// [ gmap chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeGMap = function(gmapElem, data) {
  var _self = this;
  this.gmapData = data;
  _self.gmapElem = gmapElem;

  var locs = {};
  for (var i = 0; i < data.length; i++) {
    locs[data[i].loc] = data[i].loc;
  }

  this.makeCombo(locs, this.config.gmap.combo.id, function(val) {
    if (val == '*') {
      data2 = _self.gmapData;
    } else {
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    _self.lineChartInit();
    _self.drawGMap(data2, val);
  });

  _self.drawGMap(data, _self.config.gmap.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw gmap ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawGMap = function(data, loc) {
  var _self = this;

  var map = new google.maps.Map(d3.select(_self.gmapElem).node(), {
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
    d3.select("[id='" + _self.gmapElem + "']").remove();
    var layer = d3.select(this.getPanes().overlayLayer).append("div").attr(
        'id', _self.gmapElem).attr("class", "stations");

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
// [ redrawChart with brushing ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.redrawChart = function() {
  var _self = this;
  var json = [];

  var startTime = _self.toUTCISOString(_self.brush.extent()[0]);
  var endTime = _self.toUTCISOString(_self.brush.extent()[1]);

  if (_self.isBrushed()) {
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
    json = jQuery.extend(true, [], this.mapData);
  }

  if ($('.views').val() == 'tot_ms') { // response time
    _self.drawStackedChart(_self.makeStackedData(_self.lineData), function() {
      _self.drawHistogram(_self.makeHistogramData(_self.lineData));
      if (_self.metric) {
        $('#gmetrices').val(_self.metric);
      }
    });
  }

  // map
  if (_self.metric) {
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
        return _self.getCircleSize(json, d.loc);
      }).attr("title", function(d) {
        return d["loc"] + ": " + Math.round(_self.getCircleTotal(json, d.loc));
      });

  this.circles.selectAll("circle").style("fill", function(d) {
    return _self.getCircleColor(json, d.loc);
  });

  this.labels.selectAll("text").text(function(d) {
    return Math.round(_self.getCircleTotal(json, d.loc));
  });
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make Histogram ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeHistogram = function(id) {
  var _self = this;

  var barColor = 'steelblue';
  function segColor(c) {
    return {
      nsl_ms : "#81bc00",
      con_ms : "#7e7f74",
      tfb_ms : "#ffa400"
    }[c];
  }

  _self.histogram = function(fD) {
    var hg = {};
    var width = _self.config.histogram.margin.width
        - _self.config.histogram.margin.left
        - _self.config.histogram.margin.right;
    var height = _self.config.histogram.margin.height;
    var ratio = _self.config.histogram.ratio;

    // d3.select("[id='hgsvg']").remove();
    // var hgsvg = _self.hgsvg.append("svg").attr("id", 'hgsvg').attr(
    // "width",
    // width + config.stackedChart.margin.left
    // + config.stackedChart.margin.right).attr(
    // "height",
    // height + config.stackedChart.margin.top
    // + config.stackedChart.margin.bottom).append("g").attr(
    // "transform",
    // "translate(" + config.stackedChart.margin.left + ","
    // + config.stackedChart.margin.top + ")");

    var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], 0.1).domain(
        fD.map(function(d) {
          return d[0];
        }));

    _self.hgsvg.append("g").attr("class", "x axis").attr("transform",
        "translate(0," + height + ")").call(
        d3.svg.axis().scale(x).tickFormat(d3.time.format("%H:%M")).orient(
            "bottom"));

    // _self.hgsvg.append("text").attr("x", 60).attr("y", 0 - (hgDim.top /
    // 2)).attr(
    // "text-anchor", "middle").style("text-decoration", "underline").text(
    // "Average Response Time");

    var y = d3.scale.linear().range([ height, 0 ]).domain(
        [ 0, d3.max(fD, function(d) {
          return d[1];
        }) ]);

    var bars = _self.hgsvg.selectAll(".bar").data(fD).enter().append("g").attr(
        "class", "bar");
    bars.append("rect").style("opacity", 0.4).attr("x", function(d) {
      return x(d[0]);
    }).attr("y", function(d) {
      return y(d[1] * ratio);
    }).attr("width", x.rangeBand()).attr("height", function(d) {
      return height - y(d[1] * ratio);
    }).attr('fill', barColor).style("cursor", "pointer").on("mouseover",
        mouseover).on("mouseout", mouseout);

    bars.append("text").text(function(d) {
      return d3.format(",")(d[1])
    }).attr("x", function(d) {
      return x(d[0]) + x.rangeBand() / 2;
    }).attr("y", function(d) {
      return y(d[1] * ratio) + 15;
    }).attr("text-anchor", "middle").style('fill', 'white');

    function mouseover(d) {
      var st = _self.fData.filter(function(s) {
        return s.date == d[0];
      })[0];
      var nd = d3.keys(st).map(function(s) {
        return {
          metric : s,
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

      var bars = _self.hgsvg.selectAll(".bar").data(nd);
      bars.select("rect").style("opacity", 0.6).transition().duration(500)
          .attr("y", function(d) {
            return y(d[1] * ratio);
          }).attr("height", function(d) {
            return height - y(d[1] * ratio);
          }).attr("fill", color);

      bars.select("text").transition().duration(500).text(function(d) {
        return d3.format(",")(d[1])
      }).attr("y", function(d) {
        return y(d[1] * ratio) + 15;
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
    var piesvg = d3.select(id).append("span").attr('class', 'flt')
        .append("svg").attr('id', 'piesvg').attr("width", pieDim.width).attr(
            "height", pieDim.height).append("g").attr("transform",
            "translate(120,60)");
    var arc = d3.svg.arc().outerRadius(pieDim.right - 10).innerRadius(0);
    var pie = d3.layout.pie().sort(null).value(function(d) {
      return d.freq;
    });

    piesvg.selectAll("path").data(pie(pD)).enter().append("path")
        .attr("d", arc).each(function(d) {
          this._current = d;
        }).style("stroke", function(d) {
          return segColor(d.data.metric);
        }).style("opacity", 0.6).style("fill", function(d) {
          return segColor(d.data.metric);
        }).on("mouseover", mouseover).on("mouseout", mouseout);

    pc.update = function(nd) {
      piesvg.selectAll("path").data(pie(nd)).transition().duration(500)
          .attrTween("d", arcTween);
    }
    function mouseover(d) {
      _self.hg.update(_self.fData.map(function(v) {
        return [ v.date, v[d.data.metric] ];
      }), segColor(d.data.metric));
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
    var legend2 = d3.select(id).append("span").attr('class', 'frt').attr('id',
        'tr').append("table").attr('class', 'legend2');
    var tr = legend2.append("tbody").selectAll("tr").data(lD).enter().append(
        "tr");
    tr.append("td").append("svg").attr("width", '16').attr("height", '16')
        .append("rect").attr("width", '16').attr("height", '16').style(
            "opacity", 0.6).attr("fill", function(d) {
          return segColor(d.metric);
        });
    tr.append("td").attr("class", 'legend2Name').text(function(d) {
      return _self.getLabelFullName(d.metric) + ":";
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
      var val = (d.freq / d3.sum(aD.map(function(v) {
        return v.freq;
      })));
      if (isNaN(val)) {
        return d3.format("%")(0);
      } else {
        return d3.format("%")(val);
      }
    }
    return lg;
  }

  this.drawHistogram(this.makeHistogramData(this.lineData));
}

UptimeChart.prototype.drawHistogram = function(data) {
  var _self = this;
  // d3.select("[id='hgsvg']").remove();

  d3.select("[id='piesvg']").remove();
  d3.select("[id='tr']").remove();
  d3.selectAll("span").remove();

  _self.fData = data;
  _self.fData.forEach(function(d) {
    d.tot_ms = d.nsl_ms + d.con_ms + d.tfb_ms;
  });

  _self.tf = [ 'nsl_ms', 'con_ms', 'tfb_ms' ].map(function(d) {
    return {
      metric : d,
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

// ///////////////////////////////////////////////////////////////////////////////
// [ make StackedChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeStackedChart = function(id, data, cb) {
  var _self = this;
  this.stackedChartElem = id;

  var width = config.stackedChart.margin.width
      - config.stackedChart.margin.left - config.stackedChart.margin.right
  var height = config.stackedChart.margin.height
      - config.stackedChart.margin.top - config.stackedChart.margin.bottom;

  var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], .1);
  var y = d3.scale.linear().rangeRound([ height, 0 ]);
  _self.stackedColor = d3.scale.ordinal().range(
      [ "#81bc00", "#7e7f74", "#ffa400" ]);

  data = this.makeStackedData(data);
  this.drawStackedChart(data, function() {
    cb.call();
  });
}

UptimeChart.prototype.drawStackedChart = function(data, cb) {
  var _self = this;

  var width = config.stackedChart.margin.width
      - config.stackedChart.margin.left - config.stackedChart.margin.right
  var height = config.stackedChart.margin.height
      - config.stackedChart.margin.top - config.stackedChart.margin.bottom;

  var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], .1);
  var y = d3.scale.linear().rangeRound([ height, 0 ]);

  // var xAxis = d3.svg.axis().scale(x).tickFormat(d3.time.format("%H:%M"))
  // .orient("bottom");
  var yAxis = d3.svg.axis().scale(y).orient("left")
      .tickFormat(d3.format(".2s"));

  d3.select("[id='" + this.stackedChartElem + "']").remove();
  var stSvg = d3.select(this.stackedChartElem).append("svg").attr("id",
      this.stackedChartElem).attr(
      "width",
      width + config.stackedChart.margin.left
          + config.stackedChart.margin.right).attr(
      "height",
      height + config.stackedChart.margin.top
          + config.stackedChart.margin.bottom).append("g").attr(
      "transform",
      "translate(" + config.stackedChart.margin.left + ","
          + config.stackedChart.margin.top + ")");

  _self.stackedColor.domain(d3.keys(data[0]).filter(function(key) {
    return key !== "date";
  }));
  data.forEach(function(d) {
    var y0 = 0;
    d.metrics = _self.stackedColor.domain().map(function(key) {
      return {
        key : key,
        y0 : y0,
        y1 : y0 += +d[key]
      };
    });
    d.total = d.metrics[d.metrics.length - 1].y1;
  });

  x.domain(data.map(function(d) {
    return d.date;
  }));
  y.domain([ 0, d3.max(data, function(d) {
    return d.total;
  }) ]);

  // stSvg.append("g").attr("class", "x axis").attr("transform",
  // "translate(0," + height + ")").call(xAxis);

  stSvg.append("g").attr("class", "y axis").call(yAxis).append("text").attr(
      "transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em").style(
      "text-anchor", "end").text("(ms)");

  var date = stSvg.selectAll(".date").data(data).enter().append("g").attr(
      "class", "g").attr("transform", function(d) {
    return "translate(" + x(d.date) + ",0)";
  });

  date.selectAll("rect").data(function(d) {
    return d.metrics;
  }).enter().append("rect").attr("width", x.rangeBand()).attr("y", function(d) {
    return y(d.y1);
  }).attr("data-legend", function(d) {
    return d.key;
  }).attr("height", function(d) {
    return y(d.y0) - y(d.y1);
  }).style("fill", function(d) {
    return _self.stackedColor(d.key);
  });

  // /[ legend ]///////////////////////////
  var legend = stSvg.append("g").attr("class", "legend").attr("transform",
      "translate(40, " + this.config.legend.y + ")").call(this.makeLegend,
      _self.stackedChartElem, "*");

  _self.hgsvg = stSvg;
  cb.call(null);
}

UptimeChart.prototype.makeStackedData = function(json) {
  var _self = this;
  var data = new Array();

  if (_self.isBrushed()) {
    for (var i = 0; i < json.length; i++) {
      if (json[i].date >= _self.brush.extent()[0]
          && json[i].date <= _self.brush.extent()[1]) {
        data.push(json[i]);
      }
    }
  } else {
    data = jQuery.extend(true, [], json);
  }
  if (data.length == 0) {
    data = jQuery.extend(true, [], json);
  }
  var input = new Array();
  data.forEach(function(d) {
    var tmp = {};
    tmp.date = d.date;
    if (_self.metric) {
      tmp[_self.metric] = d[_self.metric];
    } else {
      tmp.nsl_ms = d.nsl_ms;
      tmp.con_ms = d.con_ms;
      tmp.tfb_ms = d.tfb_ms;
    }
    input.push(tmp);
  });

  input.forEach(function(d) {
    d.date = +d.date;
    if (_self.metric) {
      d[_self.metric] = +d[_self.metric];
    } else {
      d.nsl_ms = +d.nsl_ms;
      d.con_ms = +d.con_ms;
      d.tfb_ms = +d.tfb_ms;
    }
  });

  data = new Array();
  input.forEach(function(d) {
    var tmp = {};
    tmp.date = new Date(d.date * 1000);
    if (_self.metric) {
      tmp[_self.metric] = d[_self.metric];
    } else {
      tmp.nsl_ms = d.nsl_ms;
      tmp.con_ms = d.con_ms;
      tmp.tfb_ms = d.tfb_ms;
    }
    data.push(tmp);
  });
  return data;
}

// //////////////////////////////////////////////////////////////////////////////
// / [configuration]
// //////////////////////////////////////////////////////////////////////////////
var config = {
  "lineChart" : {
    "main_margin" : {
      "width" : 950,
      "height" : 250,
      "top" : 50,
      "bottom" : 20,
      "right" : 40,
      "left" : 40
    },
    "mini_margin" : {
      "width" : 950,
      "height" : 40,
      "top" : 0,
      "bottom" : 20,
      "right" : 40,
      "left" : 40
    },
    "yAxis" : {
      "left" : "tot_ms",
      "right" : "judge"
    },
    "combo" : {
      "id" : "gmetrices",
      "init" : "aggregate"
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
    "ratio" : 0.5,
    "group_size" : 5
  },
  "stackedChart" : {
    "margin" : {
      "width" : 950,
      "height" : 250,
      "top" : 50,
      "bottom" : 25,
      "right" : 40,
      "left" : 40
    }
  },
  "map" : {
    "height" : 400,
    "width" : 950,
    "circle_scale" : 0.2,
    "circle" : {
      "#81bc00" : 20,
      "#236093" : 100,
      "#dc291e" : 200
    },
    "scale" : 150,
    "tooltip" : {
      "x" : 20,
      "y" : 260
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
    "x" : 10,
    "y" : -3,
    "width" : 18,
    "height" : 18
  },
  "mapping" : {
    "nsl_ms" : "DNS Time", // DNS Lookup #81bc00
    "con_ms" : "Connect Time", // Time To Connect #7e7f74
    "tfb_ms" : "Wait Time", // Time To 1st Byte #ffa400
    "tot_ms" : "Response Time", // Roundtrip Time #7D602B
    "state" : "Service State",
    "aggregate" : "Aggregation",
    "judge" : "Up/Down"
  }
}

// ///////////////////////////////////////////////////////////////////////////////
function selectView() {
  d3.json("data.json", function(error, json) {
    var uptimeChart = new UptimeChart(config);
    uptimeChart.makeLineChart("#lineChart", json, function(data) {
      if ($('.views').val() == 'tot_ms') { // response time
        $('.tot_ms_view').show();
        $('.aggregate_view').hide();
        $("#gmetrices").find('option').each(
            function(i, opt) {
              if (opt.value == '*' || opt.value == 'aggregate'
                  || opt.value == 'state') {
                $(opt).hide();
              }
              if (opt.value == 'nsl_ms' || opt.value == 'con_ms'
                  || opt.value == 'tfb_ms' || opt.value == 'tot_ms') {
                $(opt).show();
              }
            });
        $('#gmetrices').val("tot_ms");
        uptimeChart.makeMiniLineChart("#minilineChart", json, function(data) {
        });
        uptimeChart.makeStackedChart('#stackedChart', data, function(svg) {
          uptimeChart.makeHistogram('#histogram', svg);
        });
      } else { // aggregate
        $('.tot_ms_view').hide();
        $('.aggregate_view').show();
        $("#gmetrices").find('option').each(
            function(i, opt) {
              if (opt.value == '*' || opt.value == 'aggregate'
                  || opt.value == 'state') {
                $(opt).show();
              }
              // if (opt.value == 'nsl_ms' || opt.value == 'con_ms' || opt.value
              // == 'tfb_ms' || opt.value == 'tot_ms') {
              // $(opt).hide();
              // }
            });
        $('#gmetrices').val("aggregate");
        uptimeChart.makeMiniLineChart("#minilineChart2", json, function(data) {
        });
      }
    });
    uptimeChart.makeMap("#graph", json);
    // d3.json("map.json", function(json) {
    // $('#googleMap').width(config.gmap.width).height(config.gmap.height);
    // uptimeChart.makeGMap("#googleMap", json);
    // });
  });
}

selectView();
