// ///////////////////////////////////////////////////////////////////////////////
// [ UptimeChart constructor ]
// ///////////////////////////////////////////////////////////////////////////////
var UptimeChart = function(config) {
  var _super = this;
  _super.config = config;

  _super.formatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  _super.parseDate = _super.formatDate.parse;

  // /////////////////////////////////////////////////////////////////////////////
  // [ redrawChart with brushing ]
  // ///////////////////////////////////////////////////////////////////////////////
  _super.redrawChart = function() {
    var json = [];

    var startTime = _super.toUTCISOString(_super.mc.brush.extent()[0]);
    var endTime = _super.toUTCISOString(_super.mc.brush.extent()[1]);

    if (_super.mc.isBrushed()) {
      for (var i = 0; i < _super.mapData.length; i++) {
        var obj = {};
        for ( var key in _super.mapData[i]) {
          if (key == 'loc' || key == 'latitude' || key == 'longitude') {
            obj[key] = _super.mapData[i][key];
          } else {
            if (new Date(key) >= new Date(startTime)
                && new Date(key) <= new Date(endTime)) {
              obj[key] = _super.mapData[i][key];
            }
          }
        }
        json.push(obj);
      }
    } else {
      json = jQuery.extend(true, [], _super.mapData);
    }

    if ($('.views').val() == 'tot_ms') { // response time
      _super.sc.drawStackedChart(_super.sc.makeStackedData(_super.lineData),
          function() {
            _super.drawHistogram(_super.makeHistogramData(_super.lineData));
            if (_super.metric) {
              $('#gmetrices').val(_super.metric);
            }
          });
    }

    // map
    if (_super.metric) {
      for (var i = 0; i < _super.mapData.length; i++) {
        var obj = {};
        for ( var key in _super.mapData[i]) {
          if (key == 'loc' || key == 'latitude' || key == 'longitude') {
            obj[key] = _super.mapData[i][key];
          } else {
            if (new Date(key) >= new Date(startTime)
                && new Date(key) <= new Date(endTime)) {
              obj[key] = _super.mapData[i][key];
            }
          }
        }
        json.push(obj);
      }
    }

    _super.circles.selectAll("circle").transition().duration(1000).ease(
        "linear").attr("r", function(d) {
      return _super.getCircleSize(json, d.loc);
    }).attr("title", function(d) {
      return d["loc"] + ": " + Math.round(_super.getCircleTotal(json, d.loc));
    });

    _super.circles.selectAll("circle").style("fill", function(d) {
      return _super.getCircleColor(json, d.loc);
    });

    _super.labels.selectAll("text").text(function(d) {
      return Math.round(_super.getCircleTotal(json, d.loc));
    });
  }

  _super.convertRGBDecimalToHex = function(rgb) {
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

  _super.getLabelFullName = function(akey) {
    var mapping = _super.config.mapping;
    for ( var key in mapping) {
      if (key == akey) {
        return mapping[key];
      }
    }
    return akey;
  }

  _super.makeMapCombo = function(ds, id, cb) {
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
        options[options.length] = new Option(_super.getLabelFullName(obj.loc),
            obj.loc);
      });
      select.change(function(e) {
        cb.call(e, $(id).val());
      });
    }
  }

  _super.makeLegend = function(g, id, metric) {
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
                          || self.attr("data-legend") == _super.config.lineChart.yAxis.right) {
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
            if (element.key == _super.config.lineChart.yAxis.right) {
              return element;
            } else {
              return false;
            }
          });
          if (ritem) {
            items2.push(ritem);
          }
          for (var i = 0; i < items.length; i++) {
            if (items[i].key != _super.config.lineChart.yAxis.right && items[i]) {
              items2.push(items[i]);
            }
          }
          items = items2;

          var toggle = function(metric, d, i) {
            _super.metric = d.key;
            if (metric == 'show') {
              if ('#FFFFFF' == _super.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"))) {
                if (_super.metric == _super.config.lineChart.yAxis.right
                    || _super.metric == 'state') {
                  d3.select(".line" + d.key).style("stroke", d.color).style(
                      "fill", d.color);
                } else {
                  d3.select(".line" + d.key).style("stroke", d.color);
                }
                d3.select("circle.y" + d.key).style("stroke", d.color);
                d3.select("line.y" + d.key).style("stroke", d.color);
              }
            } else if (metric == 'hide') {
              var pickColor = _super.convertRGBDecimalToHex(d3.select(
                  ".line" + d.key).style("stroke"));
              if (pickColor != '#FFFFFF') {
                d.color = pickColor;
                if (_super.metric == _super.config.lineChart.yAxis.right
                    || _super.metric == 'state') {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF').style(
                      "fill", "white");
                } else {
                  d3.select(".line" + d.key).style("stroke", '#FFFFFF');
                }
                d3.select("circle.y" + d.key).style("stroke", '#FFFFFF');
                d3.select("line.y" + d.key).style("stroke", '#FFFFFF');
              }
            }
            _super.redrawChart();
          }

          li.selectAll("text").data(items, function(d) {
            return d.key;
          }).call(function(d) {
            d.enter().append("text").attr("fill", "#585956");
          }).call(function(d) {
            d.exit().remove();
          }).attr("y", function(d, i) {
            var y = _super.config.legend.y + 1.2;
            return y + "em";
          }).attr("x", function(d, i) {
            var x = i * _super.config.legend.x + 2;
            return x + "em";
          }).text(function(d, i) {
            return _super.getLabelFullName(d.key);
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
            var x = i * _super.config.legend.x;
            return x + "em";
          }).attr("y", function(d, i) {
            var y = _super.config.legend.y;
            return y + "em";
          }).attr("width", _super.config.legend.width).attr("height",
              _super.config.legend.height)
          // }).call(function(d) {
          // d.enter().append("circle");
          // }).call(function(d) {
          // d.exit().remove();
          // }).attr("cy", function(d, i) {
          // return "0em";
          // }).attr("cx", function(d, i) {
          // var col = i * _super.config.legend.x;
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
  _super.makeMapData = function(resultset, metric) {
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
            var t = _super.toUTCISOString(dt);
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
  _super.makeChartData = function(resultset) {
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
    _super.metric_data = metric;
    _super.aggregate_max = max;

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
  _super.makeHistogramData = function(json) {
    var data = new Array();
    if (_super.mc.isBrushed()) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _super.mc.brush.extent()[0]
            && json[i].date <= _super.mc.brush.extent()[1]) {
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
      if (i % _super.config.histogram.group_size == 0 && i > 0) {
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

  _super.tooltip2 = function(txt) {
    d3.select("body").select('div.tooltip2').remove();
    txt = '<div>' + txt.split("\n").join("</div>\n<div>") + '</div>';
    var html = '<div style="width: 250px;">' + txt + '</div>';
    var tooltip2 = d3.select("body").append("div").attr('pointer-events',
        'none').attr("class", "tooltip2").style("opacity", 1).html(html).style(
        "left", (d3.event.x + 10 + "px"))
        .style("top", (d3.event.y + 10 + "px"));
  }

  _super.toUTCISOString = function(st) {
    st = new Date(Date.UTC(st.getFullYear(), st.getMonth(), st.getDate(), st
        .getHours(), st.getMinutes()));
    return st.toISOString();
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make lineChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.lineChart = function(chartElem, resultset, cb) {
  var _super = this;
  var lc = {};

  lc.main_y = {};
  lc.main_line = {};
  lc.main;

  lc.main_width = config.lineChart.main_margin.width
      - config.lineChart.main_margin.left - config.lineChart.main_margin.right
  lc.main_height = config.lineChart.main_margin.height
      - config.lineChart.main_margin.top - config.lineChart.main_margin.bottom;

  lc.main_x = d3.time.scale().range([ 0, lc.main_width ]);

  lc.mainChartElem = chartElem;
  _super.lineData = _super.makeChartData(resultset);

  var metrices = {};
  for ( var key in _super.lineData[0]) {
    if (key != _super.config.lineChart.yAxis.right) {
      metrices[key] = key;
    }
  }

  lc.makeCombo = function(ds, id, cb) {
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
        if (key != 'date') {
          options[options.length] = new Option(_super.getLabelFullName(key),
              key);
        }
      });
      select.change(function(e) {
        cb.call(e, $(id).val());
      });
    }
  }

  lc.makeCombo(metrices, _super.config.lineChart.combo.id, function(val) {
    if ($('.views').val() == 'tot_ms') { // response time
      if ($('#gmetrices').val() == 'tot_ms') {
        _super.metric = null;
      } else {
        _super.metric = $('#gmetrices').val();
      }
      _super.sc.drawStackedChart(_super.sc.makeStackedData(_super.lineData),
          function() {
            _super.makeHistogram('#histogram', _super
                .makeHistogramData(_super.lineData));
          });
    } else { // aggregate
      lc.metric = $('#gmetrices').val();
      $('.tot_ms_view').hide();
      $('.aggregate_view').show();
      if (val == '*') {
        data2 = _super.lineData;
      } else {
        var data2 = new Array();
        for (var i = 0; i < _super.lineData.length; i++) {
          var tmp = {};
          for ( var key in _super.lineData[i]) {
            if (key == 'date' || key == val
                || key == _super.config.lineChart.yAxis.right) {
              tmp[key] = _super.lineData[i][key];
            }
          }
          data2[data2.length] = tmp;
        }
      }
      lc.lineChartInit();
      lc.drawLineChart(data2, val);
      _super.mc.drawMiniLineChart(_super.lineData,
          _super.config.lineChart.combo.init);
    }
  });

  lc.lineChartInit = function() {
    lc.main_y = {};
    lc.mini_y = {};
    lc.main_line = {};
    lc.mini_line = {};
    lc.main, lc.mini;
  }

  lc.drawLineChart = function(data, metric) {
    if (d3.selectAll('#lineSvg').length >= 1) {
      d3.selectAll('#lineSvg').remove();
      lc.lineSvg = d3.select(lc.mainChartElem).append("svg").attr("id",
          'lineSvg').attr(
          "width",
          lc.main_width + _super.config.lineChart.main_margin.left
              + _super.config.lineChart.main_margin.right).attr(
          "height",
          lc.main_height + _super.config.lineChart.main_margin.top
              + _super.config.lineChart.main_margin.bottom);
    }

    lc.lineSvg.append("defs").append("clipPath").attr("id", "clip").append(
        "rect").attr("width", lc.main_width).attr("height", lc.main_height);

    lc.main = lc.lineSvg.append("g").attr(
        "transform",
        "translate(" + _super.config.lineChart.main_margin.left + ","
            + _super.config.lineChart.main_margin.top + ")");

    lc.main_xAxis = d3.svg.axis().scale(lc.main_x).tickFormat(
        d3.time.format("%H:%M")).orient("bottom");

    data.forEach(function(d) {
      try {
        var dt = _super.parseDate(d.date);
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
        lc.main_y[key] = d3.scale.sqrt().range([ lc.main_height, 0 ]);
      }
    }

    // /[ line definition ]///////////////////////////
    // I need to enumerate instead of above fancy way.
    if (metric != '*') {
      var type = 'cardinal';
      if (metric == 'state') {
        type = 'step';
      }
      lc.main_line[metric] = d3.svg.line().interpolate(type).x(function(d) {
        return lc.main_x(d.date);
      }).y(function(d) {
        return lc.main_y[metric](d[metric]);
      });
    } else {
      lc.main_line['nsl_ms'] = d3.svg.line().interpolate("cardinal").x(
          function(d) {
            return lc.main_x(d.date);
          }).y(function(d) {
        return lc.main_y['nsl_ms'](d['nsl_ms']);
      });
      lc.main_line['con_ms'] = d3.svg.line().interpolate("cardinal").x(
          function(d) {
            return lc.main_x(d.date);
          }).y(function(d) {
        return lc.main_y['con_ms'](d['con_ms']);
      });
      lc.main_line['tfb_ms'] = d3.svg.line().interpolate("cardinal").x(
          function(d) {
            return lc.main_x(d.date);
          }).y(function(d) {
        return lc.main_y['tfb_ms'](d['tfb_ms']);
      });
      lc.main_line['tot_ms'] = d3.svg.line().interpolate("cardinal").x(
          function(d) {
            return lc.main_x(d.date);
          }).y(function(d) {
        return lc.main_y['tot_ms'](d['tot_ms']);
      });
      lc.main_line['state'] = d3.svg.line().interpolate("step").x(function(d) {
        return lc.main_x(d.date);
      }).y(function(d) {
        return lc.main_y['state'](d['state']);
      });
      lc.main_line['aggregate'] = d3.svg.line().interpolate("cardinal").x(
          function(d) {
            return lc.main_x(d.date);
          }).y(function(d) {
        return lc.main_y['aggregate'](d['aggregate']);
      });
    }
    lc.main_line['judge'] = d3.svg.line().interpolate("step").x(function(d) {
      return lc.main_x(d.date);
    }).y(function(d) {
      return lc.main_y['judge'](d['judge']);
    });

    lc.main_x.domain([ data[0].date, data[data.length - 1].date ]);

    for ( var key in lc.main_y) {
      lc.main_y[key].domain(d3.extent(data, function(d) {
        return d[key];
      }));
    }

    // /[ main lineChart ]///////////////////////////
    for ( var key in lc.main_y) {
      lc.main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
          "class", "line line" + key).attr("d", lc.main_line[key]).attr(
          "data-legend", function(d) {
            return key;
          });
    }

    // /[ main left x ]///////////////////////////
    lc.main.append("g").attr("class", "x axis").attr("fill", "#585956").attr(
        "transform", "translate(0," + lc.main_height + ")").call(lc.main_xAxis);
    // /[ main left y ]///////////////////////////
    var main_yAxisLeft;
    if (metric != '*') {
      main_yAxisLeft = d3.svg.axis().scale(lc.main_y[metric]).orient("left");
    } else {
      main_yAxisLeft = d3.svg.axis().scale(
          lc.main_y[_super.config.lineChart.yAxis.left]).orient("left");
    }
    lc.main.append("g").attr("class", "y axis").attr("fill", "#585956").call(
        main_yAxisLeft).append("text").attr("transform", "rotate(-90)").attr(
        "y", 6).attr("dy", ".71em").style("text-anchor", "end").text("( ms )");

    // /[ main right y ]///////////////////////////
    var main_yAxisRight = d3.svg.axis().scale(
        lc.main_y[_super.config.lineChart.yAxis.right]).orient("right")
        .ticks(1);
    lc.main.append("g").attr("class", "y axis").attr("fill", "#585956").attr(
        "transform", "translate(" + lc.main_width + ", 0)").call(
        main_yAxisRight).append("text").attr("transform", "rotate(-90)").attr(
        "y", 6).attr("dy", ".71em").style("text-anchor", "end").text("( ms )");

    // /[ focus ]///////////////////////////
    var focus = lc.main.append("g").attr("class", "focus").style("display",
        "none");
    for ( var key in lc.main_y) {
      focus.append("line").attr("class", "y" + key).attr("x1",
          lc.main_width - 6).attr("x2", lc.main_width + 6);
      focus.append("circle").attr("class", "y" + key).attr("r", 4);
      focus.append("text").attr("class", "y" + key).attr("fill", "#585956")
          .attr("dy", "-1em");
    }

    var bisectDate = d3.bisector(function(d) {
      return d.date;
    }).left;
    var formatDate2 = d3.time.format("%H:%M:%S");

    var mousemove = function() {
      var metric = $('#' + _super.config.lineChart.combo.id).val();
      if (metric == '*')
        return;
      var x0 = lc.main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
      var d1 = data[i];
      if (d1.date) {
        var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        for ( var key in lc.main_y) {
          if (key != metric)
            continue;
          if (key != _super.config.lineChart.yAxis.right
              && '#FFFFFF' != _super.convertRGBDecimalToHex(d3.select(
                  ".line" + key).style("stroke"))) {
            focus.select("circle.y" + key).attr(
                "transform",
                "translate(" + lc.main_x(d.date) + "," + lc.main_y[key](d[key])
                    + ")");
            if (key == 'aggregate') {
              var descript = '[Availability] \n';
              var sum = 0;
              for (var i = 0; i < _super.metric_data.length; i++) {
                var type = _super.metric_data[i].target;
                var j = 0;
                for (j = 0; j < _super.metric_data[i].datapoints.length; j++) {
                  if (new Date(_super.metric_data[i].datapoints[j][1] * 1000)
                      .toString() == d.date.toString()) {
                    break;
                  }
                }
                if (j > 0) {
                  // availability = metric(#2) / (active(#1) + include(#3))
                  var active = _super.metric_data[i].description[j].v1;
                  var metric = _super.metric_data[i].description[j].v2;
                  var include = _super.metric_data[i].description[j].v3;
                  var avail = Math.floor((metric / (active + include)));
                  if (isNaN(avail) || avail == Number.POSITIVE_INFINITY) {
                    avail = 0;
                  }
                  sum += avail;
                  descript += ' - ' + _super.getLabelFullName(type) + ' : '
                      + avail + ' = ' + metric + ' / (' + active + ' + '
                      + include + ') \n';
                }
              }
              var uptime_per = sum / _super.aggregate_max * 100;
              if (uptime_per) {
                uptime_per = Number((uptime_per).toFixed(1));
              } else {
                uptime_per = 0;
              }
              descript += ' - availability sum: ' + sum + ' \n';
              descript += ' - availability max: ' + _super.aggregate_max
                  + ' \n';
              descript = '[' + _super.formatDate(d.date) + '`s Aggregation]: '
                  + uptime_per + '\n = ' + sum + ' / ' + _super.aggregate_max
                  + ' * 100 /d[key]: ' + d[key] + '\n' + descript;
              _super.tooltip2(descript);
            }
            var formatOutput = _super.getLabelFullName(key) + " - "
                + formatDate2(d.date) + " - " + d[key] + " ms";
            focus.select("text.y" + key).attr(
                "transform",
                "translate(" + lc.main_x(d.date) + "," + lc.main_y[key](d[key])
                    + ")").text(formatOutput);
            focus.select(".y" + key).attr(
                "transform",
                "translate(" + lc.main_width * -1 + ", "
                    + lc.main_y[key](d[key]) + ")").attr("x2",
                lc.main_width + lc.main_x(d.date));
          } else {
            focus.select("text.y" + key).attr(
                "transform",
                "translate(" + lc.main_x(d.date) + "," + lc.main_y[key](d[key])
                    + ")").text('');
          }
        }
        focus.select(".x").attr("transform",
            "translate(" + lc.main_x(d.date) + ",0)");
      }
    }

    lc.main.append("rect").attr("class", "overlay")
        .attr("width", lc.main_width).attr("height", lc.main_height).on(
            "mouseover", function() {
              focus.style("display", null);
              d3.select("body").select('div.tooltip2').remove();
            }).on("mouseout", function() {
          focus.style("display", "none");
          d3.select("body").select('div.tooltip2').remove();
        }).on("mousemove", mousemove);

    // /[ legend ]///////////////////////////
    var legend = lc.main.append("g").attr("class", "legend").attr("transform",
        "translate(40, " + _super.config.legend.y + ")").call(
        _super.makeLegend, lc.mainChartElem, metric);
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
  lc.lineSvg = d3.select(lc.mainChartElem).append("svg").attr("id", 'lineSvg')
      .attr(
          "width",
          lc.main_width + _super.config.lineChart.main_margin.left
              + _super.config.lineChart.main_margin.right).attr(
          "height",
          lc.main_height + _super.config.lineChart.main_margin.top
              + _super.config.lineChart.main_margin.bottom);
  lc.drawLineChart(_super.lineData, _super.config.lineChart.combo.init);

  _super.lc = lc;
  cb.call(null, _super.lineData);

  return lc;
}

UptimeChart.prototype.makeMiniLineChart = function(chartElem, resultset, cb) {
  var _super = this;

  var mc = {};
  mc.mini_y = {};
  mc.mini_line = {};
  mc.mini;

  mc.mini_height = config.lineChart.mini_margin.height
      - config.lineChart.mini_margin.top - config.lineChart.mini_margin.bottom;
  mc.mini_x = d3.time.scale().range([ 0, _super.lc.main_width ]);

  mc.miniChartElem = chartElem;
  _super.lineData = _super.makeChartData(resultset);

  var metrices = {};
  for ( var key in _super.lineData[0]) {
    if (key != _super.config.lineChart.yAxis.right) {
      metrices[key] = key;
    }
  }

  mc.lineChartInit = function() {
    _super.lc.main_y = {};
    _super.mc.mini_y = {};
    _super.lc.main_line = {};
    _super.mc.mini_line = {};
    _super.lc.main, _super.mc.mini;
  }

  mc.isBrushed = function() {
    if (_super.lc.main_x.domain().toString() != _super.mc.mini_x.domain()
        .toString()) {
      return true;
    } else {
      return false;
    }
  }

  mc.drawMiniLineChart = function(data, metric) {
    var chart_shape = 'monotone'; // linear, step, basis, bundle, cardinal,
    // monotone
    d3.select("[id='" + mc.miniChartElem + "']").remove();
    mc.MLSvg = d3.select(mc.miniChartElem).append("svg").attr("id",
        mc.miniChartElem).attr(
        "width",
        _super.lc.main_width + _super.config.lineChart.mini_margin.left
            + _super.config.lineChart.mini_margin.right).attr(
        "height",
        _super.config.lineChart.mini_margin.top
            + _super.config.lineChart.mini_margin.bottom + mc.mini_height)
        .attr("class", "miniSvg-component");
    ;

    mc.MLSvg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect").attr("width", _super.lc.main_width).attr("height",
            _super.mc.mini_height);

    mc.mini = mc.MLSvg.append("g").attr(
        "transform",
        "translate(" + _super.config.lineChart.mini_margin.left + ","
            + _super.config.lineChart.mini_margin.top + ")");

    var mini_xAxis = d3.svg.axis().scale(mc.mini_x).tickFormat(
        d3.time.format("%H:%M")).orient("bottom");

    var brush2 = function() {
      _super.lc.main_x.domain(_super.mc.brush.empty() ? _super.mc.mini_x
          .domain() : _super.mc.brush.extent());
      for ( var key in _super.lc.main_y) {
        _super.lc.main.select(".line" + key)
            .attr("d", _super.lc.main_line[key]);
      }
      _super.lc.main.select(".x.axis").call(_super.lc.main_xAxis);
    }

    var brushstart = function() {
    }

    var brushend = function() {
      _super.redrawChart();
    }

    mc.brush = d3.svg.brush().x(mc.mini_x).on("brush", brush2).on('brushstart',
        brushstart).on('brushend', brushend);

    data.forEach(function(d) {
      try {
        var dt = _super.parseDate(d.date);
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
        mc.mini_y[key] = d3.scale.sqrt().range([ mc.mini_height, 0 ]);
      }
    }

    // /[ line definition ]///////////////////////////
    if (metric == '*') {
      for ( var key in _super.lc.main_y) {
        if (_super.config.lineChart.yAxis.right != key) {
          mc.mini_line[key] = d3.svg.line().interpolate(chart_shape).x(
              function(d) {
                return _super.mc.mini_x(d.date);
              }).y(function(d) {
            return _super.mc.mini_y[key](d[key]);
          });
          // it doesn't work for brushing
          // _super.lc.main_line[key] =
          // d3.svg.line().interpolate(chart_shape).x(function(d) {
          // return _super.lc.main_x(d.date);
          // }).y(function(d) {
          // return _super.lc.main_y[key](d[key]);
          // });
        }
      }
    } else {
      var type = chart_shape;
      if (metric == 'state') {
        type = 'step';
      }
      mc.mini_line[metric] = d3.svg.line().interpolate(type).x(function(d) {
        return _super.mc.mini_x(d.date);
      }).y(function(d) {
        return _super.mc.mini_y[metric](d[metric]);
      });
    }
    mc.mini_line[_super.config.lineChart.yAxis.right] = d3.svg.line()
        .interpolate('step').x(function(d) {
          return _super.mc.mini_x(d.date);
        }).y(
            function(d) {
              return _super.mc.mini_y[_super.config.lineChart.yAxis.right]
                  (d[_super.config.lineChart.yAxis.right]);
            });

    mc.mini_x.domain(_super.lc.main_x.domain());

    for ( var key in _super.lc.main_y) {
      mc.mini_y[key].domain(_super.lc.main_y[key].domain());
    }

    // /[ mc.mini lineChart ]///////////////////////////
    mc.mini.append("g").attr("class", "x axis").attr("fill", "#585956").attr(
        "transform", "translate(0," + mc.mini_height + ")").call(
        _super.lc.main_xAxis);
    for ( var key in _super.lc.main_y) {
      mc.mini.append("path").datum(data).attr("class", "line area" + key).attr(
          "d", mc.mini_line[key]);
    }

    mc.mini.append("g").attr("class", "x brush").call(mc.brush).selectAll(
        "rect").attr("y", -6).attr("height", mc.mini_height + 7);
  }

  _super.mc = mc;

  mc.drawMiniLineChart(_super.lineData, _super.config.lineChart.combo.init);

  cb.call(null, _super.lineData);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeMap = function(mapElem, resultset, locs) {
  var _super = this;

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
      data2 = _super.mapData;
    } else {
      var metric = $('#' + _super.config.lineChart.combo.id).val();
      var data = _super.makeMapData(resultset, metric);
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    _super.lc.lineChartInit();
    _super.drawMap(data2, val);
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

  this.drawMap(this.mapData, _super.config.map.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw map ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawMap = function(data, loc) {
  var _super = this;
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
    _super.states.selectAll("path").data(data.features).enter().append("path")
        .attr("d", path).on(
            "mouseover",
            function(d) {
              d3.select(this).style("fill", "#6C0").append("title").text(
                  d.properties.name);
            }).on("mouseout", function(d) {
          d3.select(this).style("fill", "#ccc");
        })
  });

  this.circles.selectAll("circle").data(data).enter().append("g").append(
      "circle").style("stroke", "black").attr("cx", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[0];
  }).attr("cy", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("r", function(d) {
    return _super.getCircleSize(d);
  }).on(
      "mouseover",
      function(d, i) {
        d3.select(this).style("fill", "#FC0");
        var html = '<div style="width: 250px;">';
        html += '<div>* Site: ' + d["loc"];
        html += '</div>';
        html += '<div>* Total: ' + Math.round(_super.getCircleTotal(d))
            + ' (ms)</div>';
        html += '</div>';
        var div = d3.select("body").append("div")
            .attr('pointer-events', 'none').attr("class", "tooltip").style(
                "opacity", 1).html(html).style("left",
                (d3.event.x + _super.config.map.tooltip.x + "px")).style("top",
                (d3.event.y + _super.config.map.tooltip.y + "px"));
      }).on("mouseout", function(d) {
    d3.select(this).style("fill", _super.getCircleColor(d));
    d3.select("body").select('div.tooltip').remove();
  }).style("fill", function(d) {
    return _super.getCircleColor(d);
  });

  this.labels.selectAll("labels").data(data).enter().append("text").attr(
      "fill", "#585956").attr("x", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[0];
  }).attr("y", function(d, i) {
    return xy([ +d["longitude"], +d["latitude"] ])[1];
  }).attr("dy", "0.3em").attr("text-anchor", "middle").text(function(d, i) {
    return Math.round(_super.getCircleTotal(d));
  }).attr("d", path)
}

// ///////////////////////////////////////////////////////////////////////////////
// [ gmap chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeGMap = function(gmapElem, data) {
  var _super = this;
  this.gmapData = data;
  _super.gmapElem = gmapElem;

  var locs = {};
  for (var i = 0; i < data.length; i++) {
    locs[data[i].loc] = data[i].loc;
  }

  this.makeCombo(locs, this.config.gmap.combo.id, function(val) {
    if (val == '*') {
      data2 = _super.gmapData;
    } else {
      var data2 = new Array();
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    _super.lc.lineChartInit();
    _super.drawGMap(data2, val);
  });

  _super.drawGMap(data, _super.config.gmap.combo.init);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ draw gmap ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.drawGMap = function(data, loc) {
  var _super = this;

  var map = new google.maps.Map(d3.select(_super.gmapElem).node(), {
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
    d3.select("[id='" + _super.gmapElem + "']").remove();
    var layer = d3.select(this.getPanes().overlayLayer).append("div").attr(
        'id', _super.gmapElem).attr("class", "stations");

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
// [ make Histogram ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeHistogram = function(id, data) {
  var _super = this;

  var barColor = 'steelblue';
  function segColor(c) {
    return {
      nsl_ms : "#81bc00",
      con_ms : "#7e7f74",
      tfb_ms : "#ffa400"
    }[c];
  }

  _super.histogram = function(fD) {
    var hg = {};
    var width = _super.config.histogram.margin.width
        - _super.config.histogram.margin.left
        - _super.config.histogram.margin.right;
    var height = _super.config.histogram.margin.height;
    var ratio = _super.config.histogram.ratio;

    var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], 0.1).domain(
        fD.map(function(d) {
          return d[0];
        }));

    _super.hgsvg.append("g").attr("class", "x axis").attr("fill", "#585956")
        .attr("transform", "translate(0," + height + ")").call(
            d3.svg.axis().scale(x).tickFormat(d3.time.format("%H:%M")).orient(
                "bottom"));

    // _super.hgsvg.append("text").attr("x", 60).attr("y", 0 - (hgDim.top /
    // 2)).attr(
    // "text-anchor", "middle").style("text-decoration", "underline").text(
    // "Average Response Time");

    var y = d3.scale.linear().range([ height, 0 ]).domain(
        [ 0, d3.max(fD, function(d) {
          return d[1];
        }) ]);

    var bars = _super.hgsvg.selectAll(".bar").data(fD).enter().append("g")
        .attr("class", "bar");
    bars.append("rect").style("opacity", 0.4).attr("x", function(d) {
      return x(d[0]);
    }).attr("y", function(d) {
      return y(d[1] * ratio);
    }).attr("width", x.rangeBand()).attr("height", function(d) {
      return height - y(d[1] * ratio);
    }).attr('fill', barColor).style("cursor", "pointer").on("mouseover",
        mouseover).on("mouseout", mouseout);

    bars.append("text").attr("fill", "#585956").text(function(d) {
      return d3.format(",")(d[1])
    }).attr("x", function(d) {
      return x(d[0]) + x.rangeBand() / 2;
    }).attr("y", function(d) {
      return y(d[1] * ratio) + 15;
    }).attr("text-anchor", "middle").style('fill', 'white');

    function mouseover(d) {
      var st = _super.fData.filter(function(s) {
        return s.date == d[0];
      })[0];
      var nd = d3.keys(st).map(function(s) {
        return {
          metric : s,
          freq : st[s]
        };
      });
      nd = nd.slice(1, nd.length - 1); // remove date & tot_ms
      _super.pc.update(nd);
      _super.lg.update(nd);
    }

    function mouseout(d) {
      _super.pc.update(_super.tf);
      _super.lg.update(_super.tf);
    }

    hg.update = function(nd, color) {
      y.domain([ 0, d3.max(nd, function(d) {
        return d[1];
      }) ]);

      var bars = _super.hgsvg.selectAll(".bar").data(nd);
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
  _super.pieChart = function(pD) {
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
      _super.hg.update(_super.fData.map(function(v) {
        return [ v.date, v[d.data.metric] ];
      }), segColor(d.data.metric));
    }
    function mouseout(d) {
      _super.hg.update(_super.fData.map(function(v) {
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

  _super.legend2 = function(lD) {
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
      return _super.getLabelFullName(d.metric) + ":";
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

  if (data) {
    _super.drawHistogram(data);
  } else {
    _super.drawHistogram(_super.makeHistogramData(_super.lineData));
  }
}

UptimeChart.prototype.drawHistogram = function(data) {
  var _super = this;
  d3.select("[id='piesvg']").remove();
  d3.select("[id='tr']").remove();
  d3.selectAll("span").remove();

  _super.fData = data;
  _super.fData.forEach(function(d) {
    d.tot_ms = d.nsl_ms + d.con_ms + d.tfb_ms;
  });

  _super.tf = [ 'nsl_ms', 'con_ms', 'tfb_ms' ].map(function(d) {
    return {
      metric : d,
      freq : d3.sum(_super.fData.map(function(t) {
        return t[d];
      }))
    };
  });
  var sf = _super.fData.map(function(d) {
    return [ d.date, d.tot_ms ];
  });
  _super.hg = _super.histogram(sf);
  _super.pc = _super.pieChart(_super.tf);
  _super.lg = _super.legend2(_super.tf);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make StackedChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.stackedChart = function(id, data, cb) {
  var _super = this;

  var sc = {};
  sc.stackedChartElem = id;

  sc.drawStackedChart = function(data, cb) {
    var width = config.stackedChart.margin.width
        - config.stackedChart.margin.left - config.stackedChart.margin.right
    var height = config.stackedChart.margin.height
        - config.stackedChart.margin.top - config.stackedChart.margin.bottom;

    var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], .1);
    var y = d3.scale.linear().rangeRound([ height, 0 ]);

    // var xAxis = d3.svg.axis().scale(x).tickFormat(d3.time.format("%H:%M"))
    // .orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left").tickFormat(
        d3.format(".2s"));

    d3.select("[id='" + this.stackedChartElem + "']").remove();
    sc.stSvg = d3.select(this.stackedChartElem).append("svg").attr("id",
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

    sc.stackedColor = d3.scale.ordinal().range(
        [ "#81bc00", "#7e7f74", "#ffa400" ]);

    sc.stackedColor.domain(d3.keys(data[0]).filter(function(key) {
      return key !== "date";
    }));
    data.forEach(function(d) {
      var y0 = 0;
      d.metrics = sc.stackedColor.domain().map(function(key) {
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

    // sc.stSvg.append("g").attr("class", "x axis").attr("fill",
    // "#585956").attr("transform",
    // "translate(0," + height + ")").call(xAxis);

    sc.stSvg.append("g").attr("class", "y axis").attr("fill", "#585956").call(
        yAxis).append("text").attr("transform", "rotate(-90)").attr("y", 6)
        .attr("dy", ".71em").style("text-anchor", "end").text("(ms)");

    var date = sc.stSvg.selectAll(".date").data(data).enter().append("g").attr(
        "class", "g").attr("transform", function(d) {
      return "translate(" + x(d.date) + ",0)";
    });

    date.selectAll("rect").data(function(d) {
      return d.metrics;
    }).enter().append("rect").attr("width", x.rangeBand()).attr("y",
        function(d) {
          return y(d.y1);
        }).attr("data-legend", function(d) {
      return d.key;
    }).attr("height", function(d) {
      return y(d.y0) - y(d.y1);
    }).style("fill", function(d) {
      return sc.stackedColor(d.key);
    });

    _super.hgsvg = sc.stSvg;
    cb.call(null);
    return sc;
  }

  sc.makeStackedData = function(json) {
    var data = new Array();

    if (_super.mc.isBrushed()) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _super.mc.brush.extent()[0]
            && json[i].date <= _super.mc.brush.extent()[1]) {
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
      if (_super.metric) {
        tmp[_super.metric] = d[_super.metric];
      } else {
        tmp.nsl_ms = d.nsl_ms;
        tmp.con_ms = d.con_ms;
        tmp.tfb_ms = d.tfb_ms;
      }
      input.push(tmp);
    });

    input.forEach(function(d) {
      d.date = +d.date;
      if (_super.metric) {
        d[_super.metric] = +d[_super.metric];
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
      if (_super.metric) {
        tmp[_super.metric] = d[_super.metric];
      } else {
        tmp.nsl_ms = d.nsl_ms;
        tmp.con_ms = d.con_ms;
        tmp.tfb_ms = d.tfb_ms;
      }
      data.push(tmp);
    });
    return data;
  }

  sc.drawStackedChart(sc.makeStackedData(data), function() {
    cb.call();
    // /[ legend ]///////////////////////////
    var legend = sc.stSvg.append("g").attr("class", "legend").attr("transform",
        "translate(40, " + _super.config.legend.y + ")").call(
        _super.makeLegend, sc.stackedChartElem, "*");
  });

  _super.sc = sc;
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make Gauge ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.makeGauge = function(id) {
  var _super = this;

  var gauge = {};
  var defaultConfig = {
    size : 200,
    clipWidth : 200,
    clipHeight : 110,
    ringInset : 20,
    ringWidth : 20,

    pointerWidth : 10,
    pointerTailLength : 5,
    pointerHeadLengthPercent : 0.9,

    minValue : 0,
    maxValue : 10,

    minAngle : -90,
    maxAngle : 90,

    transitionMs : 750,

    majorTicks : 5,
    labelFormat : d3.format(',g'),
    labelInset : 10,

    arcColorFn : d3.interpolateHsl(d3.rgb('#e8e2ca'), d3.rgb('#3e6c0a'))
  };

  var range;
  var r;
  var pointerHeadLength;
  var value = 0;

  var svg;
  var arc;
  var scale;
  var ticks;
  var tickData;
  var pointer;

  var donut = d3.layout.pie();

  function deg2rad(deg) {
    return deg * Math.PI / 180;
  }

  function newAngle(d) {
    var ratio = scale(d);
    var newAngle = defaultConfig.minAngle + (ratio * range);
    return newAngle;
  }

  gauge.configure = function(config) {
    var prop;
    for (prop in config) {
      defaultConfig[prop] = config[prop];
    }

    range = defaultConfig.maxAngle - defaultConfig.minAngle;
    r = defaultConfig.size / 2;
    pointerHeadLength = Math.round(r * defaultConfig.pointerHeadLengthPercent);

    scale = d3.scale.linear().range([ 0, 1 ]).domain(
        [ defaultConfig.minValue, defaultConfig.maxValue ]);

    ticks = scale.ticks(defaultConfig.majorTicks);
    tickData = d3.range(defaultConfig.majorTicks).map(function() {
      return 1 / defaultConfig.majorTicks;
    });

    arc = d3.svg.arc().innerRadius(
        r - defaultConfig.ringWidth - defaultConfig.ringInset).outerRadius(
        r - defaultConfig.ringInset).startAngle(function(d, i) {
      var ratio = d * i;
      return deg2rad(defaultConfig.minAngle + (ratio * range));
    }).endAngle(function(d, i) {
      var ratio = d * (i + 1);
      return deg2rad(defaultConfig.minAngle + (ratio * range));
    });
  };

  function centerTranslation() {
    return 'translate(' + r + ',' + r + ')';
  }

  gauge.isRendered = function() {
    return (svg !== undefined);
  };

  gauge.render = function(newValue) {
    svg = d3.select(id).append('svg:svg').attr('class', 'gauge').attr('width',
        defaultConfig.clipWidth).attr('height', defaultConfig.clipHeight);

    var centerTx = centerTranslation();

    var arcs = svg.append('g').attr('class', 'arc').attr('transform', centerTx);

    arcs.selectAll('path').data(tickData).enter().append('path').attr('fill',
        function(d, i) {
          return defaultConfig.arcColorFn(d * i);
        }).attr('d', arc);

    var lg = svg.append('g').attr('class', 'label').attr('transform', centerTx);
    lg.selectAll('text').data(ticks).enter().append('text').attr(
        'transform',
        function(d) {
          var ratio = scale(d);
          var newAngle = defaultConfig.minAngle + (ratio * range);
          return 'rotate(' + newAngle + ') translate(0,'
              + (defaultConfig.labelInset - r) + ')';
        }).text(defaultConfig.labelFormat);

    var lineData = [ [ defaultConfig.pointerWidth / 2, 0 ],
        [ 0, -pointerHeadLength ], [ -(defaultConfig.pointerWidth / 2), 0 ],
        [ 0, defaultConfig.pointerTailLength ],
        [ defaultConfig.pointerWidth / 2, 0 ] ];
    var pointerLine = d3.svg.line().interpolate('step');
    var pg = svg.append('g').data([ lineData ]).attr('class', 'pointer').attr(
        'transform', centerTx);

    pointer = pg
        .append('path')
        .attr('d', pointerLine/* function(d) { return pointerLine(d) +'Z';} */)
        .attr('transform', 'rotate(' + defaultConfig.minAngle + ')');

    gauge.update(newValue === undefined ? 0 : newValue);
  };

  gauge.update = function(newValue, newConfiguration) {
    if (newConfiguration !== undefined) {
      configure(newConfiguration);
    }
    var ratio = scale(newValue);
    var newAngle = defaultConfig.minAngle + (ratio * range);
    pointer.transition().duration(defaultConfig.transitionMs).ease('elastic')
        .attr('transform', 'rotate(' + newAngle + ')');
  };

  gauge.configure(_super.config.gauge);
  return gauge;
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
      "right" : 0,
      "left" : 0
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
  "gauge" : {
    "size" : 150,
    "clipWidth" : 150,
    "clipHeight" : 150,
    "ringWidth" : 60,
    "maxValue" : 10,
    "transitionMs" : 4000
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
    uptimeChart.lineChart("#lineChart", json, function(data) {
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
        uptimeChart.stackedChart('#stackedChart', data, function() {
          uptimeChart.makeHistogram('#histogram');
        });

        var gauge = uptimeChart.makeGauge('#gauge');
        gauge.render();
        gauge.update(Math.random() * 10);

        setInterval(function() {
          gauge.update(Math.random() * 10);
        }, 5 * 1000);

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
